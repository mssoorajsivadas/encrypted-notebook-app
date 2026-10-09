const API_URL = new URLSearchParams(
    window.location.search
).get("apiUrl");

if (!API_URL) {
    throw new Error("The backend API address was not provided.");
}

let sessionId = null;
let username = null;
let editingNoteId = null;


/* =========================
   Guest User
   ========================= */

const usernameElement = document.getElementById("username");

async function setSession(data) {
    sessionId = data.session_id;
    username = data.username;

    localStorage.setItem(
        "session_id",
        sessionId
    );

    localStorage.setItem(
        "username",
        username
    );

    usernameElement.textContent = username;

    updateAccountUI();

    await loadNotes();
}

async function restoreSession() {

    const savedSessionId =
        localStorage.getItem("session_id");

    if (!savedSessionId) {
        await openGuest();
        return;
    }

    sessionId = savedSessionId;

    const response = await fetch(
        `${API_URL}/api/notes`,
        {
            headers: {
                "Authorization":
                    `Bearer ${sessionId}`
            }
        }
    );

    const data =
        await response.json();

    if (!response.ok) {

        // Session is no longer valid
        localStorage.removeItem("session_id");
        localStorage.removeItem("username");

        sessionId = null;
        username = null;

        await openGuest();

        return;
    }

    username =
        localStorage.getItem("username");

    usernameElement.textContent =
        username;

    updateAccountUI();
    renderNotes(data.notes);
}

async function openGuest() {

    const response = await fetch(
        `${API_URL}/api/guest/open`,
        {
            method: "POST"
        }
    );

    const data = await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    await setSession(data);
}


/* =========================
   Notes carde
   ========================= */

const notesGrid = document.getElementById("notes-grid");

async function loadNotes() {

    const response = await fetch(
        `${API_URL}/api/notes`,
        {
            headers: {
                "Authorization":
                    `Bearer ${sessionId}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    renderNotes(data.notes);
}

function renderNotes(notes) {
    notesGrid.innerHTML = "";

    for (const note of notes) {

        const card = document.createElement("div");
        card.className = "note-card";

        // Title
        const title = document.createElement("h3");
        title.className = "note-title";
        title.textContent = note.title;

        // Content preview
        const preview = document.createElement("p");
        preview.className = "note-preview";
        preview.textContent = note.content;

        // Footer
        const footer = document.createElement("div");
        footer.className = "note-footer";

        // Actions
        const actions = document.createElement("div");
        actions.className = "note-actions";



        const deleteButton = document.createElement("button");
        deleteButton.className = "note-action";
        deleteButton.title = "Delete note";

        deleteButton.innerHTML = `
            <span class="material-symbols-rounded">
                delete
            </span>
        `;

        const editButton = document.createElement("button");
        editButton.className = "note-action";
        editButton.title = "Edit note";

        editButton.innerHTML = `
            <span class="material-symbols-rounded">
                edit
            </span>
        `;


        // Dates
        const dates = document.createElement("div");
        dates.className = "note-dates";

        const created = document.createElement("span");
        created.textContent =
            `Created ${formatDate(note.created_at)}`;

        const separator = document.createElement("span");
        separator.textContent = "·";

        const updated = document.createElement("span");
        updated.textContent =
            `Updated ${formatDate(note.updated_at)}`;

        dates.appendChild(created);
        dates.appendChild(separator);
        dates.appendChild(updated);

        // Edit
        editButton.addEventListener(
            "click",
            (event) => {
                event.stopPropagation();
                openNote(note.id);
            }
        );

        // Delete
        deleteButton.addEventListener(
            "click",
            (event) => {
                event.stopPropagation();
                deleteNote(note.id);
            }
        );


        actions.appendChild(deleteButton);
        actions.appendChild(editButton);

        footer.appendChild(actions);
        footer.appendChild(dates);

        card.appendChild(title);
        card.appendChild(preview);
        card.appendChild(footer);

        // Clicking the card opens the note
        card.addEventListener(
            "click",
            () => openNote(note.id)
        );

        notesGrid.appendChild(card);
    }
}


function formatDate(dateString) {

    const date =
        new Date(dateString);

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}



/* =========================
   Create Notes 
   ========================= */


const createNoteModal = document.getElementById("create-note-modal");

const closeNoteModal = document.getElementById("close-note-modal");

const newNoteTitle = document.getElementById("new-note-title");

const newNoteContent = document.getElementById("new-note-content");

const newNoteButton = document.getElementById("new-note-button");

const noteModalTitle = document.getElementById("note-modal-title");

const noteModalSave = document.getElementById("note-modal-save");

const noteModalEdit = document.getElementById("note-modal-edit");

/* Open */
newNoteButton.addEventListener("click", openCreateNote);
function openCreateNote() {

    editingNoteId = null;

    noteModalTitle.textContent =
        "Create note";

    noteModalSave.textContent =
        "Create note";

    noteModalEdit.hidden = true;
    noteModalSave.hidden = false;

    newNoteTitle.disabled = false;
    newNoteContent.disabled = false;

    newNoteTitle.value = "";
    newNoteContent.value = "";

    createNoteModal.hidden = false;

    newNoteTitle.focus();
}


/* Close */
closeNoteModal.addEventListener("click", closeCreateNote);
function closeCreateNote() {

    createNoteModal.hidden = true;
}

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            !createNoteModal.hidden
        ) {
            closeCreateNote();
        }

    }
);

createNoteModal.addEventListener(
    "click",
    (event) => {

        if (event.target === createNoteModal) {
            closeCreateNote();
        }

    }
);

/* Save */
noteModalSave.addEventListener("click", saveNote);

async function saveNote() {

    const title =
        newNoteTitle.value.trim();

    const content =
        newNoteContent.value;

    if (!title) {
        alert("Title cannot be empty");
        return;
    }

    let url;
    let method;

    if (editingNoteId === null) {

        // Create new note
        url = `${API_URL}/api/notes`;
        method = "POST";

    } else {

        // Update existing note
        url = `${API_URL}/api/notes/${editingNoteId}`;
        method = "PUT";
    }

    const response = await fetch(
        url,
        {
            method: method,

            headers: {
                "Content-Type":
                    "application/json",

                "Authorization":
                    `Bearer ${sessionId}`
            },

            body: JSON.stringify({
                title: title,
                content: content
            })
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    if (editingNoteId !== null) {

        // Stay open and return to view mode

        noteModalTitle.textContent =
            "View note";

        newNoteTitle.disabled = true;
        newNoteContent.disabled = true;

        noteModalEdit.hidden = false;
        noteModalSave.hidden = true;

    } else {

        // Creating a new note
        createNoteModal.hidden = true;

        editingNoteId = null;
    }

    await loadNotes();
}


async function openNote(noteId) {

    const response = await fetch(
        `${API_URL}/api/notes/${noteId}`,
        {
            headers: {
                "Authorization":
                    `Bearer ${sessionId}`
            }
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    editingNoteId = data.id;

    noteModalTitle.textContent =
        "View note";

    newNoteTitle.value =
        data.title;

    newNoteContent.value =
        data.content;

    // View mode
    newNoteTitle.disabled = true;
    newNoteContent.disabled = true;

    noteModalEdit.hidden = false;
    noteModalSave.hidden = true;

    createNoteModal.hidden = false;
}



noteModalEdit.addEventListener(
    "click",
    enableNoteEditing
);

function enableNoteEditing() {

    noteModalTitle.textContent =
        "Edit note";

    newNoteTitle.disabled = false;
    newNoteContent.disabled = false;

    noteModalEdit.hidden = true;
    noteModalSave.hidden = false;

    newNoteTitle.focus();
}


async function deleteNote(noteId) {

    const confirmed =
        confirm("Are you sure you want to delete this note?");

    if (!confirmed) {
        return;
    }

    const response = await fetch(
        `${API_URL}/api/notes/${noteId}`,
        {
            method: "DELETE",

            headers: {
                "Authorization":
                    `Bearer ${sessionId}`
            }
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    await loadNotes();
}



const signupModal = document.getElementById("signup-modal");

const signupButton = document.getElementById("signup-button");

const closeSignupModal = document.getElementById("close-signup-modal");


signupButton.addEventListener("click", () => {
    signupModal.hidden = false;
}
);

closeSignupModal.addEventListener("click", () => {
    signupModal.hidden = true;
}
);


const signupUsername =
    document.getElementById("signup-username");

const signupPassword =
    document.getElementById("signup-password");

const signupPasswordConfirm =
    document.getElementById("signup-password-confirm");

const signupSubmit =
    document.getElementById("signup-submit");


signupSubmit.addEventListener("click", createAccount);


async function createAccount() {

    const username =
        signupUsername.value.trim();

    const password =
        signupPassword.value;

    const passwordConfirm =
        signupPasswordConfirm.value;


    if (!username) {
        alert("Username cannot be empty");
        return;
    }


    if (!password) {
        alert("Password cannot be empty");
        return;
    }


    if (password !== passwordConfirm) {
        alert("Passwords do not match");
        return;
    }


    const response = await fetch(
        `${API_URL}/api/users`,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                username: username,
                password: password
            })
        }
    );


    const data =
        await response.json();


    if (!response.ok) {
        alert(data.error);
        return;
    }


    alert("Account created successfully!");

    signupModal.hidden = true;

    signupUsername.value = "";
    signupPassword.value = "";
    signupPasswordConfirm.value = "";
}



const loginModal =
    document.getElementById("login-modal");

const loginButton =
    document.getElementById("login-button");

const closeLoginModal =
    document.getElementById("close-login-modal");


loginButton.addEventListener(
    "click",
    () => {
        loginModal.hidden = false;
    }
);


closeLoginModal.addEventListener(
    "click",
    () => {
        loginModal.hidden = true;
    }
);


const loginUsername =
    document.getElementById("login-username");

const loginPassword =
    document.getElementById("login-password");

const loginSubmit =
    document.getElementById("login-submit");

loginSubmit.addEventListener(
    "click",
    loginUser
);

async function loginUser() {

    const username =
        loginUsername.value.trim();

    const password =
        loginPassword.value;


    if (!username) {
        alert("Username cannot be empty");
        return;
    }


    if (!password) {
        alert("Password cannot be empty");
        return;
    }


    const response = await fetch(
        `${API_URL}/api/login`,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                username: username,
                password: password
            })
        }
    );


    const data =
        await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }


    // Store the new session and load
    // this user's notes.
    await setSession(data);


    // Close login popup
    loginModal.hidden = true;


    // Clear password from the form
    loginUsername.value = "";
    loginPassword.value = "";
}

const logoutButton =
    document.getElementById("logout-button");

logoutButton.addEventListener(
    "click",
    logoutUser
);

async function logoutUser() {
    const response = await fetch(
        `${API_URL}/api/logout`,
        {
            method: "POST",
            headers: {
                "Authorization":
                    `Bearer ${sessionId}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    // Remove browser-side session information
    localStorage.removeItem("session_id");
    localStorage.removeItem("username");

    sessionId = null;
    username = null;

    usernameElement.textContent = "Guest";

    updateAccountUI();

    // Open a new Guest session
    await openGuest();
}


function updateAccountUI() {
    const isGuest = username === "guest";

    loginButton.hidden = !isGuest;
    signupButton.hidden = !isGuest;
    logoutButton.hidden = isGuest;
    changePasswordButton.hidden = isGuest;
}


const changePasswordButton =
    document.getElementById("change-password-button");

const changePasswordModal =
    document.getElementById("change-password-modal");

const closeChangePasswordModal =
    document.getElementById(
        "close-change-password-modal"
    );

const currentPassword =
    document.getElementById("current-password");

const newPassword =
    document.getElementById("new-password");

const confirmNewPassword =
    document.getElementById("confirm-new-password");

const changePasswordSubmit =
    document.getElementById(
        "change-password-submit"
    );


changePasswordButton.addEventListener(
    "click",
    () => {
        changePasswordModal.hidden = false;
        currentPassword.focus();
    }
);

closeChangePasswordModal.addEventListener(
    "click",
    () => {
        changePasswordModal.hidden = true;
    }
);

changePasswordModal.addEventListener(
    "click",
    (event) => {
        if (event.target === changePasswordModal) {
            changePasswordModal.hidden = true;
        }
    }
);


changePasswordSubmit.addEventListener(
    "click",
    changeUserPassword
);

async function changeUserPassword() {
    const oldPassword =
        currentPassword.value;

    const newPasswordValue =
        newPassword.value;

    const confirmPassword =
        confirmNewPassword.value;

    if (!oldPassword) {
        alert("Enter your current password.");
        return;
    }

    if (!newPasswordValue) {
        alert("Enter a new password.");
        return;
    }

    if (newPasswordValue !== confirmPassword) {
        alert("New passwords do not match.");
        return;
    }

    const response = await fetch(
        `${API_URL}/api/change-password`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization":
                    `Bearer ${sessionId}`
            },
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPasswordValue
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    alert("Password changed successfully.");

    currentPassword.value = "";
    newPassword.value = "";
    confirmNewPassword.value = "";

    changePasswordModal.hidden = true;
}


const deleteAccountButton =
    document.getElementById("delete-account-button");

const deleteAccountModal =
    document.getElementById("delete-account-modal");

const closeDeleteAccountModal =
    document.getElementById(
        "close-delete-account-modal"
    );

const deleteAccountPassword =
    document.getElementById(
        "delete-account-password"
    );

const deleteAccountSubmit =
    document.getElementById(
        "delete-account-submit"
    );

function updateAccountUI() {
    const isGuest = username === "guest";

    loginButton.hidden = !isGuest;
    signupButton.hidden = !isGuest;
    logoutButton.hidden = isGuest;
    changePasswordButton.hidden = isGuest;
    deleteAccountButton.hidden = isGuest;
}

deleteAccountButton.addEventListener(
    "click",
    () => {
        deleteAccountModal.hidden = false;
        deleteAccountPassword.focus();
    }
);

closeDeleteAccountModal.addEventListener(
    "click",
    () => {
        deleteAccountModal.hidden = true;
    }
);

deleteAccountModal.addEventListener(
    "click",
    (event) => {
        if (event.target === deleteAccountModal) {
            deleteAccountModal.hidden = true;
        }
    }
);

deleteAccountSubmit.addEventListener(
    "click",
    deleteUserAccount
);

async function deleteUserAccount() {
    const password =
        deleteAccountPassword.value;

    if (!password) {
        alert("Enter your password.");
        return;
    }

    const confirmed = confirm(
        "This will permanently delete your account and all notes. Continue?"
    );

    if (!confirmed) {
        return;
    }

    const response = await fetch(
        `${API_URL}/api/delete-account`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization":
                    `Bearer ${sessionId}`
            },
            body: JSON.stringify({
                password: password
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    localStorage.removeItem("session_id");
    localStorage.removeItem("username");

    sessionId = null;
    username = null;

    deleteAccountPassword.value = "";
    deleteAccountModal.hidden = true;

    usernameElement.textContent = "Guest";

    updateAccountUI();

    await openGuest();
}







restoreSession();
