import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useSocket } from '../../context/SocketContext';
import InstallationGuide from '../../components/dashboard/InstallationGuide';
import AddServerModal from '../../components/dashboard/AddServerModal';

const Servers = () => {
    const { showGuide, setShowGuide } = useOutletContext();
    const socket = useSocket();
    const [showAddServerModal, setShowAddServerModal] = useState(false);
    const [agents, setAgents] = useState([]);
    const navigate = useNavigate();

    const fetchAgents = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/agents`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAgents(res.data);
        } catch (err) {
            console.error('Error fetching agents:', err);
        }
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
            };

            // Listen for individual agent updates
            const handleAgentUpdate = (updatedAgent) => {
                console.log('Received agent update:', updatedAgent);
                setAgents(prev =>
                    prev.map(a => a._id === updatedAgent._id ? updatedAgent : a)
                );
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
            {showAddServerModal && <AddServerModal onClose={() => setShowAddServerModal(false)} />}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Your Servers</h2>
                <button
                    onClick={() => setShowAddServerModal(true)}
                    className="backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center gap-2 group hover:border-accent/50"
                >
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                        <i className="fas fa-plus text-accent text-xs group-hover:text-white"></i>
                    </div>
                    <span>Add Server</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map(agent => (
                    <div
                        key={agent._id}
                        onClick={() => navigate(`/server/${agent._id}`, { state: { agent } })}
                        className="bg-bg-secondary/50 backdrop-blur-sm border border-white/5 rounded-xl p-6 hover:border-accent/50 hover:bg-bg-secondary transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                                <i className={`fas fa-server text-xl ${agent.status === 'online' ? 'text-green-400' : 'text-red-400'}`}></i>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${agent.status === 'online'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                {agent.status === 'online' ? 'Online' : 'Offline'}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1">{agent.name}</h3>
                        <p className="text-sm text-text-secondary mb-4">{agent.ip}</p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Platform</p>
                                <p className="font-medium text-white">{agent.platform}</p>
                            </div>
                            <div>
                                <p className="text-text-secondary text-xs mb-1">Uptime</p>
                                <p className="font-medium text-white">
                                    {agent.uptime ? `${(agent.uptime / 3600).toFixed(1)}h` : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                {agents.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-white/10 rounded-xl">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-server text-2xl text-text-secondary"></i>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Servers Connected</h3>
                        <p className="text-text-secondary mb-6">Install the agent on your server to see it here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Servers;
