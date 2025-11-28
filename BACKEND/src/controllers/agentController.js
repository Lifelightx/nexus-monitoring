const Agent = require('../models/Agent');
const Metric = require('../models/Metric');

// Get all agents
exports.getAgents = async (req, res) => {
    try {
        const agents = await Agent.find().sort({ lastSeen: -1 });
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
