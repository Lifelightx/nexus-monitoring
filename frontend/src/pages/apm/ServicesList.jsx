import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { mockServices, getServicesByHost } from '../../mockData/services';
import { getAgentServices } from '../../services/apmService';
import HealthIndicator from '../../components/shared/HealthIndicator';
import MetricSparkline from '../../components/shared/MetricSparkline';

const ServicesList = () => {
    const navigate = useNavigate();
    const { id: hostId } = useParams(); // Get host ID from URL
    const context = useOutletContext(); // Get context from ServerLayout
    const [sortBy, setSortBy] = useState('health');
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchTerm, setSearchTerm] = useState('');
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch services from API
    useEffect(() => {
        const fetchServices = async () => {
            if (!hostId) {
                console.log('⚠️ No hostId provided, skipping service fetch');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                console.log('🔍 Fetching services for host:', hostId);
                const data = await getAgentServices(hostId);
                console.log('✅ Services fetched successfully:', data);
                setServices(data);
            } catch (err) {
                console.error('❌ Error fetching services:', err);
                console.error('Error details:', {
                    message: err.message,
                    response: err.response?.data,
                    status: err.response?.status
                });
                setError('Failed to load services');
                // Fallback to mock data
                console.log('📦 Falling back to mock data');
                setServices(getServicesByHost(hostId));
            } finally {
                setLoading(false);
            }
        };

        fetchServices();
    }, [hostId]);

    // Generate sparkline data for each service
    const generateSparklineData = () => {
        return Array.from({ length: 20 }, () => Math.random() * 100);
    };

    // Filter and sort services
    const filteredServices = useMemo(() => {
        console.log('🔄 Filtering services:', services);

        let filtered = services.filter(service =>
            service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.type?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        console.log('✅ Filtered services:', filtered.length);

        // Sort services
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '');
                    break;
                case 'requests':
                    comparison = (a.metrics?.requestsPerMin || 0) - (b.metrics?.requestsPerMin || 0);
                    break;
                case 'latency':
                    comparison = (a.metrics?.p95Latency || 0) - (b.metrics?.p95Latency || 0);
                    break;
                case 'errors':
                    comparison = (a.metrics?.errorRate || 0) - (b.metrics?.errorRate || 0);
                    break;
                case 'health':
                    const healthOrder = { critical: 3, warning: 2, healthy: 1, unknown: 0 };
                    comparison = (healthOrder[a.health] || 0) - (healthOrder[b.health] || 0);
                    break;
                default:
                    comparison = 0;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [services, searchTerm, sortBy, sortOrder]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const getSortIcon = (column) => {
        if (sortBy !== column) return 'fa-sort';
        return sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
    };

    // Calculate summary stats
    const stats = {
        total: services.length,
        healthy: services.filter(s => s.health === 'healthy').length,
        warning: services.filter(s => s.health === 'warning').length,
        critical: services.filter(s => s.health === 'critical').length,
        totalRequests: services.reduce((sum, s) => sum + (s.metrics?.requestsPerMin || 0), 0)
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Services</h2>
                    <p className="text-text-secondary mt-1">
                        {hostId ? `Services running on this host (${services.length})` : 'Monitor all discovered services and their performance'}
                    </p>
                    {error && (
                        <p className="text-red-400 text-sm mt-1">⚠️ {error} - Showing mock data</p>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                    <p className="ml-4 text-text-secondary">Loading services...</p>
                </div>
            )}

            {/* Content - only show if not loading */}
            {!loading && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5">
                            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Total Services</p>
                            <p className="text-2xl font-bold text-white">{stats.total}</p>
                        </div>
                        <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5 border-l-4 border-l-green-500">
                            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Healthy</p>
                            <p className="text-2xl font-bold text-green-400">{stats.healthy}</p>
                        </div>
                        <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5 border-l-4 border-l-yellow-500">
                            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Warning</p>
                            <p className="text-2xl font-bold text-yellow-400">{stats.warning}</p>
                        </div>
                        <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5 border-l-4 border-l-red-500">
                            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Critical</p>
                            <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
                        </div>
                        <div className="bg-bg-secondary/50 backdrop-blur-sm p-4 rounded-xl border border-white/5">
                            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Total Req/min</p>
                            <p className="text-2xl font-bold text-white">{stats.totalRequests.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"></i>
                            <input
                                type="text"
                                placeholder="Search services..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-bg-secondary/50 border border-white/10 rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
                            />
                        </div>
                    </div>

                    {/* Services Table */}
                    <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-text-secondary text-xs uppercase tracking-wider border-b border-white/10">
                                        <th className="p-4 text-left font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-2">
                                                Service
                                                <i className={`fas ${getSortIcon('name')} text-xs`}></i>
                                            </div>
                                        </th>
                                        <th className="p-4 text-left font-medium">Type</th>
                                        <th className="p-4 text-right font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('requests')}>
                                            <div className="flex items-center justify-end gap-2">
                                                Req/min
                                                <i className={`fas ${getSortIcon('requests')} text-xs`}></i>
                                            </div>
                                        </th>
                                        <th className="p-4 text-right font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('latency')}>
                                            <div className="flex items-center justify-end gap-2">
                                                P95 Latency
                                                <i className={`fas ${getSortIcon('latency')} text-xs`}></i>
                                            </div>
                                        </th>
                                        <th className="p-4 text-right font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('errors')}>
                                            <div className="flex items-center justify-end gap-2">
                                                Error Rate
                                                <i className={`fas ${getSortIcon('errors')} text-xs`}></i>
                                            </div>
                                        </th>
                                        <th className="p-4 text-left font-medium">Trend</th>
                                        <th className="p-4 text-left font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('health')}>
                                            <div className="flex items-center gap-2">
                                                Health
                                                <i className={`fas ${getSortIcon('health')} text-xs`}></i>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredServices.map((service, index) => (
                                        <tr
                                            key={service._id || `${service.port}-${service.name}` || index}
                                            onClick={() => navigate(hostId ? `/server/${hostId}/services/${service.name}` : `/services/${service.name}`)}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                                                        <i className="fas fa-cube text-sky-400"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white group-hover:text-accent transition-colors">{service.name}</p>
                                                        <p className="text-xs text-text-secondary">
                                                            {service.containerName ? `📦 ${service.containerName}` : '💻 Host Process'} • Port {service.port}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    {service.type}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <p className="font-medium text-white">{service.metrics?.requestsPerMin || 0}</p>
                                                <p className="text-xs text-text-secondary">{((service.metrics?.requestsPerMin || 0) / 60).toFixed(1)} req/s</p>
                                            </td>
                                            <td className="p-4 text-right">
                                                <p className={`font-medium ${(service.metrics?.p95Latency || 0) > 800 ? 'text-red-400' :
                                                    (service.metrics?.p95Latency || 0) > 500 ? 'text-yellow-400' :
                                                        'text-green-400'
                                                    }`}>
                                                    {service.metrics?.p95Latency || 0}ms
                                                </p>
                                            </td>
                                            <td className="p-4 text-right">
                                                <p className={`font-medium ${(service.metrics?.errorRate || 0) > 1 ? 'text-red-400' :
                                                    (service.metrics?.errorRate || 0) > 0.5 ? 'text-yellow-400' :
                                                        'text-green-400'
                                                    }`}>
                                                    {service.metrics?.errorRate || 0}%
                                                </p>
                                            </td>
                                            <td className="p-4">
                                                <div className="w-24">
                                                    <MetricSparkline
                                                        data={generateSparklineData()}
                                                        color={service.health === 'critical' ? '#f87171' : service.health === 'warning' ? '#fbbf24' : '#4ade80'}
                                                        height={30}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <HealthIndicator health={service.health} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredServices.length === 0 && (
                            <div className="text-center py-12">
                                <i className="fas fa-search text-4xl text-text-secondary mb-3 opacity-30"></i>
                                <p className="text-text-secondary">No services found matching "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ServicesList;
