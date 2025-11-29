import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ServerDetails = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [agent, setAgent] = useState(location.state?.agent || null);
    const [metrics, setMetrics] = useState(null);
    const [history, setHistory] = useState([]);
    const [dockerDetails, setDockerDetails] = useState(null);

    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (data) => {
            if (data.agentId === id || (agent && data.agent === agent.name)) {
                setMetrics(data);
                if (data.dockerDetails) {
                    setDockerDetails(data.dockerDetails);
                }

                // Update agent info if we didn't have it
                if (!agent) {
                    setAgent({ name: data.agent, _id: data.agentId });
                }

                setHistory(prev => {
                    const newHistory = [...prev, {
                        time: new Date(data.timestamp).toLocaleTimeString(),
                        cpu: data.cpu.load,
                        memory: (data.memory.used / data.memory.total) * 100
                    }];
                    return newHistory.slice(-20);
                });
            }
        };

        socket.on('dashboard:update', handleUpdate);

        return () => {
            socket.off('dashboard:update', handleUpdate);
        };
    }, [id, agent, socket]);

    if (!metrics && !agent) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary">Connecting to server...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        {agent?.name || metrics?.agent || 'Unknown Server'}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${metrics ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {metrics ? 'Live' : 'Offline'}
                        </span>
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-text-secondary mt-1">
                        <p>Server ID: {id}</p>
                        {metrics?.uptime && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                <p>Uptime: {Math.floor(metrics.uptime / 3600)}h {Math.floor((metrics.uptime % 3600) / 60)}m</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {metrics ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 border-l-4 border-l-accent">
                            <h3 className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">CPU Load</h3>
                            <p className="text-3xl font-bold text-white">{metrics.cpu.load.toFixed(1)}%</p>
                            <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-accent h-full rounded-full transition-all duration-500" style={{ width: `${metrics.cpu.load}%` }}></div>
                            </div>
                        </div>

                        <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 border-l-4 border-l-purple-500">
                            <h3 className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Memory</h3>
                            <p className="text-3xl font-bold text-white">{((metrics.memory.used / metrics.memory.total) * 100).toFixed(1)}%</p>
                            <p className="text-xs text-text-secondary mt-1">
                                {(metrics.memory.used / 1024 / 1024 / 1024).toFixed(1)} GB / {(metrics.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB
                            </p>
                        </div>

                        <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 border-l-4 border-l-green-500">
                            <h3 className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Network RX</h3>
                            <p className="text-3xl font-bold text-white">{(metrics.network[0].rx_sec / 1024).toFixed(1)} <span className="text-sm font-normal text-text-secondary">KB/s</span></p>
                            <p className="text-xs text-text-secondary mt-1">Total: {(metrics.network[0].rx_bytes / 1024 / 1024).toFixed(1)} MB</p>
                        </div>

                        <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5 border-l-4 border-l-orange-500">
                            <h3 className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Network TX</h3>
                            <p className="text-3xl font-bold text-white">{(metrics.network[0].tx_sec / 1024).toFixed(1)} <span className="text-sm font-normal text-text-secondary">KB/s</span></p>
                            <p className="text-xs text-text-secondary mt-1">Total: {(metrics.network[0].tx_bytes / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-6">CPU History</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={history}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                        <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Line type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-6">Memory History</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={history}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                        <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Line type="monotone" dataKey="memory" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="bg-bg-secondary/50 backdrop-blur-sm p-6 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <i className="fab fa-docker text-blue-400"></i> Docker Containers
                            </h3>
                            {dockerDetails && (
                                <button
                                    onClick={() => navigate(`/server/${id}/docker-details`, {
                                        state: {
                                            dockerData: dockerDetails,
                                            agentName: agent?.name || metrics?.agent,
                                            agentId: id
                                        }
                                    })}
                                    className="bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                                >
                                    <i className="fas fa-external-link-alt"></i>
                                    View Full Details
                                </button>
                            )}
                        </div>

                        {metrics.docker && metrics.docker.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-text-secondary text-xs uppercase tracking-wider border-b border-white/10">
                                            <th className="p-4 font-medium">Name</th>
                                            <th className="p-4 font-medium">Image</th>
                                            <th className="p-4 font-medium">State</th>
                                            <th className="p-4 font-medium">ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metrics.docker.map(container => (
                                            <tr key={container.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-medium text-white">{container.name}</td>
                                                <td className="p-4 text-text-secondary">{container.image}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${container.state === 'running' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                        {container.state}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-text-secondary font-mono text-xs">{container.id.substring(0, 12)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-text-secondary">
                                <i className="fas fa-box-open text-4xl mb-3 opacity-30"></i>
                                <p>No active containers found</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="bg-bg-secondary/50 backdrop-blur-sm p-12 rounded-xl border border-white/5 text-center flex flex-col items-center justify-center h-[50vh]">
                    <i className="fas fa-wifi text-4xl text-white/20 mb-4"></i>
                    <h3 className="text-xl font-bold text-white mb-2">Waiting for data...</h3>
                    <p className="text-text-secondary">The agent hasn't sent any metrics yet.</p>
                </div>
            )}
        </div>
    );
};

export default ServerDetails;
