from flask import Flask, jsonify, request
from flask_cors import CORS
from database import engine, SessionLocal, Base

from users import (
    create_guest,
    open_guest,
    create_private_user,
    login_private_user,
    change_password,
    delete_account
)

from notes import (
    create_note,
    list_notes,
    get_note,
    edit_note,
    delete_note,
)

from auth import (
    create_session,
    get_session,
    delete_session,
)

from models import User

from crypto import derive_key, decrypt_data

app = Flask(__name__)

CORS(app)

# Create database tables if they don't exist
Base.metadata.create_all(engine)


def get_db():
    return SessionLocal()


def get_auth_session():
    """
    Get the current logged-in session from the Authorization header.
    """

    authorization = request.headers.get("Authorization")

    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        return None

    session_id = authorization[7:]

    if not session_id:
        return None

    return get_session(session_id)


# --------------------------------------------------
# Guest
# --------------------------------------------------

@app.post("/api/guest/open")
def open_guest_session():

    session = get_db()

    try:
        user, key = open_guest(session)

        session_id = create_session(
            user,
            key
        )

        return jsonify({
            "message": "Guest notebook opened.",
            "username": user.username,
            "session_id": session_id
        })

    finally:
        session.close()


# --------------------------------------------------
# Users
# --------------------------------------------------

@app.post("/api/users")
def create_user():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "JSON body required."
        }), 400

    username = data.get("username")
    password = data.get("password")

    session = get_db()

    try:
        user = create_private_user(
            session,
            username,
            password
        )

        return jsonify({
            "message": "User created.",
            "username": user.username
        }), 201

    except ValueError as error:

        return jsonify({
            "error": str(error)
        }), 400

    finally:
        session.close()


# --------------------------------------------------
# Login
# --------------------------------------------------

@app.post("/api/login")
def login():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "JSON body required."
        }), 400

    username = data.get("username")
    password = data.get("password")

    session = get_db()

    try:
        user, key = login_private_user(
            session,
            username,
            password
        )

        # Create temporary server-side session
        session_id = create_session(
            user,
            key
        )

        return jsonify({
            "message": "Login successful.",
            "username": user.username,
            "session_id": session_id
        })

    except ValueError as error:

        return jsonify({
            "error": str(error)
        }), 401

    finally:
        session.close()


# --------------------------------------------------
# Logout
# --------------------------------------------------

@app.post("/api/logout")
def logout():

    authorization = request.headers.get("Authorization")

    if not authorization:
        return jsonify({
            "error": "Not authenticated."
        }), 401

    if not authorization.startswith("Bearer "):
        return jsonify({
            "error": "Invalid authorization header."
        }), 401

    session_id = authorization[7:]

    if not get_session(session_id):
        return jsonify({
            "error": "Invalid session."
        }), 401

    delete_session(session_id)

    return jsonify({
        "message": "Logged out."
    })


# --------------------------------------------------
# Notes
# --------------------------------------------------

@app.get("/api/notes")
def get_notes():

    auth_session = get_auth_session()

    if not auth_session:
        return jsonify({
            "error": "Authentication required."
        }), 401

    user_id = auth_session["user_id"]
    key = auth_session["key"]

    session = get_db()

    try:
        # Get the actual User object
        from models import User

        user = session.get(
            User,
            user_id
        )

        if not user:
            return jsonify({
                "error": "User not found."
            }), 404

        notes = list_notes(
            session,
            user,
            key
        )

        return jsonify({
            "notes": [
                {
                    "id": note["id"],
                    "title": note["title"],
                    "content": note["content"],
                    "created_at": note["created_at"],
                    "updated_at": note["updated_at"],
                }
                for note in notes
            ]
        })

    finally:
        session.close()


@app.post("/api/notes")
def create_new_note():

    auth_session = get_auth_session()

    if not auth_session:
        return jsonify({
            "error": "Authentication required."
        }), 401

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "JSON body required."
        }), 400

    title = data.get("title")
    content = data.get("content")

    if title is None or content is None:
        return jsonify({
            "error": "Title and content are required."
        }), 400

    user_id = auth_session["user_id"]
    key = auth_session["key"]

    session = get_db()

    try:
        from models import User

        user = session.get(
            User,
            user_id
        )

        if not user:
            return jsonify({
                "error": "User not found."
            }), 404

        note = create_note(
            session,
            user,
            key,
            title,
            content
        )

        return jsonify({
            "message": "Note created.",
            "id": note.id
        }), 201

    except ValueError as error:

        return jsonify({
            "error": str(error)
        }), 400

    finally:
        session.close()


@app.get("/api/notes/<int:note_id>")
def get_single_note(note_id):

    auth_session = get_auth_session()

    if not auth_session:
        return jsonify({
            "error": "Authentication required."
        }), 401

    user_id = auth_session["user_id"]
    key = auth_session["key"]

    session = get_db()

    try:
        from models import User

        user = session.get(
            User,
            user_id
        )

        if not user:
            return jsonify({
                "error": "User not found."
            }), 404

        try:
            note, note_data = get_note(
                session,
                user,
                key,
                note_id
            )

        except ValueError as error:
            return jsonify({
                "error": str(error)
            }), 404

        return jsonify({
            "id": note.id,
            "title": note_data["title"],
            "content": note_data["content"],
            "created_at": note.created_at,
            "updated_at": note.updated_at,
        })

    finally:
        session.close()


@app.put("/api/notes/<int:note_id>")
def update_note(note_id):

    auth_session = get_auth_session()

    if not auth_session:
        return jsonify({
            "error": "Authentication required."
        }), 401

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "JSON body required."
        }), 400

    title = data.get("title")
    content = data.get("content")

    if title is None or content is None:
        return jsonify({
            "error": "Title and content are required."
        }), 400

    user_id = auth_session["user_id"]
    key = auth_session["key"]

    session = get_db()

    try:
        from models import User

        user = session.get(
            User,
            user_id
        )

        if not user:
            return jsonify({
                "error": "User not found."
            }), 404

        try:
            note = edit_note(
                session,
                user,
                key,
                note_id,
                title,
                content
            )

        except ValueError as error:
            return jsonify({
                "error": str(error)
            }), 404

        return jsonify({
            "message": "Note updated.",
            "id": note.id
        })

    finally:
        session.close()


@app.delete("/api/notes/<int:note_id>")
def remove_note(note_id):

    auth_session = get_auth_session()

    if not auth_session:
        return jsonify({
            "error": "Authentication required."
        }), 401

    user_id = auth_session["user_id"]

    session = get_db()

    try:
        from models import User

        user = session.get(
            User,
            user_id
        )

        if not user:
            return jsonify({
                "error": "User not found."
            }), 404

        try:
            delete_note(
                session,
                user,
                note_id
            )

        except ValueError as error:
            return jsonify({
                "error": str(error)
            }), 404

        return jsonify({
            "message": "Note deleted."
        })

    finally:
        session.close()

# --------------------------------------------------
# Change password
# --------------------------------------------------
@app.post("/api/change-password")
def change_password_route():
    auth = get_auth_session()

    if not auth:
        return jsonify({"error": "Unauthorized"}), 401

    session = SessionLocal()

    try:
        user = session.get(User, auth["user_id"])

        data = request.get_json()

        old_password = data.get("old_password", "")
        new_password = data.get("new_password", "")

        new_key = change_password(
            session,
            user,
            old_password,
            new_password
        )

        auth["key"] = new_key

        return jsonify({
            "message": "Password changed successfully."
        })

    except ValueError as error:
        return jsonify({
            "error": str(error)
        }), 400

    finally:
        session.close()

# --------------------------------------------------
# Account delete
# --------------------------------------------------
@app.post("/api/delete-account")
def delete_account_route():
    auth = get_auth_session()

    if not auth:
        return jsonify({
            "error": "Unauthorized"
        }), 401

    session = SessionLocal()

    try:
        user = session.get(
            User,
            auth["user_id"]
        )

        if not user:
            return jsonify({
                "error": "User not found."
            }), 404

        data = request.get_json()

        password = data.get("password", "")

        # Verify password before deletion
        key = derive_key(
            password,
            user.salt
        )

        decrypt_data(
            key,
            user.verification_nonce,
            user.verification_data
        )

        delete_account(
            session,
            user
        )

        # Remove authentication session
        session_id = request.headers.get(
            "Authorization",
            ""
        ).replace("Bearer ", "", 1)

        delete_session(session_id)

        return jsonify({
            "message": "Account deleted successfully."
        })

    except ValueError:
        session.rollback()

        return jsonify({
            "error": "Incorrect password."
        }), 400

    except Exception:
        session.rollback()

        return jsonify({
            "error": "Failed to delete account."
        }), 500

    finally:
        session.close()

    
# --------------------------------------------------
# Start Flask
# --------------------------------------------------

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )