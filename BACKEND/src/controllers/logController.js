const Log = require('../models/Log');
const Agent = require('../models/Agent');

// Ingest batch of logs from agent
exports.ingestLogs = async (req, res) => {
    try {
        const { agentId, logs } = req.body;

        // Validate agent
        // Assuming middleware already attached user/agent info, but if it's agent-to-backend communication:
        // We might rely on the token agentId or pass it in body.
        // For now, trust the body agentId (or mapped from token in middleware)

        if (!logs || !Array.isArray(logs)) {
            return res.status(400).json({ success: false, message: 'Invalid logs format' });
        }

        const logDocs = logs.map(log => ({
            agentId,
            type: log.type,
            level: log.level,
            source: log.source,
            message: log.message,
            metadata: log.metadata,
            timestamp: log.timestamp || new Date()
        }));

        await Log.insertMany(logDocs);

        res.json({ success: true, count: logDocs.length });
    } catch (error) {
        console.error('Error ingesting logs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get logs for an agent
exports.getAgentLogs = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { type, level, source, startTime, endTime, search, limit = 100 } = req.query;

        const query = { agentId };

        if (type) query.type = type;
        if (level) query.level = level;
        if (source) query.source = new RegExp(source, 'i');
        if (search) query.message = new RegExp(search, 'i');

        if (startTime || endTime) {
            query.timestamp = {};
            if (startTime) query.timestamp.$gte = new Date(startTime);
            if (endTime) query.timestamp.$lte = new Date(endTime);
        }

        const logs = await Log.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, logs });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
