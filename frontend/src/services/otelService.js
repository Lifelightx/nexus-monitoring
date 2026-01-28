import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * OTel Service
 * Centralized service for fetching OpenTelemetry metrics
 */

class OTelService {
    /**
     * Get latest metrics for all systems
     */
    async getLatestMetrics(service = null) {
        try {
            const params = service ? { service } : {};
            const response = await axios.get(`${API_BASE_URL}/api/otel/metrics/latest`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching latest metrics:', error);
            throw error;
        }
    }

    /**
     * Get metric time series
     */
    async getMetricTimeSeries(metricName, options = {}) {
        try {
            const params = {
                metricName,
                ...options
            };
            const response = await axios.get(`${API_BASE_URL}/api/otel/metrics/timeseries`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching metric timeseries:', error);
            throw error;
        }
    }

    /**
     * Get list of services
     */
    async getServices() {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/otel/services`);
            return response.data;
        } catch (error) {
            console.error('Error fetching services:', error);
            throw error;
        }
    }

    /**
     * Get daily network usage
     */
    async getDailyNetworkUsage(service) {
        try {
            const params = service ? { service } : {};
            const response = await axios.get(`${API_BASE_URL}/api/otel/metrics/daily-usage`, { params });
            if (response.data.success) {
                return response.data.data;
            }
            return { rx: 0, tx: 0 };
        } catch (error) {
            console.error('Error fetching daily network usage:', error);
            return { rx: 0, tx: 0 };
        }
    }

    /**
     * Format metrics for display
     */
    formatMetricsForDisplay(metrics) {
        if (!metrics) return null;

        // Extract values from arrays
        const getValue = (metricArray) => metricArray?.[0]?.value || 0;
        const getLabels = (metricArray) => metricArray?.[0]?.labels || {};

        return {
            cpu: {
                usage: getValue(metrics.system_cpu_usage_percent)
            },
            memory: {
                usage: getValue(metrics.system_memory_usage_percent),
                used: getValue(metrics.system_memory_used_bytes),
                total: getValue(metrics.system_memory_total_bytes)
            },
            disk: (metrics.system_filesystem_usage_percent || []).map(disk => ({
                mount: disk.labels.mountpoint || disk.labels.device,
                device: disk.labels.device,
                usage: disk.value,
                // Calculate sizes if available
                used: 0,
                total: 0
            })),
            network: (() => {
                const networkIO = metrics.system_network_io_bytes || [];
                const networkSpeed = metrics.system_network_speed_bytes_per_second || [];

                const devices = {};

                // Process cumulative bytes
                networkIO.forEach(net => {
                    const device = net.labels.device;
                    const direction = net.labels.direction;

                    if (!devices[device]) {
                        devices[device] = { device, rx: 0, tx: 0, rx_sec: 0, tx_sec: 0 };
                    }

                    if (direction === 'receive') {
                        devices[device].rx = net.value;
                    } else if (direction === 'transmit') {
                        devices[device].tx = net.value;
                    }
                });

                // Process speed data
                networkSpeed.forEach(net => {
                    const device = net.labels.device;
                    const direction = net.labels.direction;

                    if (!devices[device]) {
                        devices[device] = { device, rx: 0, tx: 0, rx_sec: 0, tx_sec: 0 };
                    }

                    if (direction === 'receive') {
                        devices[device].rx_sec = net.value;
                    } else if (direction === 'transmit') {
                        devices[device].tx_sec = net.value;
                    }
                });

                return devices;
            })(),
            docker: (metrics.docker_container_cpu_usage_percent || []).map((container, idx) => {
                const memMetric = metrics.docker_container_memory_usage_bytes?.[idx];
                return {
                    id: container.labels.container_id,
                    name: container.labels.container_name,
                    image: container.labels.container_image,
                    state: container.labels.container_state,
                    cpu: container.value,
                    memory: memMetric?.value || 0
                };
            })
        };
    }
}

export default new OTelService();

const otelServiceInstance = new OTelService();

// Named exports for compatibility with other pages
export const getLatestMetrics = (service) => otelServiceInstance.getLatestMetrics(service);
export const getMetricTimeSeries = (metricName, options) => otelServiceInstance.getMetricTimeSeries(metricName, options);
export const getServices = () => otelServiceInstance.getServices();
export const getTraces = () => Promise.resolve({ success: true, data: [] });
export const getTraceDetails = (traceId) => Promise.resolve({ success: true, data: { traceId, spans: [] } });
export const getDailyNetworkUsage = (service) => otelServiceInstance.getDailyNetworkUsage(service);
export const formatMetricsForDisplay = (metrics) => otelServiceInstance.formatMetricsForDisplay(metrics);
