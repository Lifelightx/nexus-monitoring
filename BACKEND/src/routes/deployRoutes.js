const express = require('express');
const router = express.Router();
const { deployCompose } = require('../controllers/deployController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/deploy/compose:
 *   post:
 *     summary: Deploy a Docker Compose configuration
 *     tags: [Deploy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *               - composeFile
 *               - projectName
 *             properties:
 *               agentId:
 *                 type: string
 *                 description: ID of the agent to deploy to
 *               composeFile:
 *                 type: string
 *                 description: Docker compose file content
 *               projectName:
 *                 type: string
 *                 description: Name of the project
 *     responses:
 *       200:
 *         description: Deployment initiated successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Agent not found or not connected
 *       500:
 *         description: Server error
 */
router.post('/compose', protect, deployCompose);

module.exports = router;
