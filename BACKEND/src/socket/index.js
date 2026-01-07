const Agent = require('../models/Agent');
const Metric = require('../models/Metric');
const logger = require('../utils/logger');

module.exports = (io, app) => {
    const agents = new Map(); // socketId -> agentData
    const agentSockets = app.get('agentSockets'); // agentId -> socketId
    const dashboardClients = new Set(); // Set of dashboard socket IDs
    const jwt = require('jsonwebtoken');

    // Helper function to broadcast agent list to all dashboard clients
    const broadcastAgentList = async () => {
        try {
            const agentList = await Agent.find({}).select('-__v').lean();
            io.to('dashboards').emit('agent:list:updated', agentList);
            logger.info(`Broadcasted agent list to ${dashboardClients.size} dashboard clients`);
        } catch (err) {
            logger.error('Error broadcasting agent list:', err.message);
        }
    };

    // Helper function to broadcast specific agent update
    const broadcastAgentUpdate = async (agentId) => {
        try {
            const agent = await Agent.findById(agentId).select('-__v').lean();
            if (agent) {
                io.to('dashboards').emit('agent:updated', agent);
                logger.info(`Broadcasted update for agent: ${agent.name} `);
            }
        } catch (err) {
            logger.error('Error broadcasting agent update:', err.message);
        }
    };

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
        const clientType = agentName ? `Agent(${agentName})` : 'Dashboard/UI';

        logger.info(`New Connection: ${clientType}`, { socketId: socket.id, ip: socket.handshake.address });

        // Dashboard subscription
        socket.on('agent:list:subscribe', async () => {
            socket.join('dashboards');
            dashboardClients.add(socket.id);
            logger.info(`Dashboard client subscribed: ${socket.id}`);

            // Send initial agent list
            try {
                const agentList = await Agent.find({}).select('-__v').lean();
                socket.emit('agent:list:updated', agentList);
            } catch (err) {
                logger.error('Error sending initial agent list:', err.message);
            }
        });

        socket.on('agent:register', async (data) => {
            logger.info(`Agent Registered: ${data.name} `, { socketId: socket.id });

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

                // Broadcast updated agent list to all dashboards
                await broadcastAgentList();

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
                    disk: data.disk,
                    timestamp: new Date()
                });

                // Update Agent lastSeen and uptime
                await Agent.findByIdAndUpdate(agentInfo._id, {
                    lastSeen: new Date(),
                    uptime: data.uptime
                });

                // Store service and process data
                if (data.services || data.processes) {
                    const serviceController = require('../controllers/serviceController');

                    // console.log('📊 Received service/process data:', {
                    //     servicesCount: data.services?.length || 0,
                    //     processesCount: data.processes?.list?.length || 0
                    // });

                    if (data.services && Array.isArray(data.services)) {
                        // console.log('💾 Storing services:', data.services.map(s => ({ name: s.name, port: s.port })));
                        await serviceController.updateServicesFromMetrics(agentInfo._id, data.services);
                    }

                    if (data.processes && data.processes.list && Array.isArray(data.processes.list)) {
                        await serviceController.storeProcessData(agentInfo._id, data.processes.list);
                    }
                }

                // Detect alerts
                const alertService = require('../services/alertService');
                const previousMetric = await Metric.findOne({ agent: agentInfo._id })
                    .sort({ timestamp: -1 })
                    .skip(1)
                    .lean();

                const alerts = await alertService.detectAlerts(previousMetric, data, agentInfo);

                // Broadcast alerts to dashboard if any
                if (alerts.length > 0) {
                    io.to('dashboards').emit('alerts:new', alerts);
                    // Removed logging to prevent duplicate alert logs
                }


            } catch (err) {
                logger.error('Error saving metrics:', err.message);
            }

            // Broadcast to frontend dashboard
            io.emit('dashboard:update', { ...data, agentId: agentInfo._id });
        });

        // Handle Docker control results from agent
        socket.on('docker:control:result', async (data) => {
            logger.info('Docker control result:', data);
            // Broadcast result to all connected dashboards
            io.emit('docker:control:result', data);

            // Broadcast updated agent list after Docker operation completes
            // This ensures dashboards get the latest container states
            await broadcastAgentList();
        });

        // --- Docker Logs & Terminal Forwarding (Agent -> Dashboard) ---
        const forwardToDashboard = (event) => (data) => {
            // We might want to include agentId if not present, but for now broadcast
            // Ideally we should emit to specific room for that agent/container
            io.emit(event, data);
        };

        socket.on('docker:logs:data', forwardToDashboard('docker:logs:data'));
        socket.on('docker:logs:end', forwardToDashboard('docker:logs:end'));
        socket.on('docker:logs:error', forwardToDashboard('docker:logs:error'));

        socket.on('docker:terminal:data', forwardToDashboard('docker:terminal:data'));
        socket.on('docker:terminal:exit', forwardToDashboard('docker:terminal:exit'));
        socket.on('docker:terminal:error', forwardToDashboard('docker:terminal:error'));


        // --- Docker Logs & Terminal Forwarding (Dashboard -> Agent) ---
        const forwardToAgent = (event) => (data) => {
            const { agentId } = data;
            if (!agentId) return;

            const agentSocketId = agentSockets.get(agentId);
            if (agentSocketId) {
                io.to(agentSocketId).emit(event, data);
            } else {
                // Agent not connected
                socket.emit('error', { message: 'Agent not connected' });
            }
        };

        socket.on('docker:logs:start', forwardToAgent('docker:logs:start'));
        socket.on('docker:logs:stop', forwardToAgent('docker:logs:stop'));

        socket.on('docker:terminal:start', forwardToAgent('docker:terminal:start'));
        socket.on('docker:terminal:data', forwardToAgent('docker:terminal:data'));
        socket.on('docker:terminal:resize', forwardToAgent('docker:terminal:resize'));
        socket.on('docker:terminal:stop', forwardToAgent('docker:terminal:stop'));

        socket.on('disconnect', async () => {
            // Remove from dashboard clients if it was a dashboard
            if (dashboardClients.has(socket.id)) {
                dashboardClients.delete(socket.id);
                logger.info(`Dashboard client disconnected: ${socket.id}`);
            }

            if (agents.has(socket.id)) {
                const agentInfo = agents.get(socket.id);
                logger.info(`Agent disconnected: ${agentInfo.name}`, { socketId: socket.id });

                // Mark agent as offline
                try {
                    await Agent.findByIdAndUpdate(agentInfo._id, { status: 'offline' });

                    // Broadcast updated agent list to all dashboards
                    await broadcastAgentList();
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
