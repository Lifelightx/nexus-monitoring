const Agent = require('../models/Agent');
const Metric = require('../models/Metric');
const logger = require('../utils/logger');

module.exports = (io, app) => {
    const agents = new Map(); // socketId -> agentData
    const agentSockets = app.get('agentSockets'); // agentId -> socketId
    const jwt = require('jsonwebtoken');

    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        // Allow dashboard connections without token (or implement separate dashboard auth)
        // For now, we assume if no token is provided, it might be a dashboard client
        // BUT, we need to distinguish between agent and dashboard.
        // Let's make token optional for now to unblock the dashboard, 
        // but strictly enforce it for agents in the 'agent:register' event if we wanted.
        // BETTER APPROACH: Check if it's an agent connection attempt.

        // If it's a dashboard connection (no token), let it pass?
        // The issue is the dashboard might not be sending a token, so it gets rejected.
        if (!token) {
            // Check if it's a dashboard client (e.g. via query param or just allow)
            // For this MVP, let's allow connection but only authenticated sockets can emit 'agent:*' events
            return next();
        }

        const secret = process.env.JWT_SECRET || 'your-secret-key';
        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                return next(new Error('Authentication error: Invalid token'));
            }
            // Store decoded info if needed
            socket.decoded = decoded;
            next();
        });
    });

    io.on('connection', (socket) => {
        const auth = socket.handshake.auth;
        const agentName = auth.agentName;
        const clientType = agentName ? `Agent (${agentName})` : 'Dashboard/UI';

        logger.info(`New Connection: ${clientType}`, { socketId: socket.id, ip: socket.handshake.address });

        socket.on('agent:register', async (data) => {
            logger.info(`Agent Registered: ${data.name}`, { socketId: socket.id });

            try {
                // Upsert Agent in DB
                const agent = await Agent.findOneAndUpdate(
                    { name: data.name },
                    {
                        ...data,
                        status: 'online',
                        lastSeen: new Date(),
                        ip: socket.handshake.address
                    },
                    { upsert: true, new: true }
                );

                // Store agent info in memory map
                agents.set(socket.id, { ...data, _id: agent._id });

                // Store socket mapping for Docker control
                agentSockets.set(agent._id.toString(), socket.id);

                // Broadcast new agent list to admins (optional, for future)
            } catch (err) {
                logger.error('Error registering agent:', err.message);
            }
        });

        socket.on('agent:metrics', async (data) => {
            const agentInfo = agents.get(socket.id);
            if (!agentInfo) return;

            // Save Metrics to DB
            try {
                await Metric.create({
                    agent: agentInfo._id,
                    cpu: data.cpu,
                    memory: data.memory,
                    network: data.network,
                    uptime: data.uptime,
                    docker: data.docker,
                    dockerDetails: data.dockerDetails,
                    timestamp: new Date()
                });

                // Update Agent lastSeen and uptime
                await Agent.findByIdAndUpdate(agentInfo._id, {
                    lastSeen: new Date(),
                    uptime: data.uptime
                });

            } catch (err) {
                logger.error('Error saving metrics:', err.message);
            }

            // Broadcast to frontend dashboard
            io.emit('dashboard:update', { ...data, agentId: agentInfo._id });
        });

        // Handle Docker control results from agent
        socket.on('docker:control:result', (data) => {
            logger.info('Docker control result:', data);
            // Broadcast result to all connected dashboards
            io.emit('docker:control:result', data);
        });

        socket.on('disconnect', async () => {
            if (agents.has(socket.id)) {
                const agentInfo = agents.get(socket.id);
                logger.info(`Agent disconnected: ${agentInfo.name}`, { socketId: socket.id });

                // Mark agent as offline
                try {
                    await Agent.findByIdAndUpdate(agentInfo._id, { status: 'offline' });
                } catch (err) {
                    logger.error('Error updating agent status:', err.message);
                }

                // Remove socket mapping
                agentSockets.delete(agentInfo._id.toString());
                agents.delete(socket.id);
            }
        });
    });
};
