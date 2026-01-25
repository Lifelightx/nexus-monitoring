import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GitMerge, ArrowRight, Clock, AlertTriangle, AppWindow } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TracesList = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mapServiceParam = searchParams.get('service');

    const [traces, setTraces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterService, setFilterService] = useState(mapServiceParam || 'all');
    const [services, setServices] = useState([]);

    useEffect(() => {
        // Update filter if URL param changes
        if (mapServiceParam) {
            setFilterService(mapServiceParam);
        }
    }, [mapServiceParam]);

    useEffect(() => {
        fetchServices();
        fetchTraces();
    }, [filterService]);

    const fetchServices = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/apm/services`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Backend returns list of objects { name, ... } or strings? 
            // apmController.getServices returns [ { name, ... } ]
            if (Array.isArray(response.data)) {
                setServices(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch services:", error);
        }
    };

    const fetchTraces = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({ limit: 50 });
            if (filterService !== 'all') params.append('serviceName', filterService);

            const response = await axios.get(`${API_BASE_URL}/api/apm/traces?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setTraces(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch traces:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    <GitMerge className="text-accent-color" /> Distributed Traces
                </h1>

                <select
                    value={filterService}
                    onChange={(e) => setFilterService(e.target.value)}
                    className="bg-card-bg border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-color"
                >
                    <option value="all">All Services</option>
                    {services.map((s, i) => (
                        <option key={i} value={s.name}>{s.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex-1 overflow-auto bg-card-bg border border-white/10 rounded-lg">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 sticky top-0">
                        <tr>
                            <th className="p-4 text-text-secondary font-medium border-b border-white/10">Trace ID</th>
                            <th className="p-4 text-text-secondary font-medium border-b border-white/10">Root Service</th>
                            <th className="p-4 text-text-secondary font-medium border-b border-white/10">Operation</th>
                            <th className="p-4 text-text-secondary font-medium border-b border-white/10">Duration</th>
                            <th className="p-4 text-text-secondary font-medium border-b border-white/10">Spans</th>
                            <th className="p-4 text-text-secondary font-medium border-b border-white/10">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center text-text-secondary">Loading traces...</td></tr>
                        ) : traces.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-text-secondary">No traces found</td></tr>
                        ) : (
                            traces.map((trace, index) => (
                                <tr
                                    key={index}
                                    onClick={() => navigate(`/traces/${trace.trace_id}/details`)}
                                    className="hover:bg-white/5 cursor-pointer transition-colors group"
                                >
                                    <td className="p-4 font-mono text-sm text-accent-color group-hover:underline">
                                        {trace.trace_id ? trace.trace_id.substring(0, 8) : 'N/A'}...
                                    </td>
                                    <td className="p-4 text-text-primary font-medium">
                                        {trace.service_name}
                                    </td>
                                    <td className="p-4 text-text-secondary">
                                        {trace.endpoint || trace.span_name}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${trace.duration_ms > 500 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {Math.round(trace.duration_ms)} ms
                                        </span>
                                    </td>
                                    <td className="p-4 text-text-secondary">
                                        {trace.span_count}
                                    </td>
                                    <td className="p-4 text-text-secondary text-sm">
                                        {new Date(trace.start_time).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TracesList;
