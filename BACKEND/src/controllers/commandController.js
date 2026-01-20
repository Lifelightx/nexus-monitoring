const commandQueueService = require('../services/commandQueueService');
const Agent = require('../models/Agent');
const logger = require('../utils/logger');

/**
 * Poll for pending commands (called by agent)
 */
exports.pollCommands = async (req, res) => {
    try {
        // Agent info from auth middleware
        const agentName = req.body.agentName || req.query.agentName;

        if (!agentName) {
            return res.status(400).json({ error: 'Agent name required' });
        }

        // Find agent
        const agent = await Agent.findOne({ name: agentName });
        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        // Update last seen
        await Agent.findByIdAndUpdate(agent._id, { lastSeen: new Date() });

        // Get pending commands
        const commands = await commandQueueService.getPendingCommands(agent._id);

        res.json({
            success: true,
            commands: commands.map(cmd => ({
                id: cmd._id,
                type: cmd.commandType,
                payload: cmd.payload
            }))
        });
    } catch (error) {
        logger.error('Error polling commands:', error.message);
        res.status(500).json({ error: 'Failed to poll commands' });
    }
};

/**
 * Submit command result (called by agent)
 */
exports.submitCommandResult = async (req, res) => {
    try {
        const { commandId } = req.params;
        const { status, result, error } = req.body;

        if (!['completed', 'failed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const command = await commandQueueService.submitCommandResult(
            commandId,
            status,
            result,
            error
        );

        res.json({
            success: true,
            command: {
                id: command._id,
                status: command.status
            }
        });
    } catch (error) {
        logger.error('Error submitting command result:', error.message);
        res.status(500).json({ error: 'Failed to submit result' });
    }
};

/**
 * Create command (called by frontend)
 */
exports.createCommand = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { type, payload } = req.body;

        if (!type || !payload) {
            return res.status(400).json({ error: 'Type and payload required' });
        }

        const command = await commandQueueService.createCommand(agentId, type, payload);

        res.json({
            success: true,
            commandId: command._id,
            status: command.status
        });
    } catch (error) {
        logger.error('Error creating command:', error.message);
        res.status(500).json({ error: 'Failed to create command' });
    }
};

/**
 * Get command status (called by frontend)
 */
exports.getCommandStatus = async (req, res) => {
    try {
        const { commandId } = req.params;

        const command = await commandQueueService.getCommandStatus(commandId);

        if (!command) {
            return res.status(404).json({ error: 'Command not found' });
        }

        res.json({
            success: true,
            command: {
                id: command._id,
                type: command.commandType,
                status: command.status,
                result: command.result,
                error: command.error,
                createdAt: command.createdAt,
                completedAt: command.completedAt
            }
        });
    } catch (error) {
        logger.error('Error getting command status:', error.message);
        res.status(500).json({ error: 'Failed to get command status' });
    }
};
