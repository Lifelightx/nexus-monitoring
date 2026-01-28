import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import axios from 'axios';
import {
    Search, Filter, RefreshCw, Terminal,
    Activity, AlertTriangle, Shield, Archive,
    Server, Laptop, Pause, Play
} from 'lucide-react';
import { API_BASE_URL } from '../../config';

const ServerLogs = () => {
    const { agent } = useOutletContext();
    const { serverId } = useParams();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        type: 'all',
        level: 'all',
        search: '',
        source: ''
    });
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchLogs = useCallback(async () => {
        if (!agent?._id) return;

        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (filters.type !== 'all') params.append('type', filters.type);
            if (filters.level !== 'all') params.append('level', filters.level);
            if (filters.search) params.append('search', filters.search);
            if (filters.source) params.append('source', filters.source);

            const response = await axios.get(`${API_BASE_URL}/api/logs/${agent._id}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setLogs(response.data.logs);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    }, [agent, filters]);

    useEffect(() => {
        fetchLogs();
        let interval;
        if (autoRefresh) {
            interval = setInterval(fetchLogs, 5000);
        }
        return () => clearInterval(interval);
    }, [fetchLogs, autoRefresh]);

    const getLevelColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'error': return 'text-red-400';
            case 'warn': return 'text-yellow-400';
            case 'alert': return 'text-orange-500 font-bold';
            default: return 'text-blue-400';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'kernel': return <Terminal size={16} className="text-gray-400" />;
            case 'system': return <Server size={16} className="text-gray-400" />;
            case 'docker': return <Archive size={16} className="text-blue-400" />;
            case 'agent': return <Activity size={16} className="text-green-400" />;
            case 'alert': return <AlertTriangle size={16} className="text-red-400" />;
            case 'service': return <Shield size={16} className="text-purple-400" />;
            default: return <Terminal size={16} />;
        }
    };

    return (
        <div className="bg-card-bg rounded-lg border border-white/10 p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Terminal size={24} /> System Logs
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`p-2 rounded-lg flex items-center gap-2 border ${autoRefresh ? 'bg-accent-color/20 border-accent-color text-accent-color' : 'border-white/10 text-text-secondary hover:bg-hover-bg'}`}
                    >
                        {autoRefresh ? <Pause size={16} /> : <Play size={16} />}
                        {autoRefresh ? 'Live' : 'Paused'}
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="p-2 rounded-lg border border-white/10 text-text-secondary hover:bg-hover-bg"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-text-secondary" size={16} />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="w-full bg-bg-primary border border-white/10 rounded-lg pl-10 pr-4 py-2 text-text-primary focus:outline-none focus:border-accent-color"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                <select
                    className="bg-bg-primary border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-color"
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                >
                    <option value="all">All Types</option>
                    <option value="system">System</option>
                    <option value="kernel">Kernel</option>
                    <option value="docker">Docker</option>
                    <option value="agent">Agent</option>
                    <option value="alert">Alerts</option>
                    <option value="service">Services</option>
                </select>

                <select
                    className="bg-bg-primary border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-color"
                    value={filters.level}
                    onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                >
                    <option value="all">All Levels</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                </select>

                <input
                    type="text"
                    placeholder="Source (e.g. nginx)"
                    className="bg-bg-primary border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-color"
                    value={filters.source}
                    onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                />
            </div>

            {/* Logs Table */}
            <div className="flex-1 overflow-auto bg-bg-primary rounded-lg border border-white/10">
                <table className="w-full text-left">
                    <thead className="bg-hover-bg sticky top-0">
                        <tr>
                            <th className="p-3 text-text-secondary font-medium w-48">Timestamp</th>
                            <th className="p-3 text-text-secondary font-medium w-24">Type</th>
                            <th className="p-3 text-text-secondary font-medium w-24">Level</th>
                            <th className="p-3 text-text-secondary font-medium w-32">Source</th>
                            <th className="p-3 text-text-secondary font-medium">Message</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {loading && logs.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-text-secondary">Loading logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-text-secondary">No logs found</td></tr>
                        ) : (
                            logs.map((log, index) => (
                                <tr key={index} className="hover:bg-hover-bg font-mono text-sm">
                                    <td className="p-3 text-text-secondary whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            {getTypeIcon(log.type)}
                                            <span className="capitalize">{log.type}</span>
                                        </div>
                                    </td>
                                    <td className={`p-3 font-semibold ${getLevelColor(log.level)} uppercase text-xs`}>
                                        {log.level}
                                    </td>
                                    <td className="p-3 text-accent-color">
                                        {log.source}
                                    </td>
                                    <td className="p-3 text-text-primary break-all">
                                        {log.message}
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

export default ServerLogs;
