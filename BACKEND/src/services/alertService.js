const Alert = require('../models/Alert');
const AlertSettings = require('../models/AlertSettings');
const emailService = require('./emailService');

class AlertService {
    /**
     * Detect and create alerts based on metric changes
     * @param {Object} previousMetric - Previous metric snapshot
     * @param {Object} currentMetric - Current metric snapshot
     * @param {Object} agent - Agent object
     * @returns {Array} - Array of created alerts
     */
    async detectAlerts(previousMetric, currentMetric, agent) {
        const alerts = [];
        const settings = await AlertSettings.getSettings();

        // Skip if no previous metric (first run)
        if (!previousMetric) {
            return alerts;
        }

        // Detect container state changes
        if (settings.enabledAlerts.containerStopped || settings.enabledAlerts.containerError) {
            const containerAlerts = this.detectContainerAlerts(
                previousMetric.dockerDetails?.containers || [],
                currentMetric.dockerDetails?.containers || [],
                agent,
                settings
            );
            alerts.push(...containerAlerts);
        }

        // Detect resource threshold breaches
        if (settings.enabledAlerts.highCpu) {
            const cpuAlert = this.detectCpuAlert(currentMetric, agent, settings);
            if (cpuAlert) alerts.push(cpuAlert);
        }

        if (settings.enabledAlerts.highMemory) {
            const memoryAlert = this.detectMemoryAlert(currentMetric, agent, settings);
            if (memoryAlert) alerts.push(memoryAlert);
        }

        if (settings.enabledAlerts.highDisk) {
            const diskAlert = this.detectDiskAlert(currentMetric, agent, settings);
            if (diskAlert) alerts.push(diskAlert);
        }


        // Save alerts to database (with deduplication)
        if (alerts.length > 0) {
            // Filter out duplicate alerts based on deduplication window
            const deduplicatedAlerts = await this.deduplicateAlerts(alerts, settings.alertDeduplicationWindow);

            if (deduplicatedAlerts.length === 0) {
                return []; // All alerts were duplicates, skip logging
            }

            const savedAlerts = await Alert.insertMany(deduplicatedAlerts);

            // Send email notifications if enabled
            if (settings.emailEnabled && settings.recipientEmails.length > 0) {
                try {
                    emailService.configure(settings);
                    for (const alert of savedAlerts) {
                        await emailService.sendAlert(alert, settings.recipientEmails, agent.name);
                    }
                } catch (error) {
                    console.error('Failed to send alert emails:', error);
                }
            }

            return savedAlerts;
        }

        return [];
    }

    /**
     * Generate a unique fingerprint for an alert
     */
    generateAlertFingerprint(alert) {
        // Create a unique identifier based on alert type, agent, and specific details
        const parts = [
            alert.type,
            alert.agent.toString(),
        ];

        // Add container-specific identifiers
        if (alert.containerId) {
            parts.push(alert.containerId);
        }

        // Add resource-specific identifiers
        if (alert.details?.mount) {
            parts.push(alert.details.mount);
        }

        return parts.join('::');
    }

    /**
     * Deduplicate alerts based on time window
     */
    async deduplicateAlerts(alerts, windowMinutes) {
        if (windowMinutes === 0) {
            return alerts; // Deduplication disabled
        }

        const deduplicatedAlerts = [];
        const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);

        for (const alert of alerts) {
            const fingerprint = this.generateAlertFingerprint(alert);

            // Check if a similar alert exists within the time window
            const recentAlert = await Alert.findOne({
                type: alert.type,
                agent: alert.agent,
                timestamp: { $gte: cutoffTime }
            }).lean();

            // Additional checks for container-specific alerts
            if (recentAlert && alert.containerId) {
                if (recentAlert.containerId !== alert.containerId) {
                    deduplicatedAlerts.push(alert);
                    continue;
                }
            }

            // Additional checks for disk-specific alerts
            if (recentAlert && alert.details?.mount) {
                if (recentAlert.details?.mount !== alert.details.mount) {
                    deduplicatedAlerts.push(alert);
                    continue;
                }
            }

            // If no recent alert found, add to list
            if (!recentAlert) {
                deduplicatedAlerts.push(alert);
            }
            // Otherwise, skip this alert (it's a duplicate)
        }

        return deduplicatedAlerts;
    }


    /**
     * Detect container state changes
     */
    detectContainerAlerts(previousContainers, currentContainers, agent, settings) {
        const alerts = [];

        // Create a map of previous container states
        const prevMap = new Map(previousContainers.map(c => [c.id, c]));

        for (const currentContainer of currentContainers) {
            const prevContainer = prevMap.get(currentContainer.id);

            if (!prevContainer) continue; // New container, skip

            // Container stopped unexpectedly
            if (settings.enabledAlerts.containerStopped &&
                prevContainer.state === 'running' &&
                currentContainer.state === 'exited') {

                alerts.push({
                    type: 'container_stopped',
                    severity: 'critical',
                    agent: agent._id,
                    containerId: currentContainer.id,
                    containerName: currentContainer.name,
                    message: `Container "${currentContainer.name}" stopped unexpectedly`,
                    details: {
                        exitCode: currentContainer.exitCode,
                        previousState: prevContainer.state,
                        currentState: currentContainer.state
                    }
                });
            }

            // Container exited with error
            if (settings.enabledAlerts.containerError &&
                currentContainer.state === 'exited' &&
                currentContainer.exitCode && currentContainer.exitCode !== 0) {

                alerts.push({
                    type: 'container_error',
                    severity: 'critical',
                    agent: agent._id,
                    containerId: currentContainer.id,
                    containerName: currentContainer.name,
                    message: `Container "${currentContainer.name}" exited with error code ${currentContainer.exitCode}`,
                    details: {
                        exitCode: currentContainer.exitCode,
                        image: currentContainer.image
                    }
                });
            }
        }

        return alerts;
    }

    /**
     * Detect high CPU usage
     */
    detectCpuAlert(metric, agent, settings) {
        const cpuUsage = metric.cpu;

        if (cpuUsage > settings.thresholds.cpu) {
            return {
                type: 'high_cpu',
                severity: cpuUsage > 95 ? 'critical' : 'warning',
                agent: agent._id,
                message: `High CPU usage detected: ${cpuUsage.toFixed(1)}%`,
                details: {
                    cpuUsage: cpuUsage,
                    threshold: settings.thresholds.cpu,
                    cores: metric.cpuCores
                }
            };
        }

        return null;
    }

    /**
     * Detect high memory usage
     */
    detectMemoryAlert(metric, agent, settings) {
        const memoryPercent = (metric.memory.used / metric.memory.total) * 100;

        if (memoryPercent > settings.thresholds.memory) {
            return {
                type: 'high_memory',
                severity: memoryPercent > 95 ? 'critical' : 'warning',
                agent: agent._id,
                message: `High memory usage detected: ${memoryPercent.toFixed(1)}%`,
                details: {
                    memoryPercent: memoryPercent,
                    threshold: settings.thresholds.memory,
                    used: metric.memory.used,
                    total: metric.memory.total
                }
            };
        }

        return null;
    }

    /**
     * Detect high disk usage
     */
    detectDiskAlert(metric, agent, settings) {
        if (!metric.disk || metric.disk.length === 0) return null;

        // Check each disk
        for (const disk of metric.disk) {
            const usedPercent = disk.use;

            if (usedPercent > settings.thresholds.disk) {
                return {
                    type: 'high_disk',
                    severity: usedPercent > 95 ? 'critical' : 'warning',
                    agent: agent._id,
                    message: `High disk usage detected on ${disk.mount}: ${usedPercent.toFixed(1)}%`,
                    details: {
                        diskPercent: usedPercent,
                        threshold: settings.thresholds.disk,
                        mount: disk.mount,
                        used: disk.used,
                        size: disk.size
                    }
                };
            }
        }

        return null;
    }

    /**
     * Create agent offline alert
     */
    async createAgentOfflineAlert(agent) {
        const settings = await AlertSettings.getSettings();

        if (!settings.enabledAlerts.agentOffline) {
            return null;
        }

        const alert = await Alert.create({
            type: 'agent_offline',
            severity: 'critical',
            agent: agent._id,
            message: `Agent "${agent.name}" is offline`,
            details: {
                lastSeen: agent.lastSeen,
                os: agent.os
            }
        });

        // Send email notification
        if (settings.emailEnabled && settings.recipientEmails.length > 0) {
            try {
                emailService.configure(settings);
                await emailService.sendAlert(alert, settings.recipientEmails, agent.name);
            } catch (error) {
                console.error('Failed to send agent offline email:', error);
            }
        }

        return alert;
    }

    /**
     * Get recent alerts
     */
    async getRecentAlerts(limit = 50, acknowledged = null) {
        const query = {};
        if (acknowledged !== null) {
            query.acknowledged = acknowledged;
        }

        return await Alert.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('agent', 'name os')
            .lean();
    }

    /**
     * Acknowledge alert
     */
    async acknowledgeAlert(alertId, userId) {
        return await Alert.findByIdAndUpdate(
            alertId,
            {
                acknowledged: true,
                acknowledgedBy: userId,
                acknowledgedAt: new Date()
            },
            { new: true }
        );
    }

    /**
     * Delete old alerts (cleanup)
     */
    async cleanupOldAlerts(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await Alert.deleteMany({
            timestamp: { $lt: cutoffDate }
        });

        console.log(`Cleaned up ${result.deletedCount} old alerts`);
        return result;
    }
}

module.exports = new AlertService();
