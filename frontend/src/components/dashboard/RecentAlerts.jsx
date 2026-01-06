import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const RecentAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const socket = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        fetchRecentAlerts();
    }, []);

    // Listen for new alerts
    useEffect(() => {
        if (!socket) return;

        const handleNewAlerts = (newAlerts) => {
            setAlerts(prev => [...newAlerts, ...prev].slice(0, 5));
        };

        socket.on('alerts:new', handleNewAlerts);

        return () => {
            socket.off('alerts:new', handleNewAlerts);
        };
    }, [socket]);

    const fetchRecentAlerts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/alerts?limit=5&acknowledged=false`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAlerts(response.data);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'text-red-400';
            case 'warning': return 'text-yellow-400';
            case 'info': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'info': return 'fa-info-circle';
            default: return 'fa-bell';
        }
    };

    if (loading) {
        return (
            <div className="glass p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <i className="fas fa-bell text-yellow-400"></i>
                        Recent Alerts
                    </h3>
                </div>
                <div className="text-center py-8">
                    <i className="fas fa-spinner fa-spin text-2xl text-accent"></i>
                </div>
            </div>
        );
    }

    return (
        <div className="glass p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <i className="fas fa-bell text-yellow-400"></i>
                    Recent Alerts
                    {alerts.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
                            {alerts.length}
                        </span>
                    )}
                </h3>
                <button
                    onClick={() => navigate('/alerts')}
                    className="text-sm text-accent hover:text-white transition-colors"
                >
                    View All →
                </button>
            </div>

            {alerts.length === 0 ? (
                <div className="text-center py-8">
                    <i className="fas fa-check-circle text-4xl text-green-400 mb-2"></i>
                    <p className="text-text-secondary text-sm">No recent alerts</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {alerts.map(alert => (
                        <div
                            key={alert._id}
                            onClick={() => navigate('/alerts')}
                            className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer border-l-4"
                            style={{
                                borderLeftColor: alert.severity === 'critical' ? '#ef4444' :
                                    alert.severity === 'warning' ? '#f59e0b' : '#3b82f6'
                            }}
                        >
                            <div className="flex items-start gap-3">
                                <i className={`fas ${getSeverityIcon(alert.severity)} ${getSeverityColor(alert.severity)} mt-1`}></i>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{alert.message}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                                        <span>{alert.agent?.name || 'Unknown'}</span>
                                        <span>•</span>
                                        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecentAlerts;
