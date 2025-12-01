const express = require('express');
const router = express.Router();
const { deployCompose } = require('../controllers/deployController');
const { protect } = require('../middleware/authMiddleware');

router.post('/compose', protect, deployCompose);

module.exports = router;
