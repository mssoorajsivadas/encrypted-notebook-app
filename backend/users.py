import os

from sqlalchemy import select

from models import User, Note
from crypto import (
    derive_key,
    encrypt_data,
    decrypt_data,
)


GUEST_USERNAME = "guest"
GUEST_PASSWORD = "guest"


def create_guest(session):
    """Create the guest account if it doesn't already exist."""

    guest = session.scalar(
        select(User).where(
            User.username == GUEST_USERNAME
        )
    )

    if guest:
        return guest

    salt = os.urandom(16)

    key = derive_key(
        GUEST_PASSWORD,
        salt
    )

    verification_message = (
        b"ENCRYPTED_NOTEBOOK_GUEST_VERIFICATION"
    )

    verification_nonce, verification_data = encrypt_data(
        key,
        verification_message
    )

    guest = User(
        username=GUEST_USERNAME,
        salt=salt,
        verification_nonce=verification_nonce,
        verification_data=verification_data,
    )

    session.add(guest)
    session.commit()

    return guest


def open_guest(session):
    """Open the public guest notebook."""

    guest = session.scalar(
        select(User).where(
            User.username == GUEST_USERNAME
        )
    )

    if not guest:
        guest = create_guest(session)

    key = derive_key(
        GUEST_PASSWORD,
        guest.salt
    )

    try:
        decrypt_data(
            key,
            guest.verification_nonce,
            guest.verification_data
        )

    except ValueError:
        raise RuntimeError(
            "Guest account verification failed."
        )

    return guest, key


def create_private_user(
    session,
    username,
    password
):
    """Create a private notebook user."""

    username = username.strip()

    if not username:
        raise ValueError(
            "Username cannot be empty."
        )

    if not password:
        raise ValueError(
            "Password cannot be empty."
        )

    existing_user = session.scalar(
        select(User).where(
            User.username == username
        )
    )

    if existing_user:
        raise ValueError(
            "Username already exists."
        )

    salt = os.urandom(16)

    key = derive_key(
        password,
        salt
    )

    verification_message = (
        b"ENCRYPTED_NOTEBOOK_USER_VERIFICATION"
    )

    verification_nonce, verification_data = encrypt_data(
        key,
        verification_message
    )

    user = User(
        username=username,
        salt=salt,
        verification_nonce=verification_nonce,
        verification_data=verification_data,
    )

    session.add(user)
    session.commit()

    return user


def login_private_user(
    session,
    username,
    password
):
    """Unlock a private notebook."""

    username = username.strip()

    user = session.scalar(
        select(User).where(
            User.username == username
        )
    )

    if not user:
        raise ValueError(
            "Invalid username or password."
        )

    key = derive_key(
        password,
        user.salt
    )

    try:
        decrypt_data(
            key,
            user.verification_nonce,
            user.verification_data
        )

    except ValueError:
        raise ValueError(
            "Invalid username or password."
        )

    return user, key


def change_password(session, user, old_password, new_password):

    if not new_password:
        raise ValueError("New password cannot be empty.")

    if old_password == new_password:
        raise ValueError( "New password must be different from the old password.")

    try:
        # 1. Derive the key from the old password
        old_key = derive_key(
            old_password,
            user.salt
        )

        # 2. Verify the old password
        decrypt_data(
            old_key,
            user.verification_nonce,
            user.verification_data
        )

        # 3. Get all user's notes
        notes = session.scalars(
            select(Note).where(
                Note.user_id == user.id
            )
        ).all()

        # 4. Create a new salt and encryption key
        new_salt = os.urandom(16)

        new_key = derive_key(
            new_password,
            new_salt
        )

        # 5. Re-encrypt every note
        for note in notes:
            plaintext = decrypt_data(
                old_key,
                note.nonce,
                note.encrypted_data
            )

            new_nonce, new_encrypted_data = encrypt_data(
                new_key,
                plaintext
            )

            note.nonce = new_nonce
            note.encrypted_data = new_encrypted_data

        # 6. Create new verification data
        verification_message = (
            b"ENCRYPTED_NOTEBOOK_USER_VERIFICATION"
        )

        verification_nonce, verification_data = encrypt_data(
            new_key,
            verification_message
        )

        # 7. Update the user's encryption information
        user.salt = new_salt
        user.verification_nonce = verification_nonce
        user.verification_data = verification_data

        # 8. Save everything together
        session.commit()

        return new_key

    except ValueError:
        session.rollback()
        raise

    except Exception:
        session.rollback()
        raise


def delete_account(session, user):
    notes = session.scalars(
        select(Note).where(
            Note.user_id == user.id
        )
    ).all()

    for note in notes:
        session.delete(note)

    session.delete(user)

    try:
        session.commit()
    except Exception:
        session.rollback()
        raise