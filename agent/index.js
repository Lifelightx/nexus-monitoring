require('dotenv').config();
const io = require('socket.io-client');
const { collectSystemMetrics } = require('./collectors/systemCollector');
const { collectDockerData } = require('./collectors/dockerCollector');
const { collectAgentInfo } = require('./collectors/agentCollector');

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

    // Start sending metrics
    startMetricsLoop();
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('connect_error', (err) => {
    console.log('Connection error:', err.message);
});

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

async function sendMetrics() {
    try {
        // Collect all metrics
        const systemMetrics = await collectSystemMetrics();
        const dockerData = await collectDockerData();

        if (!systemMetrics) {
            console.error('Failed to collect system metrics');
            return;
        }

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
            dockerDetails: dockerData
        };

        socket.emit('agent:metrics', metrics);
    } catch (error) {
        console.error('Error sending metrics:', error);
    }
}

async function startMetricsLoop() {
    // Send initial metrics immediately
    await sendMetrics();

    // Then send at regular intervals
    setInterval(sendMetrics, INTERVAL);
}
