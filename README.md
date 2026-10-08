# Encrypted Notebook

A local encrypted notebook application built with Python, Flask,
SQLAlchemy, SQLite, HTML, CSS, and JavaScript.

The project was built as a hands-on learning project focused on
authentication, authorization, password-based encryption, and
secure storage of notes.

## Features

- Guest notebook
- Private user accounts
- User registration
- Login and logout
- Create notes
- View notes
- Edit notes
- Delete notes
- Password change
- Account deletion
- User-specific note authorization
- AES-256-GCM encryption
- Scrypt password-based key derivation
- Random per-user salts
- Random per-note nonces
- Server-side session management

## Architecture

```text
HTML / CSS / JavaScript
          |
          | HTTP
          v
       Flask API
          |
          v
      SQLAlchemy
          |
          v
        SQLite