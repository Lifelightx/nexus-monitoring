import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import otelService from '../../services/otelService';

const ServerMetrics = () => {
    const { agent } = useOutletContext();
    const [timeRange, setTimeRange] = useState('1h');
    const [metrics, setMetrics] = useState({
        cpu: [],
        memory: [],
        disk: [],
        network: []
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    useEffect(() => {
        const fetchTimeSeries = async () => {
            try {
                setLoading(true);

                // Calculate time range
                const now = new Date();
                const hoursMap = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };
                const hours = hoursMap[timeRange] || 1;
                const startTime = new Date(now - hours * 60 * 60 * 1000).toISOString();
                const endTime = now.toISOString();
                const step = hours > 24 ? '1h' : '5m';

                // Fetch time-series data
                const [cpuData, memoryData, diskData, networkData] = await Promise.all([
                    otelService.getMetricTimeSeries('system_cpu_usage_percent', {
                        startTime,
                        endTime,
                        step
                    }),
                    otelService.getMetricTimeSeries('system_memory_usage_percent', {
                        startTime,
                        endTime,
                        step
                    }),
                    otelService.getMetricTimeSeries('system_filesystem_usage_percent', {
                        startTime,
                        endTime,
                        step
                    }),
                    otelService.getMetricTimeSeries('system_network_io_bytes', {
                        startTime,
                        endTime,
                        step
                    })
                ]);

                // Format data for charts
                const formatTimeSeries = (data) => {
                    if (!data.success || !data.data || data.data.length === 0) return [];

                    const series = data.data[0]; // Get first metric series
                    if (!series || !series.values) return [];

                    return series.values.map(v => ({
                        time: new Date(v.timestamp).toLocaleTimeString(),
                        value: v.value
                    }));
                };

                setMetrics({
                    cpu: formatTimeSeries(cpuData),
                    memory: formatTimeSeries(memoryData),
                    disk: formatTimeSeries(diskData),
                    network: formatTimeSeries(networkData)
                });

                setLastUpdate(new Date());
                setLoading(false);
            } catch (error) {
                console.error('Error fetching time-series metrics:', error);
                setLoading(false);
            }
        };

        fetchTimeSeries();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchTimeSeries, 30000);
        return () => clearInterval(interval);
    }, [timeRange]);

    if (loading && metrics.cpu.length === 0) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-text-secondary animate-pulse">Loading time-series data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Metrics Dashboard</h2>
                    <p className="text-text-secondary text-sm mt-1">Historical performance data and trends</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Updated {lastUpdate?.toLocaleTimeString()}
                    </div>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-4 py-2 bg-bg-secondary/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                    >
                        <option value="1h">Last Hour</option>
                        <option value="6h">Last 6 Hours</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                    </select>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CPU Usage Chart */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-microchip text-accent"></i>
                        CPU Usage Over Time
                    </h3>
                    {metrics.cpu.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={metrics.cpu}>
                                <defs>
                                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="time"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    domain={[0, 100]}
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #ffffff10',
                                        borderRadius: '8px'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#38bdf8"
                                    fill="url(#cpuGradient)"
                                    strokeWidth={2}
                                    name="CPU %"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-text-secondary">
                            No CPU data available for this time range
                        </div>
                    )}
                </div>

                {/* Memory Usage Chart */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-memory text-purple-400"></i>
                        Memory Usage Over Time
                    </h3>
                    {metrics.memory.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={metrics.memory}>
                                <defs>
                                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="time"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    domain={[0, 100]}
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #ffffff10',
                                        borderRadius: '8px'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#a855f7"
                                    fill="url(#memGradient)"
                                    strokeWidth={2}
                                    name="Memory %"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-text-secondary">
                            No memory data available for this time range
                        </div>
                    )}
                </div>

                {/* Disk Usage Chart */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-hdd text-blue-400"></i>
                        Disk Usage Over Time
                    </h3>
                    {metrics.disk.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={metrics.disk}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="time"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    domain={[0, 100]}
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #ffffff10',
                                        borderRadius: '8px'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Disk %"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-text-secondary">
                            No disk data available for this time range
                        </div>
                    )}
                </div>

                {/* Network I/O Chart */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-network-wired text-green-400"></i>
                        Network I/O Over Time
                    </h3>
                    {metrics.network.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={metrics.network}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis
                                    dataKey="time"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #ffffff10',
                                        borderRadius: '8px'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Network (bytes)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-text-secondary">
                            No network data available for this time range
                        </div>
                    )}
                </div>
            </div>

            {/* Auto-refresh indicator */}
            <div className="text-center text-text-secondary text-sm">
                <i className="fas fa-sync-alt mr-2"></i>
                Auto-refreshing every 30 seconds
            </div>
        </div>
    );
};

export default ServerMetrics;
