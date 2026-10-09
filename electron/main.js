const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let mainWindow;
let flaskProcess;
let flaskExited = false;
let stoppingFlask = false;

const projectRoot = path.resolve(__dirname, "..");
const backendPath = path.join(projectRoot, "backend");
const frontendPath = path.join(projectRoot, "frontend", "index.html");

function startFlask() {
    return new Promise((resolve, reject) => {
        const pythonPath = path.join(
            backendPath,
            "venv",
            "bin",
            "python"
        );

        flaskProcess = spawn(
            pythonPath,
            ["app.py"],
            {
                cwd: backendPath,
                stdio: ["ignore", "pipe", "pipe"]
            }
        );

        let stdoutBuffer = "";
        let ready = false;

        // Read messages printed by Python.
        flaskProcess.stdout.setEncoding("utf8");

        flaskProcess.stdout.on("data", (chunk) => {
            stdoutBuffer += chunk;

            const lines = stdoutBuffer.split("\n");
            stdoutBuffer = lines.pop();

            for (const line of lines) {
                const message = line.trim();

                if (message.startsWith("BACKEND_READY:")) {
                    const port = Number(
                        message.slice("BACKEND_READY:".length)
                    );

                    if (
                        !Number.isInteger(port) ||
                        port < 1 ||
                        port > 65535
                    ) {
                        if (!ready) {
                            reject(
                                new Error(
                                    "Python reported an invalid port."
                                )
                            );
                        }
                        continue;
                    }

                    if (!ready) {
                        ready = true;

                        const apiUrl =
                            `http://127.0.0.1:${port}`;

                        console.log(
                            `Flask is listening at ${apiUrl}`
                        );

                        resolve(apiUrl);
                    }
                } else if (message) {
                    console.log(`[Flask] ${message}`);
                }
            }
        });

        // Display Python errors in the Electron terminal.
        flaskProcess.stderr.setEncoding("utf8");

        flaskProcess.stderr.on("data", (chunk) => {
            process.stderr.write(`[Flask] ${chunk}`);
        });

        flaskProcess.on("error", (error) => {
            console.error("Failed to start Flask:", error);

            if (!ready) {
                reject(error);
            }
        });

        flaskProcess.on("exit", (code, signal) => {
            flaskExited = true;

            console.log(
                `Flask stopped. Exit code: ${code}, signal: ${signal}`
            );

            if (!ready) {
                reject(
                    new Error(
                        "Flask exited before reporting its port."
                    )
                );
            }
        });
    });
}

async function waitForFlask(apiUrl, timeout = 15000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (flaskExited) {
            throw new Error(
                "Flask stopped before the API became ready."
            );
        }

        try {
            const response = await fetch(
                `${apiUrl}/api/notes`,
                {
                    signal: AbortSignal.timeout(1000)
                }
            );

            // Our notes API requires authentication.
            // A 401 response confirms that the API is responding.
            if (response.status === 401 || response.ok) {
                return;
            }
        } catch (error) {
            // The server may need a little more time to start.
        }

        await new Promise(resolve => setTimeout(resolve, 250));
    }

    throw new Error(
        "Flask did not become ready within 15 seconds."
    );
}

function createWindow(apiUrl) {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: "Encrypted Notebook",

        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    mainWindow.removeMenu();

    // Pass the selected API address to the frontend.
    mainWindow.loadFile(frontendPath, {
        query: {
            apiUrl: apiUrl
        }
    });

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    try {
        // Python chooses a port and announces it to Electron.
        const apiUrl = await startFlask();

        // Confirm that the API actually responds.
        await waitForFlask(apiUrl);

        // Open the window only after the backend is ready.
        createWindow(apiUrl);
    } catch (error) {
        console.error("Application startup failed:", error);

        dialog.showErrorBox(
            "Encrypted Notebook",
            "The backend could not start.\n\n" +
            error.message +
            "\n\nCheck the terminal for more details."
        );

        app.quit();
    }
});

app.on("before-quit", (event) => {
    if (!flaskProcess || flaskExited) {
        return;
    }

    // Wait for Python to stop before quitting Electron.
    event.preventDefault();

    if (stoppingFlask) {
        return;
    }

    stoppingFlask = true;

    flaskProcess.once("exit", () => {
        flaskExited = true;
        app.quit();
    });

    flaskProcess.kill("SIGTERM");

    // Force shutdown if Python does not stop in time.
    setTimeout(() => {
        if (!flaskExited) {
            flaskProcess.kill("SIGKILL");
        }
    }, 3000).unref();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
