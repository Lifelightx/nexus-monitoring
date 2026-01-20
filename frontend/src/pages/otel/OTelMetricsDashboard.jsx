import React, { useState, useEffect } from 'react';
import { getLatestMetrics, getMetricTimeSeries, getServices } from '../../services/otelService';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const OTelMetricsDashboard = () => {
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState('all');
    const [timeRange, setTimeRange] = useState('1h');
    const [metrics, setMetrics] = useState({
        cpu: [],
        memory: [],
        disk: [],
        network: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch services on mount
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const response = await getServices();
                if (response.success) {
                    setServices(response.data);
                }
            } catch (err) {
                console.error('Error fetching services:', err);
            }
        };
        fetchServices();
    }, []);

    // Fetch metrics
    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);
                setError(null);

                // Calculate time range
                const now = new Date();
                const hoursMap = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };
                const hours = hoursMap[timeRange] || 1;
                const startTime = new Date(now - hours * 60 * 60 * 1000).toISOString();
                const endTime = now.toISOString();

                const serviceName = selectedService === 'all' ? null : selectedService;

                // Fetch CPU metrics
                const cpuData = await getMetricTimeSeries({
                    metricName: 'system.cpu.usage',
                    serviceName,
                    startTime,
                    endTime,
                    interval: hours > 24 ? '1h' : '1m'
                });

                // Fetch Memory metrics
                const memoryData = await getMetricTimeSeries({
                    metricName: 'system.memory.usage',
                    serviceName,
                    startTime,
                    endTime,
                    interval: hours > 24 ? '1h' : '1m'
                });

                // Fetch Disk metrics
                const diskData = await getMetricTimeSeries({
                    metricName: 'system.filesystem.usage',
                    serviceName,
                    startTime,
                    endTime,
                    interval: hours > 24 ? '1h' : '1m'
                });

                // Fetch Network metrics
                const networkData = await getMetricTimeSeries({
                    metricName: 'system.network.io',
                    serviceName,
                    startTime,
                    endTime,
                    interval: hours > 24 ? '1h' : '1m'
                });

                setMetrics({
                    cpu: cpuData.success ? cpuData.data : [],
                    memory: memoryData.success ? memoryData.data : [],
                    disk: diskData.success ? diskData.data : [],
                    network: networkData.success ? networkData.data : []
                });
            } catch (err) {
                console.error('Error fetching metrics:', err);
                setError('Failed to load metrics: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchMetrics, 30000);
        return () => clearInterval(interval);
    }, [selectedService, timeRange]);

    // Format timestamp for charts
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading && metrics.cpu.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                <p className="ml-4 text-text-secondary">Loading metrics...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">OpenTelemetry Metrics</h2>
                <p className="text-text-secondary mt-1">Real-time system and application metrics</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Filters */}
            <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Service Filter */}
                    <div>
                        <label className="block text-text-secondary text-sm mb-2">Service</label>
                        <select
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="w-full px-4 py-2 bg-bg-secondary/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                        >
                            <option value="all">All Services</option>
                            {services.map((service) => (
                                <option key={service.service_name} value={service.service_name}>
                                    {service.service_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Time Range */}
                    <div>
                        <label className="block text-text-secondary text-sm mb-2">Time Range</label>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="w-full px-4 py-2 bg-bg-secondary/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                        >
                            <option value="1h">Last Hour</option>
                            <option value="6h">Last 6 Hours</option>
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Metrics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CPU Usage */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">CPU Usage</h3>
                    {metrics.cpu.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={metrics.cpu}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={formatTime}
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px'
                                    }}
                                    labelFormatter={formatTime}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={false}
                                    name="CPU %"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-text-secondary">
                            No CPU data available
                        </div>
                    )}
                </div>

                {/* Memory Usage */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Memory Usage</h3>
                    {metrics.memory.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={metrics.memory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={formatTime}
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px'
                                    }}
                                    labelFormatter={formatTime}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#10b981"
                                    fill="#10b98120"
                                    strokeWidth={2}
                                    name="Memory %"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-text-secondary">
                            No memory data available
                        </div>
                    )}
                </div>

                {/* Disk Usage */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Disk Usage</h3>
                    {metrics.disk.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={metrics.disk}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={formatTime}
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px'
                                    }}
                                    labelFormatter={formatTime}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Disk %"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-text-secondary">
                            No disk data available
                        </div>
                    )}
                </div>

                {/* Network I/O */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4">Network I/O</h3>
                    {metrics.network.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={metrics.network}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={formatTime}
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px'
                                    }}
                                    labelFormatter={formatTime}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    fill="#3b82f620"
                                    strokeWidth={2}
                                    name="Network (bytes)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-text-secondary">
                            No network data available
                        </div>
                    )}
                </div>
            </div>

            {/* Auto-refresh indicator */}
            <div className="mt-4 text-center text-text-secondary text-sm">
                <i className="fas fa-sync-alt mr-2"></i>
                Auto-refreshing every 30 seconds
            </div>
        </div>
    );
};

export default OTelMetricsDashboard;
