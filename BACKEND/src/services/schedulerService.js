const cron = require('node-cron');
const alertService = require('../services/alertService');
const { startMetricsAggregation } = require('../services/metricsAggregationService');
const Service = require('../models/Service');
const logger = require('../utils/logger');

/**
 * Schedule automatic cleanup of old alerts
 * Runs every hour to delete alerts older than 1 hour
 */
function scheduleAlertCleanup() {
    // Run every hour (at minute 0)
    cron.schedule('0 * * * *', async () => {
        try {
            logger.info('Running scheduled alert cleanup...');

            // Delete alerts older than 1 hour (convert to days: 1/24)
            const hoursToKeep = 1;
            const daysToKeep = hoursToKeep / 24;

            const result = await alertService.cleanupOldAlerts(daysToKeep);

            logger.info(`Alert cleanup completed. Deleted ${result.deletedCount} old alerts.`);
        } catch (error) {
            logger.error('Error during scheduled alert cleanup:', error);
        }
    });

    logger.info('Alert auto-cleanup scheduler initialized (runs every hour)');
}

/**
 * Schedule service status updates
 * Runs every minute to mark inactive services as stopped
 */
function scheduleServiceStatusUpdate() {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            // Mark services as stopped if no activity for 5 minutes
            const inactiveThreshold = new Date(Date.now() - 5 * 60 * 1000);

            const result = await Service.updateMany(
                {
                    status: 'running',
                    lastSeen: { $lt: inactiveThreshold }
                },
                {
                    $set: { status: 'stopped' }
                }
            );

            if (result.modifiedCount > 0) {
                logger.info(`Service status update: Marked ${result.modifiedCount} services as stopped`);
            }

            // Mark services as running if they've sent recent traces
            const activeThreshold = new Date(Date.now() - 2 * 60 * 1000);

            const activeResult = await Service.updateMany(
                {
                    status: 'stopped',
                    lastSeen: { $gte: activeThreshold }
                },
                {
                    $set: { status: 'running' }
                }
            );

            if (activeResult.modifiedCount > 0) {
                logger.info(`Service status update: Marked ${activeResult.modifiedCount} services as running`);
            }
        } catch (error) {
            logger.error('Error during service status update:', error);
        }
    });

    logger.info('Service status updater initialized (runs every minute)');
}

/**
 * Initialize all schedulers
 */
function initializeSchedulers() {
    scheduleAlertCleanup();
    scheduleServiceStatusUpdate();
    startMetricsAggregation();
    logger.info('All schedulers initialized');
}

module.exports = { scheduleAlertCleanup, scheduleServiceStatusUpdate, initializeSchedulers };
