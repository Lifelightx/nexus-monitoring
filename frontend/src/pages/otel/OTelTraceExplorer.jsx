import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTraces, getServices } from '../../services/otelService';

const OTelTraceExplorer = () => {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState('all');
    const [timeRange, setTimeRange] = useState('1h');
    const [traces, setTraces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch services
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

    // Fetch traces
    useEffect(() => {
        const fetchTraces = async () => {
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

                const response = await getTraces({
                    serviceName,
                    startTime,
                    endTime,
                    limit: 100
                });

                if (response.success) {
                    setTraces(response.data);
                } else {
                    setError('Failed to fetch traces');
                }
            } catch (err) {
                console.error('Error fetching traces:', err);
                setError('Failed to load traces: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTraces();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchTraces, 30000);
        return () => clearInterval(interval);
    }, [selectedService, timeRange]);

    // Calculate stats
    const stats = {
        total: traces.length,
        avgDuration: traces.length > 0
            ? Math.round(traces.reduce((sum, t) => sum + (t.TotalDurationMs || 0), 0) / traces.length)
            : 0,
        slowTraces: traces.filter(t => (t.TotalDurationMs || 0) > 1000).length
    };

    if (loading && traces.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                <p className="ml-4 text-text-secondary">Loading traces...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">OpenTelemetry Traces</h2>
                <p className="text-text-secondary mt-1">Search and analyze distributed traces</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Total Traces</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Avg Duration</p>
                    <p className="text-2xl font-bold text-white">{stats.avgDuration}ms</p>
                </div>
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5 border-l-4 border-l-yellow-500">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Slow (&gt; 1s)</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.slowTraces}</p>
                </div>
            </div>

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

            {/* Traces Table */}
            <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-text-secondary text-xs uppercase tracking-wider border-b border-white/10">
                                <th className="p-4 text-left font-medium">Time</th>
                                <th className="p-4 text-left font-medium">Service</th>
                                <th className="p-4 text-left font-medium">Span Name</th>
                                <th className="p-4 text-right font-medium">Duration</th>
                                <th className="p-4 text-center font-medium">Spans</th>
                                <th className="p-4 text-left font-medium">Trace ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {traces.map((trace) => (
                                <tr
                                    key={trace.TraceId}
                                    onClick={() => navigate(`/otel/traces/${trace.TraceId}`)}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4 text-sm text-text-secondary">
                                        {new Date(trace.StartTime).toLocaleTimeString()}
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            {trace.ServiceName}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-mono text-sm text-white group-hover:text-accent transition-colors">
                                            {trace.SpanName}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`font-bold ${(trace.TotalDurationMs || 0) > 1000 ? 'text-red-400' :
                                                (trace.TotalDurationMs || 0) > 500 ? 'text-yellow-400' :
                                                    'text-green-400'
                                            }`}>
                                            {Math.round(trace.TotalDurationMs || 0)}ms
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="text-text-secondary">{trace.SpanCount}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-mono text-xs text-text-secondary">
                                            {trace.TraceId.substring(0, 16)}...
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {traces.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <i className="fas fa-search text-4xl text-text-secondary mb-3 opacity-30"></i>
                        <p className="text-text-secondary">No traces found</p>
                    </div>
                )}
            </div>

            {/* Auto-refresh indicator */}
            <div className="mt-4 text-center text-text-secondary text-sm">
                <i className="fas fa-sync-alt mr-2"></i>
                Auto-refreshing every 30 seconds
            </div>
        </div>
    );
};

export default OTelTraceExplorer;
