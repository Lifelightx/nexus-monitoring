const express = require('express');
const router = express.Router();
const { controlDockerContainer } = require('../controllers/dockerController');
const { protect } = require('../middleware/authMiddleware');

// Docker control route
router.post('/:agentId/docker/control', protect, controlDockerContainer);

module.exports = router;
