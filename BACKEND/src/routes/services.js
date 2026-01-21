const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { protect } = require('../middleware/authMiddleware');

// Get all services for an agent
/**
 * @swagger
 * /api/agents/{id}/services:
 *   get:
 *     summary: Get agent services
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: List of services
 *       500:
 *         description: Server error
 */
router.get('/agents/:id/services', protect, serviceController.getAgentServices);

// Get service details
/**
 * @swagger
 * /api/agents/{id}/services/{serviceName}:
 *   get:
 *     summary: Get detailed service info
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Agent ID
 *       - in: path
 *         name: serviceName
 *         schema:
 *           type: string
 *         required: true
 *         description: Service Name
 *     responses:
 *       200:
 *         description: Service details
 *       500:
 *         description: Server error
 */
router.get('/agents/:id/services/:serviceName', protect, serviceController.getServiceDetails);

// Get all processes for an agent
/**
 * @swagger
 * /api/agents/{id}/processes:
 *   get:
 *     summary: Get agent processes
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: List of processes
 *       500:
 *         description: Server error
 */
router.get('/agents/:id/processes', protect, serviceController.getAgentProcesses);

module.exports = router;
