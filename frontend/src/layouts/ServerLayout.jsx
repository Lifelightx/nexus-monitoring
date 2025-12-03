import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';

const ServerLayout = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [agent, setAgent] = useState(location.state?.agent || null);
    const [metrics, setMetrics] = useState(null);
    const socket = useSocket();

    // Fetch agent data if not available in state
    useEffect(() => {
        if (!agent && id) {
            const fetchAgent = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`http://localhost:3000/api/agents/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setAgent(res.data);
                } catch (err) {
                    console.error('Error fetching agent:', err);
                }
            };
            fetchAgent();
        }
    }, [id, agent]);

    // Listen for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (data) => {
            if (data.agentId === id) {
                setMetrics(data);
                // Optionally update agent status/info if changed
                if (agent && agent.status !== 'online') {
                    setAgent(prev => ({ ...prev, status: 'online' }));
                }
            }
        };

        socket.on('dashboard:update', handleUpdate);
        return () => socket.off('dashboard:update', handleUpdate);
    }, [socket, id, agent]);

    if (!agent) {
        return <div className="text-white p-8">Loading server info...</div>;
    }

    const isOnline = metrics ? true : agent.status === 'online';

    return (
        <div>
            {/* Server Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-white">{agent.name}</h1>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${isOnline
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <p className="text-text-secondary">{agent.ip} • {agent.platform}</p>
                </div>
                <button
                    onClick={() => navigate('/servers')}
                    className="text-text-secondary hover:text-white transition-colors flex items-center gap-2"
                >
                    <i className="fas fa-arrow-left"></i> Back to Servers
                </button>
            </div>

            {/* Content Area */}
            <Outlet context={{ agent, metrics }} />
        </div>
    );
};

export default ServerLayout;
