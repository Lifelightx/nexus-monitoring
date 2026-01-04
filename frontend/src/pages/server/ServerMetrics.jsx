import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { API_BASE_URL } from '../../config';

const ServerMetrics = () => {
    const { agent } = useOutletContext();
    const [history, setHistory] = useState([]);
    const [currentMetrics, setCurrentMetrics] = useState(null);
    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (data) => {
            if (data.agentId === agent?._id) {
                console.log('ServerMetrics received data:', data);
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

    if (!currentMetrics) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-gray-400 animate-pulse">Waiting for server metrics...</div>
                </div>
            </div>
        );
    }

    const downloadReport = () => {
        window.open(`${API_BASE_URL}/api/metrics/${agent._id}/report?days=7`, '_blank');
    };

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Server Metrics</h2>
                <button
                    onClick={downloadReport}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <i className="fas fa-file-pdf"></i> Download PDF Report (7 Days)
                </button>
            </div>

            {currentMetrics && (
                <div className="space-y-6">
                    {/* System Status & Uptime */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="glass p-6 rounded-xl border-l-4 border-blue-500">
                            <h3 className="text-sm text-gray-400 mb-1">System Uptime</h3>
                            <div className="text-xl font-mono text-white">
                                {currentMetrics.uptime ? (currentMetrics.uptime / 3600).toFixed(1) + ' hrs' : 'N/A'}
                            </div>
                        </div>
                        <div className="glass p-6 rounded-xl border-l-4 border-purple-500">
                            <h3 className="text-sm text-gray-400 mb-1">Agent Uptime</h3>
                            <div className="text-xl font-mono text-white">
                                {currentMetrics.agentUptime ? (currentMetrics.agentUptime / 3600).toFixed(1) + ' hrs' : 'N/A'}
                            </div>
                        </div>
                        <div className="glass p-6 rounded-xl border-l-4 border-green-500">
                            <h3 className="text-sm text-gray-400 mb-1">Last Reboot</h3>
                            <div className="text-sm font-mono text-white">
                                {currentMetrics.bootTime ? new Date(currentMetrics.bootTime).toLocaleString() : 'N/A'}
                            </div>
                        </div>
                        <div className="glass p-6 rounded-xl border-l-4 border-orange-500">
                            <h3 className="text-sm text-gray-400 mb-1">OS Info</h3>
                            <div className="text-sm font-mono text-white truncate" title={`${currentMetrics.os?.distro} ${currentMetrics.os?.release}`}>
                                {currentMetrics.os?.distro} {currentMetrics.os?.release}
                            </div>
                        </div>
                    </div>

                    {/* CPU & Load */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-4">Load Average</h3>
                            <div className="flex justify-between items-center">
                                <div className="text-center">
                                    <div className="text-sm text-gray-400">1 min</div>
                                    <div className={`text-xl font-mono ${currentMetrics.cpu.loadAvg?.[0] > currentMetrics.cpu.cores ? 'text-red-400' : 'text-blue-400'}`}>
                                        {currentMetrics.cpu.loadAvg?.[0]?.toFixed(2) || 'N/A'}
                                    </div>
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

                    {/* Top Processes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <i className="fas fa-microchip text-blue-400"></i> Top Processes (CPU)
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-400 border-b border-gray-700">
                                        <tr>
                                            <th className="pb-2">PID</th>
                                            <th className="pb-2">Name</th>
                                            <th className="pb-2">User</th>
                                            <th className="pb-2 text-right">CPU%</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        {currentMetrics.processes?.topCpu?.map(p => (
                                            <tr key={p.pid} className="border-b border-gray-800 last:border-0">
                                                <td className="py-2 text-gray-500">{p.pid}</td>
                                                <td className="py-2 text-white truncate max-w-[150px]" title={p.name}>{p.name}</td>
                                                <td className="py-2 text-gray-400">{p.user}</td>
                                                <td className="py-2 text-right text-blue-400">{p.cpu.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="glass p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <i className="fas fa-memory text-purple-400"></i> Top Processes (Memory)
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-400 border-b border-gray-700">
                                        <tr>
                                            <th className="pb-2">PID</th>
                                            <th className="pb-2">Name</th>
                                            <th className="pb-2">User</th>
                                            <th className="pb-2 text-right">Mem%</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        {currentMetrics.processes?.topMem?.map(p => (
                                            <tr key={p.pid} className="border-b border-gray-800 last:border-0">
                                                <td className="py-2 text-gray-500">{p.pid}</td>
                                                <td className="py-2 text-white truncate max-w-[150px]" title={p.name}>{p.name}</td>
                                                <td className="py-2 text-gray-400">{p.user}</td>
                                                <td className="py-2 text-right text-purple-400">{p.mem.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Security & Users */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <i className="fas fa-users text-green-400"></i> Active Users
                            </h3>
                            <div className="space-y-3 max-h-[200px] overflow-y-auto">
                                {currentMetrics.users?.length > 0 ? (
                                    currentMetrics.users.map((u, i) => (
                                        <div key={i} className="flex justify-between items-center border-b border-gray-800 pb-2 last:border-0">
                                            <div>
                                                <div className="font-medium text-white">{u.user}</div>
                                                <div className="text-xs text-gray-500">{u.tty} ({u.ip})</div>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {u.date} {u.time}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-gray-500 text-sm italic">No active users</div>
                                )}
                            </div>
                        </div>

                        <div className="glass p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <i className="fas fa-shield-alt text-red-400"></i> Failed Logins
                            </h3>
                            <div className="space-y-3 max-h-[200px] overflow-y-auto">
                                {currentMetrics.security?.failedLogins?.length > 0 ? (
                                    currentMetrics.security.failedLogins.map((l, i) => (
                                        <div key={i} className="border-b border-gray-800 pb-2 last:border-0">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-red-400 font-medium">{l.user || 'Unknown'}</span>
                                                <span className="text-gray-500 text-xs">{l.time}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 truncate" title={l.source}>
                                                Source: {l.source || l.message || 'N/A'}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-gray-500 text-sm italic">No recent failed logins</div>
                                )}
                            </div>
                        </div>

                        <div className="glass p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <i className="fas fa-user-shield text-yellow-400"></i> Sudo Usage
                            </h3>
                            <div className="space-y-3 max-h-[200px] overflow-y-auto">
                                {currentMetrics.security?.sudoUsage?.length > 0 ? (
                                    currentMetrics.security.sudoUsage.map((l, i) => (
                                        <div key={i} className="border-b border-gray-800 pb-2 last:border-0">
                                            <div className="text-xs text-gray-300 break-all font-mono">
                                                {l.raw}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-gray-500 text-sm italic">No recent sudo usage</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServerMetrics;
