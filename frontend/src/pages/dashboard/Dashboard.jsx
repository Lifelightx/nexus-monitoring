import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useSocket } from '../../context/SocketContext';
import InstallationGuide from '../../components/dashboard/InstallationGuide';
import AddServerModal from '../../components/dashboard/AddServerModal';

const Dashboard = () => {
    const { showGuide, setShowGuide } = useOutletContext();
    const socket = useSocket();
    const [agents, setAgents] = useState([]);
    const [metrics, setMetrics] = useState({
        totalContainers: 0,
        runningContainers: 0,
        totalCpuLoad: 0,
        onlineServers: 0
    });

    const fetchAgents = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/agents`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const agentsData = res.data;
            setAgents(agentsData);
            calculateMetrics(agentsData);

        } catch (err) {
            console.error('Error fetching agents:', err);
        }
    };

    const calculateMetrics = (agentsData) => {
        let totalContainers = 0;
        let runningContainers = 0;
        let totalCpuLoad = 0;
        let onlineServers = 0;

        agentsData.forEach(agent => {
            if (agent.status === 'online') {
                onlineServers++;
                // Assuming agent.dockerDetails contains container info if available
                // Note: The /api/agents endpoint might not return full docker details for all agents list
                // We might need to rely on what's available or fetch details.
                // For now, let's assume basic stats are available or we use what we have.
                // If the list endpoint doesn't return docker stats, we might need to adjust the backend or fetch individually.
                // Checking previous agent data structure... usually it has basic info.

                // If docker info is not in the list response, we'll display 0 or placeholders.
                // Let's assume for this step we display what we can.
            }
        });

        setMetrics({
            totalContainers,
            runningContainers,
            totalCpuLoad,
            onlineServers
        });
    };

    useEffect(() => {
        // Initial fetch on mount
        fetchAgents();

        // Subscribe to WebSocket updates
        if (socket) {
            // Subscribe to agent list updates
            socket.emit('agent:list:subscribe');

            // Listen for agent list updates
            const handleAgentListUpdate = (agentList) => {
                console.log('Received agent list update:', agentList);
                setAgents(agentList);
                calculateMetrics(agentList);
            };

            // Listen for individual agent updates
            const handleAgentUpdate = (updatedAgent) => {
                console.log('Received agent update:', updatedAgent);
                setAgents(prev => {
                    const updated = prev.map(a =>
                        a._id === updatedAgent._id ? updatedAgent : a
                    );
                    calculateMetrics(updated);
                    return updated;
                });
            };

            socket.on('agent:list:updated', handleAgentListUpdate);
            socket.on('agent:updated', handleAgentUpdate);

            // Cleanup listeners on unmount
            return () => {
                socket.off('agent:list:updated', handleAgentListUpdate);
                socket.off('agent:updated', handleAgentUpdate);
            };
        }
    }, [socket]);

    return (
        <div>
            {showGuide && <InstallationGuide onClose={() => setShowGuide(false)} />}

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-text-secondary">Overview of your infrastructure.</p>
            </div>

            {/* Aggregated Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass p-6 rounded-xl border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-text-secondary text-sm font-medium mb-1">Total Servers</p>
                            <h3 className="text-3xl font-bold text-white">{agents.length}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <i className="fas fa-server text-blue-400"></i>
                        </div>
                    </div>
                    <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                        <i className="fas fa-check-circle"></i> {metrics.onlineServers} Online
                    </p>
                </div>

                <div className="glass p-6 rounded-xl border-l-4 border-purple-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-text-secondary text-sm font-medium mb-1">Total Containers</p>
                            <h3 className="text-3xl font-bold text-white">{metrics.totalContainers}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <i className="fab fa-docker text-purple-400"></i>
                        </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">Across all servers</p>
                </div>

                <div className="glass p-6 rounded-xl border-l-4 border-green-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-text-secondary text-sm font-medium mb-1">Running Containers</p>
                            <h3 className="text-3xl font-bold text-white">{metrics.runningContainers}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <i className="fas fa-play-circle text-green-400"></i>
                        </div>
                    </div>
                    <p className="text-xs text-green-400 mt-2">Active workloads</p>
                </div>

                <div className="glass p-6 rounded-xl border-l-4 border-red-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-text-secondary text-sm font-medium mb-1">Recent Alerts</p>
                            <h3 className="text-3xl font-bold text-white">0</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <i className="fas fa-bell text-red-400"></i>
                        </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">No critical issues</p>
                </div>
            </div>

            {/* Quick Actions / Recent Activity Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-xl">
                    <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
                    <div className="space-y-4">
                        {agents.slice(0, 5).map(agent => (
                            <div key={agent._id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className="font-medium text-white">{agent.name}</span>
                                </div>
                                <span className="text-xs text-text-secondary">{agent.ip}</span>
                            </div>
                        ))}
                        {agents.length === 0 && <p className="text-text-secondary">No servers connected.</p>}
                    </div>
                </div>

                <div className="glass p-6 rounded-xl">
                    <h3 className="text-xl font-bold text-white mb-4">Recent Alerts</h3>
                    <div className="flex flex-col items-center justify-center h-40 text-text-secondary">
                        <i className="fas fa-check-circle text-4xl mb-2 text-green-500/50"></i>
                        <p>All systems operational</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
