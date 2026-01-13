const Agent = require('../models/Agent');

/**
 * @swagger
 * /api/agents/{agentId}/docker/control:
 *   post:
 *     summary: Control Docker container (start/stop/restart)
 *     tags: [Docker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - containerId
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [start, stop, restart]
 *               containerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Control command sent successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Agent not found or offline
 */
const controlDockerContainer = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { action, containerId, payload } = req.body;

        // Validate action
        if (!['start', 'stop', 'restart', 'create', 'remove', 'removeImage', 'removeNetwork'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Must be start, stop, restart, create, remove, removeImage, or removeNetwork' });
        }

        if (action !== 'create' && !containerId) {
            return res.status(400).json({ message: 'Container ID is required' });
        }

        // Check if agent exists and is online
        const agent = await Agent.findById(agentId);
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }

        if (agent.status !== 'online') {
            return res.status(400).json({ message: 'Agent is offline' });
        }

        // Get socket.io instance from app
        const io = req.app.get('io');
        const agentSockets = req.app.get('agentSockets') || new Map();
        const socketId = agentSockets.get(agentId.toString());

        if (socketId && io) {
            // Online via Socket.IO (Legacy Node.js Agent)
            io.to(socketId).emit('docker:control', {
                action,
                containerId,
                payload
            });
            return res.json({
                success: true,
                message: `${action} command sent to agent via Socket.IO`,
                agentId,
                containerId,
                action
            });
        }

        // Fallback: Queue command for polling (C++ Agent)
        const CommandQueue = require('../models/CommandQueue');
        const command = new CommandQueue({
            agent: agentId,
            type: 'docker',
            action: action,
            params: { containerId, ...payload },
            status: 'pending'
        });
        await command.save();

        res.json({
            success: true,
            message: `${action} command queued for agent`,
            commandId: command._id,
            agentId,
            containerId,
            action,
            queued: true
        });

    } catch (error) {
        console.error('Error controlling Docker container:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    controlDockerContainer
};
