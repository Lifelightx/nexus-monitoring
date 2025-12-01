const logger = require('../utils/logger');

const deployCompose = async (req, res) => {
    const { composeContent, targetAgentIds } = req.body;
    const io = req.app.get('io');
    const agentSockets = req.app.get('agentSockets'); // Map<agentId, socketId>

    if (!composeContent || !targetAgentIds || !Array.isArray(targetAgentIds)) {
        return res.status(400).json({ message: 'Invalid request body' });
    }

    const results = {};

    // We will wait for all deployments to complete (or timeout)
    const deployPromises = targetAgentIds.map(async (agentId) => {
        const socketId = agentSockets.get(agentId);

        if (!socketId) {
            results[agentId] = { success: false, message: 'Agent not connected' };
            return;
        }

        try {
            // Use Socket.IO's acknowledgement feature
            // We set a timeout of 30 seconds for the deployment to start/complete
            const response = await io.timeout(30000).to(socketId).emitWithAck('agent:deploy:compose', {
                composeContent
            });

            // response is an array of args passed to the ack callback. We expect the first arg to be the result object.
            const result = response[0];
            results[agentId] = result;

        } catch (err) {
            logger.error(`Deployment timeout or error for agent ${agentId}:`, err);
            results[agentId] = { success: false, message: 'Request timed out or failed' };
        }
    });

    await Promise.all(deployPromises);

    res.json({ results });
};

module.exports = {
    deployCompose
};
