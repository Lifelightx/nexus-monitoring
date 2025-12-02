const express = require('express');
const router = express.Router();
const { controlDockerContainer } = require('../controllers/dockerController');
const { protect } = require('../middleware/authMiddleware');

// Docker control route
/**
 * @swagger
 * /api/agents/{agentId}/docker/control:
 *   post:
 *     summary: Control a Docker container
 *     tags: [Docker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the agent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - containerId
 *               - action
 *             properties:
 *               containerId:
 *                 type: string
 *                 description: ID of the container
 *               action:
 *                 type: string
 *                 enum: [start, stop, restart, remove]
 *                 description: Action to perform on the container
 *     responses:
 *       200:
 *         description: Command sent successfully
 *       400:
 *         description: Invalid action or missing fields
 *       404:
 *         description: Agent not found or not connected
 *       500:
 *         description: Server error
 */
router.post('/:agentId/docker/control', protect, controlDockerContainer);

module.exports = router;
