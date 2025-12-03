import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSocket } from '../../context/SocketContext';

const ServerMetrics = () => {
    const { agent } = useOutletContext();
    const [history, setHistory] = useState([]);
    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (data) => {
            if (data.agentId === agent?._id) {
                setHistory(prev => {
                    const newHistory = [...prev, {
                        time: new Date(data.timestamp).toLocaleTimeString(),
                        cpu: data.cpu.load,
                        memory: (data.memory.used / data.memory.total) * 100,
                        netRx: data.network[0].rx_sec / 1024,
                        netTx: data.network[0].tx_sec / 1024
                    }];
                    return newHistory.slice(-20);
                });
            }
        };

        socket.on('dashboard:update', handleUpdate);
        return () => socket.off('dashboard:update', handleUpdate);
    }, [socket, agent]);

    return (
        <div className="text-white">
            <h2 className="text-2xl font-bold mb-6">Server Metrics</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="glass p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6">CPU Usage (%)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                                <Line type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Memory Usage (%)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                                <Line type="monotone" dataKey="memory" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Network Traffic (KB/s)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                <YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                                <Line type="monotone" dataKey="netRx" name="RX" stroke="#4ade80" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="netTx" name="TX" stroke="#f97316" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServerMetrics;
