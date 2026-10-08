from sqlalchemy import select

from models import Note
from crypto import encrypt_note, decrypt_note


def create_note(session, user, key, title, content):
    title = title.strip()

    if not title:
        raise ValueError("Title cannot be empty.")

    nonce, encrypted_data = encrypt_note(
        key,
        title,
        content
    )

    note = Note(
        user_id=user.id,
        nonce=nonce,
        encrypted_data=encrypted_data
    )

    session.add(note)
    session.commit()

    return note


def list_notes(session, user, key):
    notes = session.scalars(
        select(Note)
        .where(Note.user_id == user.id)
        .order_by(Note.updated_at.desc())
    ).all()

    result = []

    for note in notes:
        note_data = decrypt_note(
            key,
            note.nonce,
            note.encrypted_data
        )

        result.append({
            "id": note.id,
            "title": note_data["title"],
            "content": note_data["content"],
            "created_at": note.created_at,
            "updated_at": note.updated_at,
        })

    return result


def get_note(session, user, key, note_id):
    note = session.scalar(
        select(Note)
        .where(
            Note.id == note_id,
            Note.user_id == user.id
        )
    )

    if not note:
        raise ValueError("Note not found.")

    note_data = decrypt_note(
        key,
        note.nonce,
        note.encrypted_data
    )

    return note, note_data


def edit_note(
    session,
    user,
    key,
    note_id,
    title,
    content
):
    note, old_data = get_note(
        session,
        user,
        key,
        note_id
    )

    title = title.strip()

    if not title:
        raise ValueError("Title cannot be empty.")

    nonce, encrypted_data = encrypt_note(
        key,
        title,
        content
    )

    note.nonce = nonce
    note.encrypted_data = encrypted_data

    session.commit()

    return note


def delete_note(
    session,
    user,
    note_id
):
    note = session.scalar(
        select(Note)
        .where(
            Note.id == note_id,
            Note.user_id == user.id
        )
    )

    if not note:
        raise ValueError("Note not found.")

    session.delete(note)
    session.commit()