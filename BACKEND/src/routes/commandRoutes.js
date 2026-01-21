const express = require('express');
const router = express.Router();
const commandController = require('../controllers/commandController');

// Agent endpoints (called by C++ agent)
/**
 * @swagger
 * /api/commands/poll:
 *   post:
 *     summary: Poll for commands
 *     tags: [Commands]
 *     responses:
 *       200:
 *         description: Command polled
 *       500:
 *         description: Server error
 */
router.post('/poll', commandController.pollCommands);

/**
 * @swagger
 * /api/commands/{commandId}/result:
 *   post:
 *     summary: Submit command result
 *     tags: [Commands]
 *     parameters:
 *       - in: path
 *         name: commandId
 *         schema:
 *           type: string
 *         required: true
 *         description: Command ID
 *     responses:
 *       200:
 *         description: Result submitted
 *       500:
 *         description: Server error
 */
router.post('/:commandId/result', commandController.submitCommandResult);

// Frontend endpoints (called by dashboard)
/**
 * @swagger
 * /api/commands/agent/{agentId}/command:
 *   post:
 *     summary: Create a command for an agent
 *     tags: [Commands]
 *     parameters:
 *       - in: path
 *         name: agentId
 *         schema:
 *           type: string
 *         required: true
 *         description: Agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - action
 *             properties:
 *               type:
 *                 type: string
 *               action:
 *                 type: string
 *               params:
 *                 type: object
 *     responses:
 *       201:
 *         description: Command created
 *       500:
 *         description: Server error
 */
router.post('/agent/:agentId/command', commandController.createCommand);

/**
 * @swagger
 * /api/commands/{commandId}/status:
 *   get:
 *     summary: Get command status
 *     tags: [Commands]
 *     parameters:
 *       - in: path
 *         name: commandId
 *         schema:
 *           type: string
 *         required: true
 *         description: Command ID
 *     responses:
 *       200:
 *         description: Command status
 *       404:
 *         description: Command not found
 *       500:
 *         description: Server error
 */
router.get('/:commandId/status', commandController.getCommandStatus);

module.exports = router;
