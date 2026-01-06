const cron = require('node-cron');
const alertService = require('../services/alertService');
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

module.exports = { scheduleAlertCleanup };
