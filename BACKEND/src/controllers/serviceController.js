const Service = require('../models/Service');
const Process = require('../models/Process');
const Agent = require('../models/Agent');

/**
 * Get all services for a specific agent
 */
exports.getAgentServices = async (req, res) => {
    try {
        const { id } = req.params;

        // Find agent by name or ID
        const agent = await Agent.findOne({
            $or: [{ _id: id }, { name: id }]
        });

        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }

        // Get all services for this agent
        const services = await Service.find({ agentId: agent._id })
            .sort({ name: 1 });

        res.json(services);
    } catch (error) {
        console.error('Error fetching agent services:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Get service details by name
 */
exports.getServiceDetails = async (req, res) => {
    try {
        const { id, serviceName } = req.params;

        // Find agent
        const agent = await Agent.findOne({
            $or: [{ _id: id }, { name: id }]
        });

        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }

        // Find service
        const service = await Service.findOne({
            agentId: agent._id,
            name: serviceName
        });

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Get related processes (latest snapshot for each PID)
        const allProcesses = await Process.find({
            agentId: agent._id,
            linkedServiceId: service._id
        }).sort({ timestamp: -1 }).limit(100);

        // Deduplicate by PID - keep only the latest snapshot of each process
        const processMap = new Map();
        for (const proc of allProcesses) {
            if (!processMap.has(proc.pid)) {
                processMap.set(proc.pid, proc);
            }
        }
        const processes = Array.from(processMap.values());

        res.json({
            service,
            processes
        });
    } catch (error) {
        console.error('Error fetching service details:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Get all processes for a specific agent
 */
exports.getAgentProcesses = async (req, res) => {
    try {
        const { id } = req.params;

        // Find agent
        const agent = await Agent.findOne({
            $or: [{ _id: id }, { name: id }]
        });

        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }

        // Get latest processes (last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const processes = await Process.find({
            agentId: agent._id,
            timestamp: { $gte: fiveMinutesAgo }
        }).sort({ timestamp: -1 }).limit(100);

        // Group by PID and get latest for each
        const processMap = new Map();
        for (const proc of processes) {
            if (!processMap.has(proc.pid)) {
                processMap.set(proc.pid, proc);
            }
        }

        const uniqueProcesses = Array.from(processMap.values());

        res.json(uniqueProcesses);
    } catch (error) {
        console.error('Error fetching agent processes:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Update or create services from agent metrics
 */
exports.updateServicesFromMetrics = async (agentId, servicesData) => {
    try {
        if (!servicesData || !Array.isArray(servicesData)) {
            return;
        }

        for (const serviceData of servicesData) {
            await Service.findOneAndUpdate(
                {
                    agentId: agentId,
                    port: serviceData.port
                },
                {
                    ...serviceData,
                    agentId: agentId,
                    lastSeen: new Date()
                },
                {
                    upsert: true,
                    new: true
                }
            );
        }

        // Mark services as stopped if not seen in last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        await Service.updateMany(
            {
                agentId: agentId,
                lastSeen: { $lt: twoMinutesAgo },
                status: 'running'
            },
            {
                status: 'stopped'
            }
        );
    } catch (error) {
        console.error('Error updating services from metrics:', error);
    }
};

/**
 * Store process data from agent metrics
 */
exports.storeProcessData = async (agentId, processesData) => {
    try {
        if (!processesData || !Array.isArray(processesData)) {
            return;
        }

        // Get all services for this agent to link processes
        const services = await Service.find({ agentId: agentId });
        const servicesByPort = new Map();
        for (const service of services) {
            if (service.port) {
                servicesByPort.set(service.port, service._id);
            }
        }

        // Bulk insert processes with service linking
        const processDocuments = processesData.map(proc => {
            // Find matching service by port
            let linkedServiceId = null;
            if (proc.ports && proc.ports.length > 0) {
                for (const portInfo of proc.ports) {
                    const port = typeof portInfo === 'object' ? portInfo.port : portInfo;
                    if (servicesByPort.has(port)) {
                        linkedServiceId = servicesByPort.get(port);
                        break;
                    }
                }
            }

            return {
                agentId: agentId,
                ...proc,
                linkedServiceId: linkedServiceId,
                timestamp: new Date()
            };
        });

        if (processDocuments.length > 0) {
            await Process.insertMany(processDocuments, { ordered: false });
        }
    } catch (error) {
        // Ignore duplicate key errors (same PID at same timestamp)
        if (error.code !== 11000) {
            console.error('Error storing process data:', error);
        }
    }
};

module.exports = exports;
