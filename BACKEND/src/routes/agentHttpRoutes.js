const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');
const Metric = require('../models/Metric');
const Process = require('../models/Process');
const Service = require('../models/Service');
const Logger = require('../utils/logger');
const chalk = require('chalk');
const { protect } = require('../middleware/authMiddleware');

// Agent registration
/**
 * @swagger
 * /api/agent/register:
 *   post:
 *     summary: Register a new agent
 *     tags: [Agent (HTTP)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               hostname:
 *                 type: string
 *               os:
 *                 type: string
 *               platform:
 *                 type: string
 *               arch:
 *                 type: string
 *               cpus:
 *                 type: integer
 *               totalMemory:
 *                 type: integer
 *               version:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agent registered successfully
 *       500:
 *         description: Server error
 */
// Agent registration
router.post('/register', protect, async (req, res) => {
    try {
        const { name, hostname, os, platform, arch, cpus, totalMemory, version } = req.body;

        // Upsert agent
        const agent = await Agent.findOneAndUpdate(
            { name },
            {
                name,
                hostname,
                os,
                platform,
                arch,
                cpus,
                totalMemory,
                version,
                status: 'online',
                lastSeen: new Date(),
                ip: req.ip
            },
            { upsert: true, new: true }
        );

        Logger.info(`[HTTP] Agent registered: ${name} (OS: ${os}, Platform: ${platform})`);

        res.json({
            success: true,
            agentId: agent._id,
            message: 'Agent registered successfully'
        });
    } catch (error) {
        Logger.error('Agent registration error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Metrics submission
/**
 * @swagger
 * /api/agent/metrics:
 *   post:
 *     summary: Submit agent metrics
 *     tags: [Agent (HTTP)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agent:
 *                 type: string
 *               cpu:
 *                 type: object
 *               memory:
 *                 type: object
 *               disk:
 *                 type: array
 *                 items:
 *                   type: object
 *               network:
 *                 type: object
 *               docker:
 *                 type: array
 *                 items:
 *                   type: object
 *               uptime:
 *                 type: number
 *     responses:
 *       200:
 *         description: Metrics submitted successfully
 *       500:
 *         description: Server error
 */
// Metrics submission
router.post('/metrics', protect, async (req, res) => {
    try {
        const {
            agent: agentName,
            cpu,
            memory,
            disk,
            network,
            docker,
            dockerDetails,
            processes,
            services,
            uptime,
            bootTime,      // Added
            agentUptime,   // Added
            os,
            users,
            security
        } = req.body;

        // console.log(`[HTTP] ✓ Received metrics from agent: ${agentName}`);

        // Find agent
        const agent = await Agent.findOne({ name: agentName });
        if (!agent) {
            console.log(`[HTTP] ✗ Agent not found: ${agentName}`);
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }

        // Update agent lastSeen AND latest metrics
        await Agent.findByIdAndUpdate(agent._id, {
            lastSeen: new Date(),
            status: 'online',
            uptime: uptime || 0,
            latestDockerInfo: dockerDetails || {},
            latestSystemMetrics: {
                cpu,
                memory,
                disk,
                network
            }
        });

        // Persist Services and Processes
        const serviceController = require('../controllers/serviceController');
        if (services && services.length > 0) {
            await serviceController.updateServicesFromMetrics(agent._id, services);
        }
        if (processes && processes.length > 0) {
            await serviceController.storeProcessData(agent._id, processes);
        }

        // ✅ Broadcast full metrics to dashboard via Socket.IO (no DB storage!)
        const io = req.app.get('io');
        if (io) {
            const metricsPayload = {
                _id: agent._id,
                name: agent.name,
                agentId: agent._id, // Frontend expects this for ID check
                agent: agent.name, // Frontend expects this
                timestamp: new Date(),
                cpu: {
                    load: cpu.usage_percent, // Map usage to load
                    ...cpu
                },
                memory,
                disk,
                network, // Now contains rx_sec/tx_sec from agent
                docker,
                dockerDetails,
                processes,
                services,
                users,      // Active Users
                security,   // Failed Logins & Sudo Usage
                // Include OS info from agent document
                os: {
                    hostname: os?.hostname || agent.hostname,
                    distro: os?.distro || agent.os, // Map os to distro
                    release: agent.version, // C++ Agent version
                    arch: os?.arch || agent.arch,
                    ip: agent.ip,
                    ip: agent.ip,
                    kernel: os?.platform || agent.platform // or os? Frontend shows "Linux x86_64"
                },

                // Add root fields expected by Frontend
                platform: agent.platform,
                ip: agent.ip,

                // Keep mapped fields for other views
                latestDockerInfo: dockerDetails,
                latestSystemMetrics: { cpu, memory, disk, network },
                uptime: uptime || 0,
                bootTime: bootTime,      // Added
                agentUptime: agentUptime // Added
            };

            // Send events
            io.to('dashboards').emit('dashboard:update', metricsPayload); // For ServerOverview.jsx
            io.to('dashboards').emit('agent:metrics', metricsPayload); // Legacy/Other
            io.to('dashboards').emit('agent:updated', {
                _id: agent._id,
                name: agent.name,
                status: 'online',
                lastSeen: new Date(),
                ...metricsPayload // Include all data
            });
            // console.log(`[HTTP] ✓ Broadcasted full metrics to dashboards for ${agentName}`);
        }

        res.json({ success: true });
    } catch (error) {
        Logger.error('Metrics submission error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Heartbeat
/**
 * @swagger
 * /api/agent/heartbeat:
 *   post:
 *     summary: Send agent heartbeat
 *     tags: [Agent (HTTP)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentName
 *             properties:
 *               agentName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Heartbeat received
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
// Heartbeat
router.post('/heartbeat', protect, async (req, res) => {
    try {
        const { agentName } = req.body;

        const agent = await Agent.findOneAndUpdate(
            { name: agentName },
            {
                lastSeen: new Date(),
                status: 'online'
            }
        );

        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }

        res.json({ success: true });
    } catch (error) {
        Logger.error('Heartbeat error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get agent status
/**
 * @swagger
 * /api/agent/status/{agentName}:
 *   get:
 *     summary: Get agent status
 *     tags: [Agent (HTTP)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentName
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the agent
 *     responses:
 *       200:
 *         description: Agent status retrieved
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
// Get agent status
router.get('/status/:agentName', protect, async (req, res) => {
    try {
        const agent = await Agent.findOne({ name: req.params.agentName });

        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }

        res.json({
            success: true,
            agent: {
                name: agent.name,
                status: agent.status,
                lastSeen: agent.lastSeen,
                uptime: agent.uptime
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ Command Polling Endpoints

// GET /api/agent/commands/:agentName - Agent polls for pending commands
/**
 * @swagger
 * /api/agent/commands/{agentName}:
 *   get:
 *     summary: Poll for pending commands
 *     tags: [Agent (HTTP)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentName
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the agent
 *     responses:
 *       200:
 *         description: Pending command retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 command:
 *                   type: object
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
// GET /api/agent/commands/:agentName - Agent polls for pending commands
router.get('/commands/:agentName', protect, async (req, res) => {
    try {
        const { agentName } = req.params;
        const agent = await Agent.findOne({ name: agentName });

        if (!agent) {
            return res.status(404).json({ success: false, error: 'Agent not found' });
        }

        // Find pending commands
        // We use findOneAndUpdate to atomically lock the command so other polling threads don't get it (if any)
        // But for a single agent polling, findOne is fine. To be safe, we can mark as 'sent' immediately.

        const CommandQueue = require('../models/CommandQueue');
        const command = await CommandQueue.findOneAndUpdate(
            { agent: agent._id, status: 'pending' },
            { status: 'sent', sentAt: new Date() },
            { sort: { createdAt: 1 }, new: true } // Get oldest pending command
        );

        if (command) {
            // Log concise command info
            const targetStr = command.params && command.params.containerId ? `(Container: ${command.params.containerId.substring(0, 12)}...)` : '';
            Logger.info(`[Command] 📤 Sending ${chalk.bold(command.action)} to ${chalk.cyan(agentName)} ${targetStr}`);
            return res.json({
                success: true,
                command: {
                    id: command._id,
                    type: command.type,
                    action: command.action,
                    params: command.params
                }
            });
        }

        // No commands
        res.json({ success: true, command: null });

    } catch (error) {
        Logger.error('Error fetching commands:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/agent/commands/:commandId/result - Agent submits command result
/**
 * @swagger
 * /api/agent/commands/{commandId}/result:
 *   post:
 *     summary: Submit command result
 *     tags: [Agent (HTTP)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commandId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the command
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [completed, failed]
 *               result:
 *                 type: object
 *     responses:
 *       200:
 *         description: Result processed successfully
 *       500:
 *         description: Server error
 */
// POST /api/agent/commands/:commandId/result - Agent submits command result
router.post('/commands/:commandId/result', protect, async (req, res) => {
    try {
        const { commandId } = req.params;
        const { status, result } = req.body; // status: 'completed' | 'failed'

        const CommandQueue = require('../models/CommandQueue');
        const command = await CommandQueue.findByIdAndUpdate(
            commandId,
            {
                status: status,
                result: result,
                completedAt: new Date()
            },
            { new: true }
        );

        if (command) {
            const containerId = command.params?.containerId ? command.params.containerId.substring(0, 12) : '';
            const details = containerId ? `(ID: ${containerId})` : '';

            if (status === 'failed') {
                const errorMsg = result?.message || JSON.stringify(result);
                Logger.error(`[Command] [From: Agent] ❌ ${chalk.bold(command.action)} failed ${details}. Reason: ${chalk.red(errorMsg)}`);
            } else {
                Logger.success(`[Command] [From: Agent] ✅ ${chalk.bold(command.action)} completed ${details}`);
            }

            // Broadcast result to dashboard via Socket.IO
            // Match the event name expected by frontend (if any) or create new standard
            const io = req.app.get('io');
            if (io) {
                io.emit('docker:control:result', {
                    description: `${command.type} ${command.action}`,
                    success: status === 'completed',
                    result: result,
                    containerId: command.params?.containerId // Context for frontend
                });

                // Also trigger agent list update if it was a docker action
                if (command.type === 'docker') {
                    // Trigger a delayed agent list broadcast (allow time for agent to report new state)
                    setTimeout(async () => {
                        const agents = await Agent.find({}).select('-__v').lean();
                        io.to('dashboards').emit('agent:list:updated', agents);
                    }, 1000);
                }
            }

            // ✅ Wake up waiting controllers (Sync-over-Async)
            const eventBus = req.app.get('eventBus');
            if (eventBus && command.params?.requestId) {
                eventBus.emit('command:result', {
                    requestId: command.params.requestId,
                    success: status === 'completed',
                    files: result?.files, // For file:list
                    error: result?.error,
                    result: result
                });
            }
        }

        res.json({ success: true });

    } catch (error) {
        Logger.error('Error updating command result:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
