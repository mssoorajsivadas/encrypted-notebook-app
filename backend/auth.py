import secrets


_sessions = {}


def create_session(user, key):
    session_id = secrets.token_urlsafe(32)

    _sessions[session_id] = {
        "user_id": user.id,
        "key": key,
    }

    return session_id


def get_session(session_id):
    return _sessions.get(session_id)


def delete_session(session_id):
    _sessions.pop(session_id, None)