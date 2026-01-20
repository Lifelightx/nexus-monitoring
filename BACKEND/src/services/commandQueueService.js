const PendingCommand = require('../models/PendingCommand');
const logger = require('../utils/logger');

/**
 * Command Queue Service
 * Manages pending commands for agents using HTTP polling
 */
class CommandQueueService {
    /**
     * Create a new command for an agent
     */
    async createCommand(agentId, commandType, payload) {
        try {
            const command = await PendingCommand.create({
                agentId,
                commandType,
                payload,
                status: 'pending'
            });

            logger.info(`Command created: ${commandType} for agent ${agentId}`, { commandId: command._id });
            return command;
        } catch (error) {
            logger.error('Error creating command:', error.message);
            throw error;
        }
    }

    /**
     * Get pending commands for an agent
     */
    async getPendingCommands(agentId, limit = 10) {
        try {
            const commands = await PendingCommand.find({
                agentId,
                status: 'pending'
            })
                .sort({ createdAt: 1 })
                .limit(limit)
                .lean();

            // Mark as executing
            if (commands.length > 0) {
                const commandIds = commands.map(c => c._id);
                await PendingCommand.updateMany(
                    { _id: { $in: commandIds } },
                    {
                        status: 'executing',
                        executedAt: new Date()
                    }
                );
            }

            return commands;
        } catch (error) {
            logger.error('Error getting pending commands:', error.message);
            throw error;
        }
    }

    /**
     * Submit command result from agent
     */
    async submitCommandResult(commandId, status, result, error = null) {
        try {
            const update = {
                status,
                completedAt: new Date()
            };

            if (result) {
                update.result = result;
            }

            if (error) {
                update.error = error;
            }

            const command = await PendingCommand.findByIdAndUpdate(
                commandId,
                update,
                { new: true }
            );

            if (!command) {
                throw new Error('Command not found');
            }

            logger.info(`Command ${status}: ${command.commandType}`, { commandId });
            return command;
        } catch (error) {
            logger.error('Error submitting command result:', error.message);
            throw error;
        }
    }

    /**
     * Get command status (for frontend polling)
     */
    async getCommandStatus(commandId) {
        try {
            const command = await PendingCommand.findById(commandId).lean();
            return command;
        } catch (error) {
            logger.error('Error getting command status:', error.message);
            throw error;
        }
    }

    /**
     * Clean up old commands
     */
    async cleanupOldCommands(olderThanHours = 24) {
        try {
            const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
            const result = await PendingCommand.deleteMany({
                createdAt: { $lt: cutoffDate }
            });

            logger.info(`Cleaned up ${result.deletedCount} old commands`);
            return result.deletedCount;
        } catch (error) {
            logger.error('Error cleaning up commands:', error.message);
            throw error;
        }
    }
}

module.exports = new CommandQueueService();
