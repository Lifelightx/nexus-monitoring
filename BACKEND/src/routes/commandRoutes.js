const express = require('express');
const router = express.Router();
const commandController = require('../controllers/commandController');

// Agent endpoints (called by C++ agent)
router.post('/poll', commandController.pollCommands);
router.post('/:commandId/result', commandController.submitCommandResult);

// Frontend endpoints (called by dashboard)
router.post('/agent/:agentId/command', commandController.createCommand);
router.get('/:commandId/status', commandController.getCommandStatus);

module.exports = router;
