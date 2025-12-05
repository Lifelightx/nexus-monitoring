const express = require('express');
const router = express.Router();
const metricController = require('../controllers/metricController');

router.get('/:agentId/report', metricController.getMetricsReport);

module.exports = router;
