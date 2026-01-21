const express = require('express');
const router = express.Router();
const otelQueryController = require('../controllers/otelQueryController');

// Metrics endpoints
router.get('/metrics/latest', otelQueryController.getLatestMetrics);
router.get('/metrics/timeseries', otelQueryController.getMetricTimeSeries);
router.get('/metrics/daily-usage', otelQueryController.getDailyNetworkUsage);

// Traces endpoints
router.get('/traces', otelQueryController.getTraces);
router.get('/traces/:traceId', otelQueryController.getTraceDetails);

// Services endpoints
router.get('/services', otelQueryController.getServices);
router.get('/services/:serviceName', otelQueryController.getServiceDetails); // New endpoint
router.get('/service-topology', otelQueryController.getServiceTopology);

module.exports = router;
