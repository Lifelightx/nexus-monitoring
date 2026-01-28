import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {API_BASE_URL} from '../../config'
import { useParams, useNavigate } from 'react-router-dom';
import { Activity, Clock, AlertTriangle, ArrowLeft, GitMerge, Layout, Globe, Database, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';


const ServiceDetails = () => {
    const { serviceName } = useParams();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [traces, setTraces] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');

                // Fetch Time Series (RPS, Latency)
                // Using helper endpoint or direct queries
                const now = new Date();
                const oneHourAgo = new Date(now - 60 * 60 * 1000);

                // Fetch Traces for this service
                const tracesResp = await axios.get(`${API_BASE_URL}/api/otel/traces`, {
                    params: {
                        serviceName,
                        limit: 10
                    },
                    headers: { Authorization: `Bearer ${token}` }
                });

                setTraces(tracesResp.data.data || []);

                // Fetch Service Stats (Golden Signals)
                const statsResp = await axios.get(`${API_BASE_URL}/api/otel/services/${serviceName}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (statsResp.data.success) {
                    setStats({
                        ...statsResp.data.data,
                        // Fallback/Mock for inner lists until endpoints ready
                        dependencies: [
                            { target: 'redis', type: 'db', latency: 2 },
                            { target: 'postgres', type: 'db', latency: 12 }
                        ],
                        endpoints: [
                            { method: 'GET', path: '/api/v1/users', rps: 45, latency: 30 }
                        ]
                    });
                }

            } catch (error) {
                console.error("Failed to fetch service details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [serviceName]);

    if (loading) return <div className="p-6 text-text-secondary">Loading service details...</div>;

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full text-text-secondary">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-accent-color/10 rounded-lg text-accent-color">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">{serviceName}</h1>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Healthy
                        </div>
                    </div>
                </div>
            </div>

            {/* Golden Signals */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card title="Avg Latency" value={`${stats?.avgLatency}ms`} icon={<Clock className="text-blue-400" />} />
                <Card title="P95 Latency" value={`${stats?.p95Latency}ms`} icon={<Activity className="text-purple-400" />} />
                <Card title="Error Rate" value={`${stats?.errorRate}%`} icon={<AlertTriangle className="text-red-400" />} />
                <Card title="Throughput" value={`${stats?.rps} rps`} icon={<Globe className="text-green-400" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Latency Chart */}
                <div className="lg:col-span-2 bg-card-bg border border-white/10 rounded-lg p-6">
                    <h3 className="font-bold text-lg text-text-primary mb-4">Latency Trend (Last 1h)</h3>
                    <div className="h-64 flex items-center justify-center text-text-secondary bg-white/5 rounded">
                        Chart Mockup
                    </div>
                </div>

                {/* Dependencies */}
                <div className="bg-card-bg border border-white/10 rounded-lg p-6">
                    <h3 className="font-bold text-lg text-text-primary mb-4 flex items-center gap-2">
                        <GitMerge size={18} /> Dependencies
                    </h3>
                    <div className="space-y-4">
                        {stats?.dependencies.map((dep, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Database size={16} className="text-text-secondary" />
                                    <span className="text-text-primary font-medium">{dep.target}</span>
                                </div>
                                <span className="text-sm text-text-secondary">{dep.latency}ms</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Traces */}
            <div className="bg-card-bg border border-white/10 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-text-primary">Recent Traces</h3>
                    <button onClick={() => navigate('/apm/traces')} className="text-sm text-accent-color hover:underline flex items-center gap-1">
                        View All <ArrowRight size={14} />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-xs text-text-secondary uppercase bg-white/5">
                            <tr>
                                <th className="p-3">Trace ID</th>
                                <th className="p-3">Operation</th>
                                <th className="p-3">Duration</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {traces.map((trace, i) => (
                                <tr key={i} className="hover:bg-white/5 cursor-pointer" onClick={() => navigate(`/apm/traces/${trace.TraceId}`)}>
                                    <td className="p-3 font-mono text-accent-color">{trace.TraceId.substring(0, 8)}...</td>
                                    <td className="p-3 text-text-primary">{trace.SpanName}</td>
                                    <td className="p-3 text-text-secondary">{Math.round(trace.TotalDurationMs)}ms</td>
                                    <td className="p-3">
                                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs">OK</span>
                                    </td>
                                    <td className="p-3 text-text-secondary text-sm">{new Date(trace.StartTime).toLocaleTimeString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const Card = ({ title, value, icon }) => (
    <div className="bg-card-bg border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm">{title}</span>
            {icon}
        </div>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
    </div>
);

export default ServiceDetails;
