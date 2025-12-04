import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSocket } from '../../context/SocketContext';

const ServerMetrics = () => {
    const { agent } = useOutletContext();
    const [history, setHistory] = useState([]);
    const [currentMetrics, setCurrentMetrics] = useState(null);
    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (data) => {
            if (data.agentId === agent?._id) {
                setCurrentMetrics(data);
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

            {/* Detailed CPU Info */}
            {currentMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-4">Load Average</h3>
                        <div className="flex justify-between items-center">
                            <div className="text-center">
                                <div className="text-sm text-gray-400">1 min</div>
                                <div className="text-xl font-mono text-blue-400">{currentMetrics.cpu.loadAvg?.[0]?.toFixed(2) || 'N/A'}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-gray-400">5 min</div>
                                <div className="text-xl font-mono text-blue-400">{currentMetrics.cpu.loadAvg?.[1]?.toFixed(2) || 'N/A'}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-gray-400">15 min</div>
                                <div className="text-xl font-mono text-blue-400">{currentMetrics.cpu.loadAvg?.[2]?.toFixed(2) || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-4">CPU Status</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Temperature</span>
                                <span className="font-mono text-orange-400">
                                    {currentMetrics.cpu.temperature ? `${currentMetrics.cpu.temperature}°C` : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Cores (Phys/Log)</span>
                                <span className="font-mono text-white">
                                    {currentMetrics.cpu.physicalCores} / {currentMetrics.cpu.cores}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total Load</span>
                                <span className="font-mono text-blue-400">{currentMetrics.cpu.load.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass p-6 rounded-xl overflow-y-auto max-h-[200px]">
                        <h3 className="text-lg font-bold text-white mb-4">Per Core Usage</h3>
                        <div className="space-y-2">
                            {currentMetrics.cpu.processors?.map((load, i) => (
                                <div key={i} className="flex items-center text-xs">
                                    <span className="w-8 text-gray-400">#{i}</span>
                                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden mx-2">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${load}%` }}
                                        ></div>
                                    </div>
                                    <span className="w-10 text-right font-mono text-white">{load.toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="glass p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6">CPU Usage History (%)</h3>
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
                    <h3 className="text-lg font-bold text-white mb-6">Memory Usage History (%)</h3>
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
