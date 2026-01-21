const axios = require('axios');
const logger = require('../utils/logger');

/**
 * OpenTelemetry Service
 * Centralized service for querying VictoriaMetrics and ClickHouse
 */

const VICTORIA_METRICS_URL = process.env.VICTORIA_METRICS_URL || 'http://localhost:30428';

class OTelQueryService {
    /**
     * Query VictoriaMetrics
     */
    async queryVM(query, params = {}) {
        try {
            const response = await axios.get(`${VICTORIA_METRICS_URL}/api/v1/query`, {
                params: { query, ...params },
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            logger.error(`VM query failed: ${query}`, error.message);
            throw error;
        }
    }

    /**
     * Query VictoriaMetrics range
     */
    async queryVMRange(query, start, end, step = '60s') {
        try {
            const response = await axios.get(`${VICTORIA_METRICS_URL}/api/v1/query_range`, {
                params: { query, start, end, step },
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            logger.error(`VM range query failed: ${query}`, error.message);
            throw error;
        }
    }

    /**
     * Get all available metrics
     */
    async getAvailableMetrics() {
        try {
            const response = await axios.get(`${VICTORIA_METRICS_URL}/api/v1/label/__name__/values`, {
                timeout: 5000
            });
            return response.data.status === 'success' ? response.data.data : [];
        } catch (error) {
            logger.error('Failed to get available metrics:', error.message);
            return [];
        }
    }

    /**
     * Get latest system metrics
     */
    async getLatestSystemMetrics(service) {
        const metrics = {};
        const metricsToQuery = [
            'system_cpu_usage_percent',
            'system_memory_usage_percent',
            'system_memory_used_bytes',
            'system_memory_total_bytes',
            'system_filesystem_usage_percent',
            'system_network_io_bytes',
            'system_network_speed_bytes_per_second'
        ];

        for (const metricName of metricsToQuery) {
            try {
                const query = service
                    ? `${metricName}{service_name="${service}"}`
                    : metricName;

                const data = await this.queryVM(query);

                if (data.status === 'success' && data.data.result.length > 0) {
                    metrics[metricName] = data.data.result.map(r => ({
                        value: parseFloat(r.value[1]),
                        timestamp: r.value[0] * 1000,
                        labels: r.metric
                    }));
                }
            } catch (err) {
                logger.debug(`Metric ${metricName} not available`);
            }
        }

        return metrics;
    }

    /**
     * Get latest Docker metrics
     */
    async getLatestDockerMetrics(service) {
        const metrics = {};
        const dockerMetrics = [
            'docker_container_cpu_usage_percent',
            'docker_container_memory_usage_bytes',
            'docker_container_count_ratio'
        ];

        for (const metricName of dockerMetrics) {
            try {
                const query = service
                    ? `${metricName}{service_name="${service}"}`
                    : metricName;

                const data = await this.queryVM(query);

                if (data.status === 'success' && data.data.result.length > 0) {
                    metrics[metricName] = data.data.result.map(r => ({
                        value: parseFloat(r.value[1]),
                        timestamp: r.value[0] * 1000,
                        labels: r.metric
                    }));
                }
            } catch (err) {
                logger.debug(`Docker metric ${metricName} not available`);
            }
        }

        return metrics;
    }

    /**
     * Get metric time series
     */
    async getMetricTimeSeries(metricName, service, startTime, endTime, step = '60s') {
        const now = Math.floor(Date.now() / 1000);
        const start = startTime ? Math.floor(new Date(startTime).getTime() / 1000) : now - 3600;
        const end = endTime ? Math.floor(new Date(endTime).getTime() / 1000) : now;

        const query = service
            ? `${metricName}{service_name="${service}"}`
            : metricName;

        const data = await this.queryVMRange(query, start, end, step);

        if (data.status === 'success') {
            return data.data.result.map(r => ({
                metric: r.metric,
                values: r.values.map(v => ({
                    timestamp: v[0] * 1000,
                    value: parseFloat(v[1])
                }))
            }));
        }

        return [];
    }

    /**
     * Get services list
     */
    async getServices() {
        try {
            const response = await axios.get(`${VICTORIA_METRICS_URL}/api/v1/label/service_name/values`, {
                timeout: 5000
            });

            if (response.data.status === 'success') {
                return response.data.data.map(name => ({
                    name,
                    type: 'service'
                }));
            }
        } catch (error) {
            logger.error('Failed to fetch services:', error.message);
        }

        return [];
    }

    /**
     * Get daily network usage
     */
    async getDailyNetworkUsage(service) {
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const secondsSinceMidnight = Math.floor((now - midnight) / 1000);

        // Return 0 if it's just after midnight (prevent query errors or empty results)
        if (secondsSinceMidnight < 10) {
            return {
                date: now.toDateString(),
                rx: 0,
                tx: 0
            };
        }

        try {
            const queryPart = service ? `{service_name="${service}"}` : `{device!~"lo|docker.*|br-.*|veth.*|tun.*"}`;
            // Sum by direction (receive/transmit)
            const query = `sum by (direction) (increase(system_network_io_bytes${queryPart}[${secondsSinceMidnight}s]))`;

            const data = await this.queryVM(query);

            let rx = 0;
            let tx = 0;

            if (data.status === 'success' && data.data.result) {
                data.data.result.forEach(r => {
                    const dir = r.metric.direction;
                    const val = parseFloat(r.value[1]);
                    // Check for NaN or weird values
                    if (!isNaN(val)) {
                        if (dir === 'receive') rx += val;
                        if (dir === 'transmit') tx += val;
                    }
                });
            }

            return {
                date: now.toDateString(),
                rx,
                tx
            };
        } catch (error) {
            logger.error('Failed to get daily network usage:', error.message);
            return {
                date: now.toDateString(),
                rx: 0,
                tx: 0,
                error: error.message
            };
        }
    }
}

module.exports = new OTelQueryService();
