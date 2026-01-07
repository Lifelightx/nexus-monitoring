const express = require('express');
const router = express.Router();
const traceController = require('../controllers/traceController');
const { protect } = require('../middleware/authMiddleware');

// Trace ingestion (from agent)
router.post('/traces', traceController.ingestTraces);

// Trace queries
router.get('/traces/:traceId', protect, traceController.getTrace);
router.get('/traces/:traceId/analysis', protect, traceController.analyzeTrace);

// Service traces
router.get('/services/:serviceId/traces', protect, traceController.getServiceTraces);
router.get('/services/:serviceId/trace-stats', protect, traceController.getServiceTraceStats);

module.exports = router;
