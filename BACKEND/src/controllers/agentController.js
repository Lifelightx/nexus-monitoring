const Agent = require('../models/Agent');
const Metric = require('../models/Metric');

// Get all agents
exports.getAgents = async (req, res) => {
    try {
        let agents = await Agent.find().sort({ lastSeen: -1 });

        // Check for stale agents (not seen in last 1 minute) and mark them offline
        const now = new Date();
        const staleThreshold = 60 * 1000; // 1 minute

        agents = await Promise.all(agents.map(async (agent) => {
            if (agent.status === 'online' && (now - new Date(agent.lastSeen) > staleThreshold)) {
                agent.status = 'offline';
                await agent.save();
            }
            return agent;
        }));

        res.json(agents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get specific agent details
exports.getAgent = async (req, res) => {
    try {
        const agent = await Agent.findById(req.params.id);
        if (!agent) return res.status(404).json({ message: 'Agent not found' });
        res.json(agent);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get metrics for an agent
exports.getAgentMetrics = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 20 } = req.query;

        const metrics = await Metric.find({ agent: id })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json(metrics);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
