const Agent = require('../models/Agent');
const Metric = require('../models/Metric');

module.exports = (io, app) => {
    const agents = new Map(); // socketId -> agentData
    const agentSockets = app.get('agentSockets'); // agentId -> socketId

    io.on('connection', (socket) => {
        console.log('New connection:', socket.id);

        socket.on('agent:register', async (data) => {
            console.log('Agent Registered:', data.name);

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
                console.error('Error registering agent:', err);
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
                    docker: data.docker,
                    dockerDetails: data.dockerDetails,
                    timestamp: new Date()
                });

                // Update Agent lastSeen
                await Agent.findByIdAndUpdate(agentInfo._id, { lastSeen: new Date() });

            } catch (err) {
                console.error('Error saving metrics:', err);
            }

            // Broadcast to frontend dashboard
            io.emit('dashboard:update', { ...data, agentId: agentInfo._id });
        });

        // Handle Docker control results from agent
        socket.on('docker:control:result', (data) => {
            console.log('Docker control result:', data);
            // Broadcast result to all connected dashboards
            io.emit('docker:control:result', data);
        });

        socket.on('disconnect', async () => {
            if (agents.has(socket.id)) {
                const agentInfo = agents.get(socket.id);
                console.log('Agent disconnected:', agentInfo.name);

                // Mark agent as offline
                try {
                    await Agent.findByIdAndUpdate(agentInfo._id, { status: 'offline' });
                } catch (err) {
                    console.error('Error updating agent status:', err);
                }

                // Remove socket mapping
                agentSockets.delete(agentInfo._id.toString());
                agents.delete(socket.id);
            }
        });
    });
};
