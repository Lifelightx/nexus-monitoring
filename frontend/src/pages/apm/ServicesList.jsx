import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, CheckCircle, AlertCircle, Circle, Play, TrendingUp, AlertTriangle, Clock, Zap, ChevronDown, ChevronRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ServicesList = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState({
        instrumented: true,
        instrumentable: true,
        container: true,
        system: false  // Collapsed by default
    });

    const isServerContext = !!id;

    useEffect(() => {
        fetchServices();
        const interval = setInterval(fetchServices, 30000);
        return () => clearInterval(interval);
    }, [id]);

    const fetchServices = async () => {
        try {
            const token = localStorage.getItem('token');
            // If in server context, fetch agent-specific services (Infrastructure)
            // If global context, fetch APM stats from ClickHouse
            const endpoint = isServerContext
                ? `${API_BASE_URL}/api/agents/${id}/services`
                : `${API_BASE_URL}/api/apm/services`;

            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (isServerContext) {
                setServices(response.data || []);
            } else {
                // APM Data is already formatted by controller: { name, rps, errorRate, p95Latency, ... }
                setServices(response.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch services:", error);
        } finally {
            setLoading(false);
        }
    };

    // Categorize services dynamically (Only relevant for Infrastructure view)
    // For APM view, we just show a flat list typically, or we can group by auto-discovered tags if needed.
    // For now, if APM view, we'll put everything in "Instrumented Services"
    const categorizedServices = isServerContext ? {
        instrumented: services.filter(s => s.instrumentable && s.hasActiveTraces),
        instrumentable: services.filter(s => s.instrumentable && !s.hasActiveTraces),
        container: services.filter(s => !s.instrumentable && s.containerId),
        system: services.filter(s => !s.instrumentable && !s.containerId)
    } : {
        instrumented: services, // All APM services
        instrumentable: [],
        container: [],
        system: []
    };

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const handleServiceClick = (service) => {
        if (isServerContext) {
            navigate(`/server/${id}/services/${service.name}`);
        } else {
            // navigate(`/apm/services/${service.name}`); 
            // User requested trace waterfall on click, but usually you go to service details first
            // We can navigate to trace explorer filtered by service
            navigate(`/apm/traces?service=${service.name}`);
        }
    };

    const handleTracesClick = (e, service) => {
        e.stopPropagation();
        if (isServerContext) {
            navigate(`/server/${id}/traces/${service.name}`);
        } else {
            navigate(`/apm/traces?service=${service.name}`);
        }
    };

    const renderServiceRow = (service, index) => (
        <tr
            key={index}
            onClick={() => handleServiceClick(service)}
            className="hover:bg-white/5 transition-colors cursor-pointer"
        >
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded text-blue-400">
                        <Activity size={16} />
                    </div>
                    <div>
                        <div className="font-semibold text-text-primary">{service.name}</div>
                        <div className="text-xs mt-0.5 text-text-secondary capitalize">{service.type || 'Service'}</div>
                    </div>
                </div>
            </td>

            {isServerContext ? (
                // --- INFRASTRUCTURE COLUMNS ---
                <>
                    <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${service.status === 'running'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                            }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {service.status || 'Running'}
                        </span>
                    </td>
                    <td className="p-4 text-center">
                        {/* CPU Usage (mocked or from metrics if available) */}
                        <span className="text-text-primary font-medium">
                            {service.cpu ? `${service.cpu.toFixed(1)}%` : '-'}
                        </span>
                    </td>
                    <td className="p-4 text-center">
                        {/* Memory Usage */}
                        <span className="text-text-primary font-medium">
                            {service.memory ? `${(service.memory / 1024 / 1024).toFixed(0)} MB` : '-'}
                        </span>
                    </td>
                    <td className="p-4 text-center">
                        <span className="text-sm text-text-secondary font-mono">{service.port || '-'}</span>
                    </td>
                </>
            ) : (
                // --- APM COLUMNS (Golden Signals) ---
                <>
                    <td className="p-4 text-center">
                        <span className="text-text-primary font-medium">
                            {service.rps}
                        </span>
                        <span className="text-xs text-text-secondary ml-1">req/s</span>
                    </td>
                    <td className="p-4 text-center">
                        <span className={`font-medium ${(parseFloat(service.errorRate) > 5)
                            ? 'text-red-400'
                            : 'text-green-400'
                            }`}>
                            {service.errorRate}%
                        </span>
                    </td>
                    <td className="p-4 text-center">
                        <span className="text-text-primary font-medium">
                            {service.p95Latency}
                        </span>
                        <span className="text-xs text-text-secondary ml-1">ms</span>
                    </td>
                    <td className="p-4 text-center">
                        <span className="text-text-primary font-medium">
                            {service.requestCount}
                        </span>
                        <span className="text-xs text-text-secondary ml-1">reqs</span>
                    </td>
                </>
            )}

            <td className="p-4">
                <div className="flex items-center justify-center gap-2">
                    {/* Actions differ by context */}
                    {isServerContext ? (
                        service.instrumentable && !service.hasActiveTraces ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Setup instrumentation for', service.name);
                                }}
                                className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded text-sm font-medium flex items-center gap-1.5 transition-colors"
                            >
                                <AlertCircle size={12} />
                                Setup
                            </button>
                        ) : (
                            <span className="text-xs text-text-secondary">Monitored</span>
                        )
                    ) : (
                        <button
                            onClick={(e) => handleTracesClick(e, service)}
                            className="px-3 py-1.5 bg-accent-color/10 hover:bg-accent-color/20 text-accent-color rounded text-sm font-medium flex items-center gap-1.5 transition-colors"
                        >
                            <Play size={12} />
                            Traces
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );

    const renderCategory = (title, icon, category, services, priority) => {
        if (services.length === 0) return null;

        const isExpanded = expandedCategories[category];
        const priorityColors = {
            high: 'text-green-400 border-green-400/30',
            medium: 'text-yellow-400 border-yellow-400/30',
            low: 'text-blue-400 border-blue-400/30'
        };

        // For APM View, use a single consistent style
        const headerClass = isServerContext
            ? `flex items-center justify-between p-4 bg-card-bg border ${priorityColors[priority]} rounded-t-lg cursor-pointer hover:bg-white/5 transition-colors`
            : `flex items-center justify-between p-4 bg-card-bg border border-white/10 rounded-t-lg cursor-pointer hover:bg-white/5 transition-colors`;

        return (
            <div className="mb-6">
                <div
                    onClick={() => toggleCategory(category)}
                    className={headerClass}
                >
                    <div className="flex items-center gap-3">
                        {isServerContext && <span className="text-2xl">{icon}</span>}
                        <h2 className="text-lg font-bold text-text-primary">
                            {title}
                            <span className="ml-2 text-sm font-normal text-text-secondary">({services.length})</span>
                        </h2>
                    </div>
                    {isExpanded ? <ChevronDown size={20} className="text-text-secondary" /> : <ChevronRight size={20} className="text-text-secondary" />}
                </div>

                {isExpanded && (
                    <div className="bg-card-bg border border-white/10 border-t-0 rounded-b-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="text-left p-4 text-sm font-semibold text-text-secondary">Service Name</th>

                                    {isServerContext ? (
                                        <>
                                            <th className="text-left p-4 text-sm font-semibold text-text-secondary">Status</th>
                                            <th className="text-center p-4 text-sm font-semibold text-text-secondary">CPU</th>
                                            <th className="text-center p-4 text-sm font-semibold text-text-secondary">Memory</th>
                                            <th className="text-center p-4 text-sm font-semibold text-text-secondary">Port</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="text-center p-4 text-sm font-semibold text-text-secondary">
                                                <div className="flex items-center justify-center gap-1"><TrendingUp size={14} /> RPS</div>
                                            </th>
                                            <th className="text-center p-4 text-sm font-semibold text-text-secondary">
                                                <div className="flex items-center justify-center gap-1"><AlertTriangle size={14} /> Error Rate</div>
                                            </th>
                                            <th className="text-center p-4 text-sm font-semibold text-text-secondary">
                                                <div className="flex items-center justify-center gap-1"><Clock size={14} /> P95 Latency</div>
                                            </th>
                                            <th className="text-center p-4 text-sm font-semibold text-text-secondary">
                                                <div className="flex items-center justify-center gap-1"><Activity size={14} /> Requests</div>
                                            </th>
                                        </>
                                    )}

                                    <th className="text-center p-4 text-sm font-semibold text-text-secondary">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {services.map((service, index) => renderServiceRow(service, index))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-6 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-2">
                <Activity className="text-accent-color" />
                {isServerContext ? 'Services & Processes' : 'Application Performance Monitoring'}
            </h1>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-color"></div>
                    <span className="ml-3 text-text-secondary">Loading services...</span>
                </div>
            ) : (
                <>
                    {renderCategory('Instrumented Services', '', 'instrumented', categorizedServices.instrumented, 'high')}
                    {renderCategory('Needs Instrumentation', '', 'instrumentable', categorizedServices.instrumentable, 'medium')}
                    {renderCategory('Container Services', '', 'container', categorizedServices.container, 'low')}
                    {renderCategory('System Processes', '', 'system', categorizedServices.system, 'low')}
                </>
            )}

            {services.length === 0 && !loading && (
                <div className="text-center py-20 bg-card-bg border border-white/10 rounded-lg">
                    <Activity size={48} className="mx-auto text-text-secondary mb-4 opacity-50" />
                    <h3 className="text-xl font-bold text-text-primary mb-2">No Services Found</h3>
                    <p className="text-text-secondary max-w-md mx-auto">
                        {isServerContext
                            ? 'No services detected on this server. Services will appear when applications with listening ports are running.'
                            : 'Waiting for traces... Ensure your applications are instrumented with OpenTelemetry and sending data to the collector.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ServicesList;
