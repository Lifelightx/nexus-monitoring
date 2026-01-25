import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Activity, TrendingUp, AlertTriangle, Clock, Zap, Play } from 'lucide-react';
import { API_BASE_URL } from '../../config';

// Dedicated Page for Instrumented Services (APM)
const InstrumentedServices = () => {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchServices();
        const interval = setInterval(fetchServices, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchServices = async () => {
        try {
            const token = localStorage.getItem('token');
            // Directly call the APM endpoint
            const response = await axios.get(`${API_BASE_URL}/api/apm/services`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (Array.isArray(response.data)) {
                setServices(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch APM services:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleServiceClick = (service) => {
        // Go to Trace Explorer filtered by this service
        navigate(`/apm/traces?service=${service.name}`);
    };

    return (
        <div className="p-6 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-2">
                <Activity className="text-accent-color" />
                Instrumented Services
            </h1>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-color"></div>
                    <span className="ml-3 text-text-secondary">Loading APM data...</span>
                </div>
            ) : (
                <div className="bg-card-bg border border-white/10 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="text-left p-4 text-sm font-semibold text-text-secondary">Service Name</th>
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
                                    <div className="flex items-center justify-center gap-1"><Zap size={14} /> Throughput</div>
                                </th>
                                <th className="text-center p-4 text-sm font-semibold text-text-secondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {services.length === 0 ? (
                                <tr>
                                    <td colspan="6" className="p-8 text-center text-text-secondary">
                                        No instrumented services found.
                                    </td>
                                </tr>
                            ) : (
                                services.map((service, index) => (
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
                                                <div className="font-semibold text-text-primary">{service.name}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-text-primary font-medium">{service.rps}</span>
                                            <span className="text-xs text-text-secondary ml-1">req/s</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`font-medium ${(parseFloat(service.errorRate) > 5) ? 'text-red-400' : 'text-green-400'}`}>
                                                {service.errorRate}%
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-text-primary font-medium">{service.p95Latency}</span>
                                            <span className="text-xs text-text-secondary ml-1">ms</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-text-primary font-medium">{service.throughput}</span>
                                            <span className="text-xs text-text-secondary ml-1">ops/s</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleServiceClick(service);
                                                }}
                                                className="px-3 py-1.5 bg-accent-color/10 hover:bg-accent-color/20 text-accent-color rounded text-sm font-medium flex items-center gap-1.5 transition-colors mx-auto"
                                            >
                                                <Play size={12} />
                                                Traces
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default InstrumentedServices;
