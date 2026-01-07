import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getServiceByName } from '../../mockData/services';
import { getTracesByService } from '../../mockData/traces';
import { getServiceDetails } from '../../services/apmService';
import HealthIndicator from '../../components/shared/HealthIndicator';
import MetricCard from '../../components/shared/MetricCard';
import StatusBadge from '../../components/shared/StatusBadge';

const ServiceDetails = () => {
    const { serviceName, id: hostId } = useParams(); // Get both service name and host ID
    const navigate = useNavigate();
    const [service, setService] = useState(null);
    const [processes, setProcesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch service details from API
    useEffect(() => {
        const fetchServiceDetails = async () => {
            if (!hostId || !serviceName) {
                console.log('⚠️ Missing hostId or serviceName');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                console.log('🔍 Fetching service details:', { hostId, serviceName });

                const data = await getServiceDetails(hostId, serviceName);
                console.log('✅ Service details fetched:', data);

                setService(data.service);
                setProcesses(data.processes || []);
            } catch (err) {
                console.error('❌ Error fetching service details:', err);
                setError('Failed to load service details');
                // Fallback to mock data
                const mockService = getServiceByName(serviceName);
                if (mockService) {
                    setService(mockService);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchServiceDetails();
    }, [hostId, serviceName]);

    const traces = getTracesByService(serviceName); // Still using mock traces for now

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                < div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" ></div >
                <p className="ml-4 text-text-secondary">Loading service details...</p>
            </div >
        );
    }

    // Not found state
    if (!service) {
        return (
            <div className="text-center py-12">
                <i className="fas fa-exclamation-triangle text-4xl text-yellow-400 mb-4"></i>
                <h3 className="text-xl font-bold text-white mb-2">Service Not Found</h3>
                <p className="text-text-secondary mb-6">The service "{serviceName}" could not be found.</p>
                <button
                    onClick={() => navigate(hostId ? `/server/${hostId}/services` : '/services')}
                    className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors"
                >
                    Back to Services
                </button>
            </div>
        );
    }

    const calculateTrend = (current, baseline) => {
        if (!baseline || baseline === 0) return null;
        return (((current - baseline) / baseline) * 100).toFixed(1);
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate(hostId ? `/server/${hostId}/services` : '/services')}
                    className="text-text-secondary hover:text-white transition-colors mb-4 flex items-center gap-2"
                >
                    <i className="fas fa-arrow-left"></i> Back to Services
                </button>

                {error && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                        ⚠️ {error} - Showing available data
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-sky-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                            <i className="fas fa-cube text-sky-400 text-2xl"></i>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{service.name}</h2>
                            <p className="text-text-secondary">
                                {service.type} • Port {service.port}
                                {service.containerName && ` • 📦 ${service.containerName}`}
                                {service.pid && ` • PID ${service.pid}`}
                            </p>
                        </div>
                    </div>
                    <HealthIndicator health={service.health || 'healthy'} size="lg" />
                </div>
            </div>

            {/* Service Metadata */}
            <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 mb-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <i className="fas fa-info-circle text-blue-400"></i>
                    Service Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Status</p>
                        <p className="text-white font-medium capitalize">{service.status || 'running'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Detected From</p>
                        <p className="text-white font-medium capitalize">{service.detectedFrom || 'host'}</p>
                    </div>
                    {service.containerId && (
                        <div>
                            <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Container ID</p>
                            <p className="text-white font-mono text-sm">{service.containerId.substring(0, 12)}</p>
                        </div>
                    )}
                    {service.command && (
                        <div className="md:col-span-2 lg:col-span-4">
                            <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Command</p>
                            <p className="text-white font-mono text-sm truncate">{service.command}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard
                    title="Requests/min"
                    value={service.metrics?.requestsPerMin || 0}
                    icon="fas fa-tachometer-alt"
                    color="accent"
                    trend={calculateTrend(service.metrics?.requestsPerMin || 0, service.baseline?.requestsPerMin)}
                    subtitle={service.metrics?.throughput ? `${service.metrics.throughput.toFixed(1)} req/s` : 'No data'}
                />
                <MetricCard
                    title="P95 Latency"
                    value={service.metrics?.p95Latency || 0}
                    unit="ms"
                    icon="fas fa-clock"
                    color={(service.metrics?.p95Latency || 0) > 800 ? 'red' : (service.metrics?.p95Latency || 0) > 500 ? 'yellow' : 'green'}
                    trend={calculateTrend(service.metrics?.p95Latency || 0, service.baseline?.p95Latency)}
                    subtitle={service.metrics?.p99Latency ? `P99: ${service.metrics.p99Latency}ms` : 'No data'}
                />
                <MetricCard
                    title="Error Rate"
                    value={service.metrics?.errorRate || 0}
                    unit="%"
                    icon="fas fa-exclamation-circle"
                    color={(service.metrics?.errorRate || 0) > 1 ? 'red' : (service.metrics?.errorRate || 0) > 0.5 ? 'yellow' : 'green'}
                    trend={service.baseline?.errorRate > 0 ? calculateTrend(service.metrics?.errorRate || 0, service.baseline.errorRate) : null}
                    subtitle={service.metrics?.availability ? `Availability: ${service.metrics.availability}%` : 'No data'}
                />
            </div>

            {/* Endpoints */}
            {service.endpoints && service.endpoints.length > 0 && (
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 mb-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-route text-purple-400"></i>
                        Endpoints
                    </h3>
                    <div className="space-y-2">
                        {service.endpoints.map((endpoint) => (
                            <div
                                key={endpoint.id}
                                onClick={() => navigate(hostId ? `/server/${hostId}/services/${serviceName}/endpoints/${endpoint.id}` : `/services/${serviceName}/endpoints/${endpoint.id}`)}
                                className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${endpoint.method === 'GET' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            endpoint.method === 'POST' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                endpoint.method === 'PUT' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                    endpoint.method === 'DELETE' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                        'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                            }`}>
                                            {endpoint.method}
                                        </span>
                                        <span className="font-mono text-white group-hover:text-accent transition-colors">{endpoint.path}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs text-text-secondary">P95</p>
                                            <p className={`font-bold ${endpoint.p95 > 800 ? 'text-red-400' :
                                                endpoint.p95 > 500 ? 'text-yellow-400' :
                                                    'text-green-400'
                                                }`}>
                                                {endpoint.p95}ms
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-text-secondary">Errors</p>
                                            <p className={`font-bold ${endpoint.errorRate > 1 ? 'text-red-400' :
                                                endpoint.errorRate > 0.5 ? 'text-yellow-400' :
                                                    'text-green-400'
                                                }`}>
                                                {endpoint.errorRate}%
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-text-secondary">Req/min</p>
                                            <p className="font-bold text-white">{endpoint.requestsPerMin}</p>
                                        </div>
                                        <i className="fas fa-chevron-right text-text-secondary group-hover:text-accent transition-colors"></i>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Related Processes */}
            {processes.length > 0 && (
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 mb-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-microchip text-green-400"></i>
                        Related Processes ({processes.length})
                    </h3>
                    <div className="space-y-2">
                        {processes.map((process, index) => (
                            <div key={index} className="p-4 bg-white/5 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <p className="font-medium text-white">{process.name}</p>
                                            <span className="px-2 py-1 rounded text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                PID {process.pid}
                                            </span>
                                            {process.type && (
                                                <span className="px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    {process.type}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-text-secondary font-mono truncate">{process.command}</p>
                                    </div>
                                    <div className="flex items-center gap-6 ml-4">
                                        <div className="text-right">
                                            <p className="text-xs text-text-secondary">CPU</p>
                                            <p className="font-bold text-white">{process.cpu?.toFixed(1) || 0}%</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-text-secondary">Memory</p>
                                            <p className="font-bold text-white">{process.memory?.toFixed(1) || 0}%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Dependencies and Recent Traces */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dependency Map */}
                {service.dependencies && service.dependencies.length > 0 && (
                    <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <i className="fas fa-project-diagram text-orange-400"></i>
                            Dependencies
                        </h3>
                        <div className="space-y-3">
                            {service.dependencies.map((dep, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${dep.type === 'database' ? 'bg-purple-500/10 border-purple-500/20' :
                                        dep.type === 'service' ? 'bg-sky-500/10 border-sky-500/20' :
                                            dep.type === 'cache' ? 'bg-green-500/10 border-green-500/20' :
                                                'bg-orange-500/10 border-orange-500/20'
                                        }`}>
                                        <i className={`fas ${dep.type === 'database' ? 'fa-database text-purple-400' :
                                            dep.type === 'service' ? 'fa-cube text-sky-400' :
                                                dep.type === 'cache' ? 'fa-bolt text-green-400' :
                                                    'fa-cloud text-orange-400'
                                            }`}></i>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-white">{dep.name}</p>
                                        <p className="text-xs text-text-secondary capitalize">{dep.type}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${dep.latency > 800 ? 'text-red-400' :
                                            dep.latency > 500 ? 'text-yellow-400' :
                                                'text-green-400'
                                            }`}>
                                            {dep.latency}ms
                                        </p>
                                        <HealthIndicator health={dep.health} size="sm" showText={false} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Traces */}
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <i className="fas fa-stream text-blue-400"></i>
                            Recent Traces
                        </h3>
                        <button
                            onClick={() => navigate(hostId ? `/server/${hostId}/traces/${service?._id}` : `/traces/${service?._id}`)}
                            className="text-accent hover:text-white transition-colors text-sm"
                        >
                            View All →
                        </button>
                    </div>
                    <div className="space-y-2">
                        {traces.slice(0, 5).map((trace) => (
                            <div
                                key={trace.id}
                                onClick={() => navigate(hostId ? `/server/${hostId}/traces/${trace.id}` : `/traces/${trace.id}`)}
                                className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono text-sm text-white">{trace.method} {trace.path}</span>
                                    <StatusBadge status={trace.status} />
                                </div>
                                <div className="flex items-center justify-between text-xs text-text-secondary">
                                    <span>{new Date(trace.timestamp).toLocaleTimeString()}</span>
                                    <span className={`font-medium ${trace.duration > 1000 ? 'text-red-400' :
                                        trace.duration > 500 ? 'text-yellow-400' :
                                            'text-green-400'
                                        }`}>
                                        {trace.duration}ms
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ServiceDetails;
