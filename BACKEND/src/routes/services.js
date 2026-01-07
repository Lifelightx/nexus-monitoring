const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { protect } = require('../middleware/authMiddleware');

// Get all services for an agent
router.get('/agents/:id/services', protect, serviceController.getAgentServices);

// Get service details
router.get('/agents/:id/services/:serviceName', protect, serviceController.getServiceDetails);

// Get all processes for an agent
router.get('/agents/:id/processes', protect, serviceController.getAgentProcesses);

module.exports = router;
