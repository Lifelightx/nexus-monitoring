const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');
const logger = require('../utils/logger');

/**
 * Setup plain WebSocket server for C++ agent connections
 * Separate from Socket.IO which is used for frontend
 */
function setupAgentWebSocket(server, app) {
    const wss = new WebSocket.Server({
        server,
        path: '/ws/agent'
    });

    const agentConnections = new Map(); // agentId -> ws connection
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    wss.on('connection', (ws, req) => {
        logger.info('New WebSocket connection from agent', { ip: req.socket.remoteAddress });

        let agentId = null;
        let agentName = null;
        let authenticated = false;

        // Send welcome message
        ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));

        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());

                // Handle authentication
                if (message.type === 'auth') {
                    const { token, agentName: name } = message;

                    try {
                        const decoded = jwt.verify(token, secret);
                        authenticated = true;
                        agentName = name;

                        // Find or create agent
                        const agent = await Agent.findOneAndUpdate(
                            { name: agentName },
                            {
                                name: agentName,
                                status: 'online',
                                lastSeen: new Date(),
                                ip: req.socket.remoteAddress
                            },
                            { upsert: true, new: true }
                        );

                        agentId = agent._id.toString();
                        agentConnections.set(agentId, ws);

                        ws.send(JSON.stringify({
                            type: 'auth_success',
                            agentId,
                            message: 'Authentication successful'
                        }));

                        logger.info(`Agent authenticated: ${agentName}`, { agentId });

                    } catch (err) {
                        ws.send(JSON.stringify({
                            type: 'auth_error',
                            message: 'Invalid token'
                        }));
                        ws.close();
                    }
                }

                // Handle agent registration (alternative to auth)
                else if (message.type === 'register') {
                    const { name, hostname, os, platform, arch, cpus, totalMemory, version } = message.data;
                    agentName = name;

                    const agent = await Agent.findOneAndUpdate(
                        { name: agentName },
                        {
                            name,
                            hostname,
                            os,
                            platform,
                            arch,
                            cpus,
                            totalMemory,
                            version,
                            status: 'online',
                            lastSeen: new Date(),
                            ip: req.socket.remoteAddress
                        },
                        { upsert: true, new: true }
                    );

                    agentId = agent._id.toString();
                    agentConnections.set(agentId, ws);
                    authenticated = true;

                    ws.send(JSON.stringify({
                        type: 'register_success',
                        agentId,
                        message: 'Registration successful'
                    }));

                    logger.info(`Agent registered: ${agentName}`, { agentId });
                }

                // Handle ping/pong
                else if (message.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }

                // Handle other messages (only if authenticated)
                else if (authenticated) {
                    // Update last seen
                    if (agentId) {
                        await Agent.findByIdAndUpdate(agentId, { lastSeen: new Date() });
                    }

                    // Forward to appropriate handler
                    logger.debug(`Received message from ${agentName}:`, message.type);
                }

            } catch (err) {
                logger.error('Error processing WebSocket message:', err.message);
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
            }
        });

        ws.on('close', async () => {
            if (agentId) {
                agentConnections.delete(agentId);

                // Mark agent as offline
                try {
                    await Agent.findByIdAndUpdate(agentId, { status: 'offline' });
                    logger.info(`Agent disconnected: ${agentName}`, { agentId });
                } catch (err) {
                    logger.error('Error updating agent status:', err.message);
                }
            }
        });

        ws.on('error', (err) => {
            logger.error('WebSocket error:', err.message);
        });
    });

    // Store reference for other modules to send commands to agents
    app.set('agentWebSockets', agentConnections);

    logger.info('Agent WebSocket server initialized on /ws/agent');
}

module.exports = setupAgentWebSocket;
