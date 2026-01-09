import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getServiceTraces } from '../../services/apmService';
import { useSocket } from '../../context/SocketContext';
import StatusBadge from '../../components/shared/StatusBadge';
import TimeRangeSelector from '../../components/shared/TimeRangeSelector';

const TraceExplorer = () => {
    const navigate = useNavigate();
    const { serviceId } = useParams();
    const socket = useSocket(); // Get socket from context
    const [timeRange, setTimeRange] = useState('1h');
    const [serviceFilter, setServiceFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [traces, setTraces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch traces from API
    useEffect(() => {
        const fetchTraces = async () => {
            if (!serviceId) {
                console.log('⏳ No service ID provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                console.log('🔍 Fetching traces for service ID:', serviceId);

                // Calculate time range
                const now = new Date();
                const hoursMap = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };
                const hours = hoursMap[timeRange] || 24;
                const startTime = new Date(now - hours * 60 * 60 * 1000);

                // Build filters
                const filters = {
                    startTime: startTime.toISOString(),
                    endTime: now.toISOString(),
                    limit: 100
                };

                if (statusFilter === '2xx') {
                    filters.status = '2xx';
                } else if (statusFilter === '4xx') {
                    filters.status = '4xx';
                } else if (statusFilter === '5xx') {
                    filters.status = '5xx';
                }

                if (statusFilter === 'errors') {
                    filters.error = true;
                }

                console.log('📊 Filters:', filters);

                // Fetch traces for this service
                const traceData = await getServiceTraces(serviceId, filters);

                console.log('✅ Traces fetched:', {
                    count: traceData.traces?.length || 0,
                    total: traceData.total,
                    traces: traceData.traces
                });

                setTraces(traceData.traces || []);
            } catch (err) {
                console.error('❌ Error fetching traces:', err);
                setError('Failed to load traces: ' + err.message);
                setTraces([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTraces();
    }, [serviceId, timeRange, statusFilter]);

    // Listen for real-time trace updates
    useEffect(() => {
        if (!socket) {
            console.warn('⚠️ Socket not connected');
            return;
        }

        const handleNewTraces = (data) => {
            console.log('📡 Received new traces:', data);

            // Filter for current service
            const relevantTraces = data.traces.filter(t =>
                t.service_id?.toString() === serviceId
            );

            if (relevantTraces.length > 0) {
                console.log(`✅ Adding ${relevantTraces.length} new traces`);
                setTraces(prev => [...relevantTraces, ...prev]);
            }
        };

        socket.on('trace:new', handleNewTraces);
        console.log('👂 Listening for traces on service:', serviceId);

        return () => {
            socket.off('trace:new', handleNewTraces);
        };
    }, [socket, serviceId]);

    // Get unique services for filter
    const services = [...new Set(traces.map(t => t.service_name))];

    // Filter traces locally
    const filteredTraces = useMemo(() => {
        return traces.filter(trace => {
            const matchesService = serviceFilter === 'all' || trace.service_name === serviceFilter;
            const matchesSearch = searchTerm === '' ||
                trace.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trace.service_name.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesService && matchesSearch;
        });
    }, [traces, serviceFilter, searchTerm]);

    // Calculate stats
    const stats = {
        total: filteredTraces.length,
        errors: filteredTraces.filter(t => t.error || t.status_code >= 400).length,
        avgDuration: filteredTraces.length > 0
            ? Math.round(filteredTraces.reduce((sum, t) => sum + t.duration_ms, 0) / filteredTraces.length)
            : 0,
        slowTraces: filteredTraces.filter(t => t.duration_ms > 1000).length
    };

    // Extract method and path from endpoint
    const parseEndpoint = (endpoint) => {
        const parts = endpoint.split(' ');
        return {
            method: parts[0] || 'GET',
            path: parts.slice(1).join(' ') || endpoint
        };
    };

    if (loading) {
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
                <h2 className="text-2xl font-bold text-white">Trace Explorer</h2>
                <p className="text-text-secondary mt-1">Search and analyze distributed traces</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Total Traces</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5 border-l-4 border-l-red-500">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Errors</p>
                    <p className="text-2xl font-bold text-red-400">{stats.errors}</p>
                </div>
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Avg Duration</p>
                    <p className="text-2xl font-bold text-white">{stats.avgDuration}ms</p>
                </div>
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5 border-l-4 border-l-yellow-500">
                    <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Slow ({'>'} 1s)</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.slowTraces}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Time Range */}
                    <TimeRangeSelector selectedRange={timeRange} onRangeChange={setTimeRange} />

                    {/* Service Filter */}
                    <select
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        className="px-4 py-2 bg-bg-secondary/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                    >
                        <option value="all">All Services</option>
                        {services.map(service => (
                            <option key={service} value={service}>{service}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-bg-secondary/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                    >
                        <option value="all">All Status</option>
                        <option value="2xx">2xx Success</option>
                        <option value="4xx">4xx Client Error</option>
                        <option value="5xx">5xx Server Error</option>
                        <option value="errors">Errors Only</option>
                    </select>

                    {/* Search */}
                    <div className="relative">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"></i>
                        <input
                            type="text"
                            placeholder="Search traces..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-2 bg-bg-secondary/50 border border-white/10 rounded-lg text-white placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
                        />
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
                                <th className="p-4 text-left font-medium">Endpoint</th>
                                <th className="p-4 text-right font-medium">Duration</th>
                                <th className="p-4 text-center font-medium">Status</th>
                                <th className="p-4 text-left font-medium">Trace ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTraces.map((trace) => {
                                const { method, path } = parseEndpoint(trace.endpoint);
                                return (
                                    <tr
                                        key={trace._id || trace.trace_id}
                                        onClick={() => navigate(`/traces/${trace.trace_id}/details`)}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                        <td className="p-4 text-sm text-text-secondary">
                                            {new Date(trace.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                {trace.service_name}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${method === 'GET' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                    method === 'POST' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                        method === 'PUT' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                            'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}>
                                                    {method}
                                                </span>
                                                <span className="font-mono text-sm text-white group-hover:text-accent transition-colors">
                                                    {path}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`font-bold ${trace.duration_ms > 1000 ? 'text-red-400' :
                                                trace.duration_ms > 500 ? 'text-yellow-400' :
                                                    'text-green-400'
                                                }`}>
                                                {trace.duration_ms}ms
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <StatusBadge status={trace.status_code} />
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-xs text-text-secondary">
                                                {trace.trace_id.substring(0, 8)}...
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredTraces.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <i className="fas fa-search text-4xl text-text-secondary mb-3 opacity-30"></i>
                        <p className="text-text-secondary">
                            {serviceId ? 'No traces found for this service' : 'No service selected'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TraceExplorer;
