const { spawn } = require('child_process');
const os = require('os');
let pty;
try {
    pty = require('node-pty');
} catch (e) {
    console.warn('node-pty not found, falling back to basic child_process. Interactive terminal features (colors, resizing) will be limited.');
}

const logStreams = new Map(); // containerId -> process
const terminalSessions = new Map(); // containerId -> process (pty or spawn)

/**
 * Start streaming logs for a container
 * @param {Object} socket - Socket.io socket
 * @param {string} containerId - Docker container ID
 */
function startLogs(socket, containerId) {
    if (logStreams.has(containerId)) {
        stopLogs(containerId);
    }

    console.log(`Starting logs for ${containerId}`);

    const logs = spawn('docker', ['logs', '-f', '--tail', '100', containerId]);
    logStreams.set(containerId, logs);

    logs.stdout.on('data', (data) => {
        socket.emit('docker:logs:data', { containerId, data: data.toString(), type: 'stdout' });
    });

    logs.stderr.on('data', (data) => {
        socket.emit('docker:logs:data', { containerId, data: data.toString(), type: 'stderr' });
    });

    logs.on('close', (code) => {
        console.log(`Logs stream for ${containerId} exited with code ${code}`);
        logStreams.delete(containerId);
        socket.emit('docker:logs:end', { containerId, code });
    });

    logs.on('error', (err) => {
        console.error(`Logs stream error for ${containerId}:`, err);
        socket.emit('docker:logs:error', { containerId, error: err.message });
    });
}

/**
 * Stop streaming logs for a container
 * @param {string} containerId 
 */
function stopLogs(containerId) {
    const process = logStreams.get(containerId);
    if (process) {
        process.kill();
        logStreams.delete(containerId);
        console.log(`Stopped logs for ${containerId}`);
    }
}

/**
 * Start interactive terminal for a container
 * @param {Object} socket - Socket.io socket
 * @param {string} containerId - Docker container ID
 */
function startTerminal(socket, containerId) {
    if (terminalSessions.has(containerId)) {
        stopTerminal(containerId);
    }

    console.log(`Starting terminal for ${containerId}`);

    if (pty) {
        // Use node-pty for full terminal experience
        try {
            const ptyProcess = pty.spawn('docker', ['exec', '-it', containerId, '/bin/sh'], {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                cwd: process.env.HOME,
                env: process.env
            });

            terminalSessions.set(containerId, { process: ptyProcess, type: 'pty' });

            ptyProcess.onData((data) => {
                socket.emit('docker:terminal:data', { containerId, data });
            });

            ptyProcess.onExit(({ exitCode }) => {
                console.log(`Terminal (PTY) for ${containerId} exited with code ${exitCode}`);
                terminalSessions.delete(containerId);
                socket.emit('docker:terminal:exit', { containerId, exitCode });
            });

        } catch (error) {
            console.error(`Failed to start PTY terminal for ${containerId}:`, error);
            socket.emit('docker:terminal:error', { containerId, error: error.message });
        }
    } else {
        // Fallback to child_process
        try {
            // Use -i for interactive, but no -t because we don't have a TTY
            const cmd = spawn('docker', ['exec', '-i', containerId, '/bin/sh']);

            terminalSessions.set(containerId, { process: cmd, type: 'spawn' });

            cmd.stdout.on('data', (data) => {
                socket.emit('docker:terminal:data', { containerId, data: data.toString() });
            });

            cmd.stderr.on('data', (data) => {
                socket.emit('docker:terminal:data', { containerId, data: data.toString() });
            });

            cmd.on('close', (code) => {
                console.log(`Terminal (spawn) for ${containerId} exited with code ${code}`);
                terminalSessions.delete(containerId);
                socket.emit('docker:terminal:exit', { containerId, exitCode: code });
            });

            cmd.on('error', (err) => {
                console.error(`Failed to start spawn terminal for ${containerId}:`, err);
                socket.emit('docker:terminal:error', { containerId, error: err.message });
            });

        } catch (error) {
            console.error(`Failed to start fallback terminal for ${containerId}:`, error);
            socket.emit('docker:terminal:error', { containerId, error: error.message });
        }
    }
}

/**
 * Write data to terminal session
 * @param {string} containerId 
 * @param {string} data 
 */
function writeTerminal(containerId, data) {
    const session = terminalSessions.get(containerId);
    if (session) {
        if (session.type === 'pty') {
            session.process.write(data);
        } else {
            session.process.stdin.write(data);
        }
    }
}

/**
 * Resize terminal session
 * @param {string} containerId 
 * @param {number} cols 
 * @param {number} rows 
 */
function resizeTerminal(containerId, cols, rows) {
    const session = terminalSessions.get(containerId);
    if (session && session.type === 'pty') {
        try {
            session.process.resize(cols, rows);
        } catch (e) {
            console.error(`Error resizing terminal for ${containerId}:`, e);
        }
    }
}

/**
 * Stop terminal session
 * @param {string} containerId 
 */
function stopTerminal(containerId) {
    const session = terminalSessions.get(containerId);
    if (session) {
        if (session.type === 'pty') {
            session.process.kill();
        } else {
            session.process.kill();
        }
        terminalSessions.delete(containerId);
        console.log(`Stopped terminal for ${containerId}`);
    }
}

module.exports = {
    startLogs,
    stopLogs,
    startTerminal,
    writeTerminal,
    resizeTerminal,
    stopTerminal,
    deployCompose
};

/**
 * Deploy Docker Compose stack
 * @param {string} composeContent 
 * @returns {Promise<{message: string, output: string}>}
 */
async function deployCompose(composeContent) {
    const fs = require('fs').promises;
    const path = require('path');
    const { exec } = require('child_process');

    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, `docker-compose-${Date.now()}.yml`);

    try {
        await fs.writeFile(filePath, composeContent);

        return new Promise((resolve, reject) => {
            // Try 'docker compose' (v2)
            const command = `docker compose -f "${filePath}" up -d --remove-orphans`;

            console.log(`Executing: ${command}`);

            exec(command, (error, stdout, stderr) => {
                // Clean up file (async, don't wait)
                fs.unlink(filePath).catch(e => console.error('Failed to cleanup temp file:', e));

                if (error) {
                    console.warn('docker compose v2 failed, trying v1...', error.message);

                    // Fallback to 'docker-compose' (v1)
                    const fallbackCommand = `docker-compose -f "${filePath}" up -d --remove-orphans`;

                    exec(fallbackCommand, (err2, stdout2, stderr2) => {
                        if (err2) {
                            reject({ message: err2.message, output: stderr2 || err2.message });
                        } else {
                            resolve({ message: 'Deployed successfully (v1)', output: stdout2 });
                        }
                    });
                    return;
                }

                resolve({ message: 'Deployed successfully', output: stdout });
            });
        });
    } catch (err) {
        throw new Error(`Failed to process compose file: ${err.message}`);
    }
}
