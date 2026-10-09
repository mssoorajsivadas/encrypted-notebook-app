# Encrypted Notebook

A local encrypted notebook application built with Python, Flask,
SQLAlchemy, SQLite, HTML, CSS, JavaScript, and Electron.

This project is a hands-on learning project focused on authentication,
authorization, password-based encryption, secure storage, and desktop
application development.

## Features

### Notes
- Create notes
- View notes
- Edit notes
- Delete notes
- Guest notebook

### User Accounts
- User registration
- Login and logout
- Password change
- Account deletion
- Private user accounts
- User-specific note authorization

### Security
- AES-256-GCM authenticated encryption
- Scrypt password-based key derivation
- Random per-user salts
- Random per-note nonces
- Server-side session management

### Desktop Application
- Electron desktop interface
- Python Flask backend
- Automatic available-port selection
- Localhost-only backend binding
- Automatic backend startup and shutdown

## Technologies

- Python
- Flask
- Flask-CORS
- SQLAlchemy
- SQLite
- HTML
- CSS
- JavaScript
- Electron
- Node.js

## Architecture

```text
Electron Desktop Application
            |
            v
    HTML / CSS / JavaScript
            |
            | HTTP requests
            v
       Flask API
            |
            v
       SQLAlchemy
            |
            v
          SQLite
```

## Project Structure

```text
encrypted-notebook/
├── backend/
│   ├── app.py
│   ├── auth.py
│   ├── crypto.py
│   ├── database.py
│   ├── models.py
│   ├── notes.py
│   └── users.py
├── electron/
│   ├── main.js
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── requirements.txt
├── README.md
└── .gitignore
```

## Requirements

- Python 3.10 or newer
- Node.js and npm
- Linux, macOS, or Windows may be supported with the appropriate
  platform-specific setup

## Installation

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd encrypted-notebook
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL.

### 2. Set up the Python environment

From the project root:

```bash
python3 -m venv backend/venv
```

Activate it:

```bash
source backend/venv/bin/activate
```

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

### 3. Install Electron dependencies

```bash
cd electron
npm install
```

### 4. Run the desktop application

On Linux, run:

```bash
npm start
```

If your Linux environment requires the development sandbox workaround
used during this project's development, you may need:

```bash
ELECTRON_DISABLE_SANDBOX=1 npm start
```

Disabling Electron's sandbox is a development workaround, not a
recommended production configuration.

## Data Storage

The application uses SQLite for persistent data storage.

The database is created or initialized by the backend according to
the application's database configuration.

Do not delete your database if you want to preserve existing notes.

Database files containing private user data should not be committed
to the public repository.

## Security Notes

This project is intended for learning and development.

Although it implements authenticated encryption and user authentication,
it should not yet be considered production-ready.

Before distributing it, further security review and testing are needed,
including backend authentication, key management, local API protection,
session handling, and Electron security configuration.

Never commit passwords, encryption keys, session tokens, or private
database files to GitHub.

## Project Status

Actively developed as a hands-on learning project.

Features, architecture, and security controls may change as development
continues.
