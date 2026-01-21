const otelQueryService = require('../services/otelQueryService');
const { getClickHouseClient } = require('../services/clickhouseClient');
const logger = require('../utils/logger');
const Service = require('../models/Service');
const TraceMetrics = require('../models/TraceMetrics');
const clickhouseClient = getClickHouseClient();

/**
 * OpenTelemetry Query Controller
 * Queries VictoriaMetrics for metrics and ClickHouse for traces
 */

/**
 * Get latest metrics
 * GET /api/otel/metrics/latest
 */
async function getLatestMetrics(req, res) {
    try {
        const { service } = req.query;

        // Get system and Docker metrics
        const [systemMetrics, dockerMetrics] = await Promise.all([
            otelQueryService.getLatestSystemMetrics(service),
            otelQueryService.getLatestDockerMetrics(service)
        ]);

        res.json({
            success: true,
            service: service || 'all',
            metrics: {
                ...systemMetrics,
                ...dockerMetrics
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching latest metrics:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch metrics',
            message: error.message
        });
    }
}

/**
 * Get metric time series
 * GET /api/otel/metrics/timeseries
 */
async function getMetricTimeSeries(req, res) {
    try {
        const { metricName, service, startTime, endTime, step } = req.query;

        if (!metricName) {
            return res.status(400).json({
                success: false,
                error: 'metricName is required'
            });
        }

        const timeseries = await otelQueryService.getMetricTimeSeries(
            metricName,
            service,
            startTime,
            endTime,
            step
        );

        res.json({
            success: true,
            data: timeseries
        });
    } catch (error) {
        logger.error('Error fetching metric timeseries:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch metric timeseries',
            message: error.message
        });
    }
}

/**
 * Get list of services
 * GET /api/otel/services
 */
async function getServices(req, res) {
    try {
        // Use ClickHouse for service discovery from traces (more accurate for APM)
        const services = await clickhouseClient.getServices();

        res.json({
            success: true,
            data: services
        });
    } catch (error) {
        logger.error('Error fetching services:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch services',
            message: error.message
        });
    }
}

/**
 * Get traces
 * GET /api/otel/traces
 */
async function getTraces(req, res) {
    try {
        const { serviceName, startTime, endTime, limit, minDuration, maxDuration } = req.query;

        const traces = await clickhouseClient.getTraces({
            serviceName,
            startTime,
            endTime,
            limit: parseInt(limit) || 50,
            minDuration: minDuration ? parseInt(minDuration) : undefined,
            maxDuration: maxDuration ? parseInt(maxDuration) : undefined
        });

        res.json({
            success: true,
            data: traces
        });
    } catch (error) {
        logger.error('Error fetching traces:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch traces',
            message: error.message
        });
    }
}

/**
 * Get trace details
 * GET /api/otel/traces/:traceId
 */
async function getTraceDetails(req, res) {
    try {
        const { traceId } = req.params;

        const spans = await clickhouseClient.getTraceDetails(traceId);

        // Transform spans for waterfall view if needed, or send raw
        res.json({
            success: true,
            data: {
                traceId,
                spans
            }
        });
    } catch (error) {
        logger.error('Error fetching trace details:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trace details',
            message: error.message
        });
    }
}

/**
 * Get service topology
 * GET /api/otel/service-topology
 */
async function getServiceTopology(req, res) {
    try {
        const { startTime, endTime } = req.query;

        const topology = await clickhouseClient.getServiceTopology({
            startTime,
            endTime
        });

        res.json({
            success: true,
            data: {
                nodes: [], // Frontend can derive nodes from edges
                edges: topology
            }
        });
    } catch (error) {
        logger.error('Error fetching service topology:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch service topology',
            message: error.message
        });
    }
}

/**
 * Get service details (Golden Signals)
 * GET /api/otel/services/:serviceName
 */
async function getServiceDetails(req, res) {
    try {
        const { serviceName } = req.params;

        // 1. Get Live Stats from Service Collection
        const serviceParams = { name: serviceName };
        const serviceDoc = await Service.findOne(serviceParams);

        if (!serviceDoc) {
            return res.status(404).json({
                success: false,
                message: `Service ${serviceName} not found`
            });
        }

        // Construct response
        const stats = {
            rps: serviceDoc.metrics?.requestsPerMin || 0,
            p95Latency: serviceDoc.metrics?.p95Latency || 0,
            errorRate: serviceDoc.metrics?.errorRate || 0,
            avgLatency: serviceDoc.metrics?.avgLatency || 0,
            lastSeen: serviceDoc.lastSeen,
            health: serviceDoc.health,
            dependencies: [],
            endpoints: []
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching service details:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch service details',
            message: error.message
        });
    }
}

/**
 * Get daily network usage
 * GET /api/otel/metrics/daily-usage
 */
async function getDailyNetworkUsage(req, res) {
    try {
        const { service } = req.query;

        const usage = await otelQueryService.getDailyNetworkUsage(service);

        res.json({
            success: true,
            data: usage
        });
    } catch (error) {
        logger.error('Error fetching daily network usage:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch daily network usage',
            message: error.message
        });
    }
}

module.exports = {
    getLatestMetrics,
    getMetricTimeSeries,
    getServices,
    getTraces,
    getTraceDetails,
    getServiceTopology,
    getServiceDetails,
    getDailyNetworkUsage
};
