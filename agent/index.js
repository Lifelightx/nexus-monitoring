require('dotenv').config();
const io = require('socket.io-client');
const { collectSystemMetrics } = require('./collectors/systemCollector');
const { collectDockerData } = require('./collectors/dockerCollector');
const { collectAgentInfo } = require('./collectors/agentCollector');
const { collectProcessData } = require('./collectors/processCollector');
const { detectServices } = require('./collectors/serviceDetector');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const AGENT_NAME = process.env.AGENT_NAME || require('os').hostname();
const INTERVAL = process.env.INTERVAL || 5000;

console.log(`Starting Nexus Agent...`);
console.log(`Connecting to ${SERVER_URL} as ${AGENT_NAME}`);

const socket = io(SERVER_URL, {
    auth: {
        token: process.env.AGENT_TOKEN,
        agentName: AGENT_NAME,
        os: require('os').platform(),
    }
});

socket.on('connect', async () => {
    console.log('Connected to Nexus Server');

    // Send initial static data
    const agentInfo = await collectAgentInfo(AGENT_NAME);
    socket.emit('agent:register', agentInfo);

    // Send initial metrics
    await sendMetrics();

    // Start disk scan loop
    startDiskScanLoop();

    // Start sending metrics
    startMetricsLoop();
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('connect_error', (err) => {
    console.log('Connection error:', err.message);
});

const {
    startLogs,
    stopLogs,
    startTerminal,
    writeTerminal,
    resizeTerminal,
    stopTerminal
} = require('./handlers/dockerHandler');

// Handle Docker container control commands from server
socket.on('docker:control', async (data) => {
    const { action, containerId } = data;
    console.log(`Received Docker control command: ${action} for container ${containerId}`);

    try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        let command;
        switch (action) {
            case 'start':
                command = `docker start ${containerId}`;
                break;
            case 'stop':
                command = `docker stop ${containerId}`;
                break;
            case 'restart':
                command = `docker restart ${containerId}`;
                break;
            case 'create':
                const { image, name, ports, env, restart, command: cmd } = data.payload;
                let runCmd = `docker run -d`;
                if (name) runCmd += ` --name ${name}`;
                if (restart && restart !== 'no') runCmd += ` --restart ${restart}`;

                if (ports) {
                    ports.split(',').forEach(p => {
                        const port = p.trim();
                        if (port) runCmd += ` -p ${port}`;
                    });
                }

                if (env) {
                    env.split(',').forEach(e => {
                        const envVar = e.trim();
                        if (envVar) runCmd += ` -e ${envVar}`;
                    });
                }

                runCmd += ` ${image}`;
                if (cmd) runCmd += ` ${cmd}`;

                command = runCmd;
                break;
            case 'remove':
                command = `docker rm ${containerId}`;
                break;
            case 'removeImage':
                command = `docker rmi ${data.payload.imageId}`;
                break;
            case 'removeNetwork':
                command = `docker network rm ${containerId}`;
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        const { stdout, stderr } = await execPromise(command);

        socket.emit('docker:control:result', {
            success: true,
            action,
            containerId,
            message: `Container ${action}ed successfully`,
            output: stdout
        });

        console.log(`Successfully ${action}ed container ${containerId}`);

        // Send updated metrics immediately
        await sendMetrics();

    } catch (error) {
        socket.emit('docker:control:result', {
            success: false,
            action,
            containerId,
            message: error.message,
            error: error.toString()
        });

        console.error(`Failed to ${action} container ${containerId}:`, error.message);
    }
});

// Docker Logs Events
socket.on('docker:logs:start', ({ containerId }) => startLogs(socket, containerId));
socket.on('docker:logs:stop', ({ containerId }) => stopLogs(containerId));

// Docker Terminal Events
socket.on('docker:terminal:start', ({ containerId }) => startTerminal(socket, containerId));
socket.on('docker:terminal:data', ({ containerId, data }) => writeTerminal(containerId, data));
socket.on('docker:terminal:resize', ({ containerId, cols, rows }) => resizeTerminal(containerId, cols, rows));
socket.on('docker:terminal:stop', ({ containerId }) => stopTerminal(containerId));

// Handle File System List command
socket.on('system:fs:list', async (data) => {
    const { path: rawPath, requestId } = data;
    // Normalize path: if it's just "C:" or "D:", append "/" to ensure it treats it as root, not CWD
    const path = rawPath.match(/^[A-Za-z]:$/) ? `${rawPath}/` : rawPath;

    console.log(`Received FS list request for ${path} (raw: ${rawPath})`);

    try {
        const fs = require('fs/promises');
        const { join } = require('path');

        const items = await fs.readdir(path, { withFileTypes: true });

        const fileList = items.map(item => ({
            name: item.name,
            type: item.isDirectory() ? 'folder' : 'file',
            size: 0, // fs.readdir doesn't give size, need stat. For speed, we might skip or stat individual
            path: join(path, item.name)
        }));

        // Get sizes for files (optional, might be slow for many files)
        // For now, let's just return names/types for speed, or stat top 20?
        // Let's try to stat all, but handle errors
        for (const file of fileList) {
            try {
                if (file.type === 'file') {
                    const stats = await fs.stat(file.path);
                    file.size = stats.size;
                }
            } catch (e) {
                // Ignore stat errors (permissions etc)
            }
        }

        socket.emit('system:fs:list:result', {
            requestId,
            success: true,
            path,
            files: fileList
        });
    } catch (error) {
        console.error('FS list failed:', error);
        socket.emit('system:fs:list:result', {
            requestId,
            success: false,
            path,
            error: error.message
        });
    }
});

// Handle Docker Compose Deployment
socket.on('agent:deploy:compose', async ({ composeContent }, callback) => {
    console.log('Received docker compose deployment request');
    try {
        const { deployCompose } = require('./handlers/dockerHandler');
        const result = await deployCompose(composeContent);
        if (callback) {
            callback({ success: true, message: result.message });
        }
    } catch (error) {
        console.error('Deploy failed:', error);
        if (callback) {
            callback({ success: false, message: error.message || 'Deployment failed' });
        }
    }
});

async function sendMetrics() {
    try {
        // Collect all metrics
        const systemMetrics = await collectSystemMetrics();
        const dockerData = await collectDockerData();
        const processData = await collectProcessData();

        if (!systemMetrics) {
            console.error('Failed to collect system metrics');
            return;
        }

        // Detect services from processes and containers
        const services = detectServices(
            processData.serviceProcesses,
            dockerData.containers
        );

        const metrics = {
            agent: AGENT_NAME,
            timestamp: new Date(),
            ...systemMetrics,
            docker: dockerData.containers.filter(c => c.state === 'running').map(c => ({
                id: c.id,
                name: c.name,
                image: c.image,
                state: c.state,
            })),
            dockerDetails: dockerData,
            processes: {
                total: processData.totalProcesses,
                services: processData.totalServices,
                list: processData.serviceProcesses.slice(0, 20) // Send top 20
            },
            services: services // Detected services
        };

        socket.emit('agent:metrics', metrics);
    } catch (error) {
        console.error('Error sending metrics:', error);
    }
}



async function runDiskScan() {
    try {
        const { scanDisk, collectSystemMetrics } = require('./collectors/systemCollector');
        const axios = require('axios');
        const crypto = require('crypto');

        // Get mount points first
        const metrics = await collectSystemMetrics();
        if (!metrics || !metrics.disk) return;

        // Initialize hash storage if not exists
        if (!global.diskHashes) {
            global.diskHashes = {};
        }

        // Scan each disk
        for (const disk of metrics.disk) {
            // console.log(`Scanning disk: ${disk.mount}`);
            const files = await scanDisk(disk.mount);

            // Generate hash of the file list to detect changes
            const currentHash = crypto.createHash('md5').update(JSON.stringify(files)).digest('hex');

            if (global.diskHashes[disk.mount] === currentHash) {
                // console.log(`No changes detected for ${disk.mount}, skipping upload.`);
                continue;
            }

            // Send to backend via API (HTTP POST)
            try {
                await axios.post(`${SERVER_URL}/api/agents/${process.env.AGENT_NAME || require('os').hostname()}/system/disk-scan`, {
                    path: disk.mount,
                    files
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.AGENT_TOKEN}`
                    }
                });
                console.log(`Sent updated disk scan data for ${disk.mount}`);
                global.diskHashes[disk.mount] = currentHash;
            } catch (err) {
                console.error(`Failed to send disk scan data for ${disk.mount}:`, err.message);
            }
        }
    } catch (error) {
        console.error('Error running disk scan:', error);
    }
}

async function startDiskScanLoop() {
    // Run immediately
    await runDiskScan();

    // Then run every minute (simulating "update on change" without heavy watching)
    // 60000 ms = 1 minute
    setInterval(runDiskScan, 60000);
}

async function startMetricsLoop() {
    // Send initial metrics immediately
    await sendMetrics();

    // Then send at regular intervals
    setInterval(sendMetrics, INTERVAL);
}

