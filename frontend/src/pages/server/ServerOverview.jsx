import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import otelService from '../../services/otelService';

const ServerOverview = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [agent, setAgent] = useState(location.state?.agent || null);
    const [metrics, setMetrics] = useState(null);
    const [formattedMetrics, setFormattedMetrics] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Network usage tracking
    const [dailyNetworkUsage, setDailyNetworkUsage] = useState({ rx: 0, tx: 0, date: new Date().toDateString() });

    // Fetch OTel metrics from API
    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await otelService.getLatestMetrics();
                if (response.success) {
                    const formatted = otelService.formatMetricsForDisplay(response.metrics);
                    setFormattedMetrics(formatted);
                    setMetrics(response.metrics);
                    setLastUpdate(new Date());
                    setLoading(false);

                    // Update history
                    setHistory(prev => {
                        const newHistory = [...prev, {
                            time: new Date().toLocaleTimeString(),
                            cpu: formatted.cpu.usage,
                            memory: formatted.memory.usage
                        }];
                        return newHistory.slice(-20);
                    });

                    // Update daily network usage
                    const dailyUsage = await otelService.getDailyNetworkUsage();
                    setDailyNetworkUsage(dailyUsage);
                }
            } catch (error) {
                console.error('Error fetching OTel metrics:', error);
                setLoading(false);
            }
        };

        // Fetch immediately
        fetchMetrics();

        // Poll every 5 seconds
        const interval = setInterval(fetchMetrics, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleDiskClick = (mountPoint) => {
        navigate(`/server/${id}/files`, {
            state: {
                agent: agent,
                selectedDisk: mountPoint
            }
        });
    };

    if (loading && !formattedMetrics) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary">Loading telemetry data...</p>
            </div>
        );
    }

    if (!formattedMetrics) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <i className="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                <p className="text-white text-lg mb-2">No metrics available</p>
                <p className="text-text-secondary">The agent hasn't sent any data yet</p>
            </div>
        );
    }

    return (
        <div>
            {/* Real-time update indicator */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-text-secondary text-sm">
                        Live • Updated {lastUpdate?.toLocaleTimeString()}
                    </span>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* CPU Card */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 border-l-4 border-l-accent hover:border-l-accent/80 transition-all">
                    <h3 className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">CPU Usage</h3>
                    <p className="text-3xl font-bold text-white">{formattedMetrics.cpu.usage.toFixed(1)}%</p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                            className="bg-accent h-full rounded-full transition-all duration-500"
                            style={{ width: `${formattedMetrics.cpu.usage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Memory Card */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 border-l-4 border-l-purple-500 hover:border-l-purple-400 transition-all">
                    <h3 className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Memory</h3>
                    <p className="text-3xl font-bold text-white">{formattedMetrics.memory.usage.toFixed(1)}%</p>
                    <p className="text-xs text-text-secondary mt-1">
                        {(formattedMetrics.memory.used / 1024 / 1024 / 1024).toFixed(1)} GB / {(formattedMetrics.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB
                    </p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                            className="bg-purple-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${formattedMetrics.memory.usage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Network RX (Download) Card */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 border-l-4 border-l-green-500 hover:border-l-green-400 transition-all">
                    <h3 className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <i className="fas fa-arrow-down text-green-400"></i> Download
                    </h3>
                    {(() => {
                        const networks = Object.values(formattedMetrics.network);
                        const totalRx = networks.reduce((sum, net) => sum + (net.rx_sec || 0), 0);
                        const formatSpeed = (bytesPerSec) => {
                            const kbps = bytesPerSec / 1024;
                            return kbps >= 1024
                                ? `${(kbps / 1024).toFixed(2)} MB/s`
                                : `${kbps.toFixed(2)} KB/s`;
                        };
                        const formatBytes = (bytes) => {
                            if (bytes >= 1024 * 1024 * 1024) {
                                return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
                            } else if (bytes >= 1024 * 1024) {
                                return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
                            } else {
                                return `${(bytes / 1024).toFixed(2)} KB`;
                            }
                        };
                        return (
                            <>
                                <p className="text-3xl font-bold text-white mb-1">{formatSpeed(totalRx)}</p>
                                <p className="text-xs text-text-secondary">
                                    Today: {formatBytes(dailyNetworkUsage.rx)}
                                </p>
                            </>
                        );
                    })()}
                </div>

                {/* Network TX (Upload) Card */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 border-l-4 border-l-blue-500 hover:border-l-blue-400 transition-all">
                    <h3 className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <i className="fas fa-arrow-up text-blue-400"></i> Upload
                    </h3>
                    {(() => {
                        const networks = Object.values(formattedMetrics.network);
                        const totalTx = networks.reduce((sum, net) => sum + (net.tx_sec || 0), 0);
                        const formatSpeed = (bytesPerSec) => {
                            const kbps = bytesPerSec / 1024;
                            return kbps >= 1024
                                ? `${(kbps / 1024).toFixed(2)} MB/s`
                                : `${kbps.toFixed(2)} KB/s`;
                        };
                        const formatBytes = (bytes) => {
                            if (bytes >= 1024 * 1024 * 1024) {
                                return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
                            } else if (bytes >= 1024 * 1024) {
                                return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
                            } else {
                                return `${(bytes / 1024).toFixed(2)} KB`;
                            }
                        };
                        return (
                            <>
                                <p className="text-3xl font-bold text-white mb-1">{formatSpeed(totalTx)}</p>
                                <p className="text-xs text-text-secondary">
                                    Today: {formatBytes(dailyNetworkUsage.tx)}
                                </p>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Disk Usage Section */}
            {formattedMetrics.disk.length > 0 && (
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 mb-8">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-hdd text-blue-400"></i> Disk Usage
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {formattedMetrics.disk.map((disk, idx) => (
                            <div
                                key={idx}
                                className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                onClick={() => handleDiskClick(disk.mount)}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-mono text-sm text-white">{disk.mount}</span>
                                    <span className="text-xs text-text-secondary">{disk.device}</span>
                                </div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-2xl font-bold text-white">{disk.usage.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${disk.usage > 90 ? 'bg-red-500' :
                                            disk.usage > 70 ? 'bg-yellow-500' :
                                                'bg-blue-500'
                                            }`}
                                        style={{ width: `${disk.usage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Network I/O Section */}
            {Object.keys(formattedMetrics.network).length > 0 && (
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 mb-8">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-network-wired text-green-400"></i> Network I/O
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.values(formattedMetrics.network).map((net, idx) => (
                            <div key={idx} className="bg-white/5 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-mono text-sm text-white">{net.device}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-text-secondary flex items-center gap-2">
                                            <i className="fas fa-arrow-down text-green-400"></i> RX
                                        </span>
                                        <span className="text-sm font-bold text-white">
                                            {(net.rx / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-text-secondary flex items-center gap-2">
                                            <i className="fas fa-arrow-up text-blue-400"></i> TX
                                        </span>
                                        <span className="text-sm font-bold text-white">
                                            {(net.tx / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-6">CPU History</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-6">Memory History</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="memory" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Docker Containers */}
            <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <i className="fab fa-docker text-blue-400"></i> Docker Containers
                    </h3>
                </div>

                {formattedMetrics.docker.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-text-secondary text-xs uppercase tracking-wider border-b border-white/10">
                                    <th className="p-4 font-medium">Name</th>
                                    <th className="p-4 font-medium">State</th>
                                    <th className="p-4 font-medium">CPU</th>
                                    <th className="p-4 font-medium">Memory</th>
                                    <th className="p-4 font-medium">ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formattedMetrics.docker.map(container => (
                                    <tr key={container.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-medium text-white">{container.name}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${container.state === 'running'
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}>
                                                {container.state}
                                            </span>
                                        </td>
                                        <td className="p-4 text-white font-mono">{container.cpu.toFixed(2)}%</td>
                                        <td className="p-4 text-white font-mono">
                                            {(container.memory / 1024 / 1024).toFixed(0)} MB
                                        </td>
                                        <td className="p-4 text-text-secondary font-mono text-xs">
                                            {container.id.substring(0, 12)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-text-secondary">
                        <i className="fas fa-box-open text-4xl mb-3 opacity-30"></i>
                        <p>No containers found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServerOverview;
