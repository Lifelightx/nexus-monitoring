const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { verifyToken } = require('../middleware/authMiddleware'); // Assuming this exists

// Public route for now (agent uses it) - ideally authenticated
// Agent sends POST /api/logs/batch
/**
 * @swagger
 * /api/logs/batch:
 *   post:
 *     summary: Ingest logs batch
 *     tags: [Logs]
 *     responses:
 *       200:
 *         description: Logs ingested
 *       500:
 *         description: Server error
 */
router.post('/batch', logController.ingestLogs);

// Frontend fetches logs
/**
 * @swagger
 * /api/logs/{agentId}:
 *   get:
 *     summary: Get logs for agent
 *     tags: [Logs]
 *     parameters:
 *       - in: path
 *         name: agentId
 *         schema:
 *           type: string
 *         required: true
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: List of logs
 *       500:
 *         description: Server error
 */
router.get('/:agentId', logController.getAgentLogs);

module.exports = router;
