import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ServerList = ({ onSelectAgent, selectedAgentId }) => {
    const [agents, setAgents] = useState([]);
    const { user } = useAuth();

    const fetchAgents = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3000/api/agents', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAgents(res.data);
        } catch (err) {
            console.error('Error fetching agents:', err);
        }
    };

    useEffect(() => {
        fetchAgents();
        const interval = setInterval(fetchAgents, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="glass p-6 rounded-xl h-full overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <i className="fas fa-server text-accent"></i> Servers
            </h3>
            <div className="space-y-3">
                {agents.map(agent => (
                    <div
                        key={agent._id}
                        onClick={() => onSelectAgent(agent)}
                        className={`p-4 rounded-lg cursor-pointer transition-all border ${selectedAgentId === agent._id
                            ? 'bg-accent/20 border-accent'
                            : 'bg-white/5 border-transparent hover:bg-white/10'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold">{agent.name}</span>
                            <span className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                        </div>
                        <div className="text-xs text-text-secondary space-y-1">
                            <p>{agent.platform} {agent.distro}</p>
                            <p>{agent.ip}</p>
                            <p className="text-[10px] opacity-70">Last seen: {new Date(agent.lastSeen).toLocaleTimeString()}</p>
                        </div>
                    </div>
                ))}
                {agents.length === 0 && (
                    <p className="text-text-secondary text-center py-4">No agents registered</p>
                )}
            </div>
        </div>
    );
};

export default ServerList;
