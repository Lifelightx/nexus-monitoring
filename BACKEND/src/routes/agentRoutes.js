const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Agents
 *   description: Agent management and metrics
 */

/**
 * @swagger
 * /api/agents:
 *   get:
 *     summary: Get all registered agents
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of agents
 */
router.get('/', protect, agentController.getAgents);

/**
 * @swagger
 * /api/agents/{id}:
 *   get:
 *     summary: Get agent details
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent details
 */
router.get('/:id', protect, agentController.getAgent);

/**
 * @swagger
 * /api/agents/{id}/metrics:
 *   get:
 *     summary: Get historical metrics for an agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of metrics
 */
router.get('/:id/metrics', protect, agentController.getAgentMetrics);

module.exports = router;
