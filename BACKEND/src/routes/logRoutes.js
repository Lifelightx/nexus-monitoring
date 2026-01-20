const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { verifyToken } = require('../middleware/authMiddleware'); // Assuming this exists

// Public route for now (agent uses it) - ideally authenticated
// Agent sends POST /api/logs/batch
router.post('/batch', logController.ingestLogs);

// Frontend fetches logs
router.get('/:agentId', logController.getAgentLogs);

module.exports = router;
