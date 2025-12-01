import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';

const DockerNetworkDetails = ({ dockerData: propDockerData, agentName: propAgentName, serverId: propServerId }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { serverId: paramServerId, networkName: paramNetworkName } = useParams();

    const serverId = propServerId || paramServerId || location.state?.agentId;
    const networkName = decodeURIComponent(paramNetworkName || '');

    // Local state
    const [localDockerData, setLocalDockerData] = useState(propDockerData || location.state?.dockerData);
    const [localAgentName, setLocalAgentName] = useState(propAgentName || location.state?.agentName);
    const [loadingAction, setLoadingAction] = useState(null); // {action, networkId}
    const [notification, setNotification] = useState(null);

    const socket = useSocket();

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        const handleDashboardUpdate = (data) => {
            if (data.agentId === serverId) {
                if (data.dockerDetails) {
                    setLocalDockerData(data.dockerDetails);
                }
                if (data.agent) {
                    setLocalAgentName(data.agent);
                }
            }
        };

        socket.on('dashboard:update', handleDashboardUpdate);

        return () => {
            socket.off('dashboard:update', handleDashboardUpdate);
        };
    }, [serverId, socket]);

    const handleDockerControl = async (containerId, action, payload = null, skipLoadingState = false) => {
        if (!serverId) return { success: false, message: 'Server ID missing' };
        if (!skipLoadingState) setLoadingAction({ containerId, action });

        try {
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await axios.post(
                `${apiUrl}/api/agents/${serverId}/docker/control`,
                { action, containerId, payload },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!skipLoadingState) {
                setLoadingAction(null);
                setNotification({
                    type: 'success',
                    message: response.data.message || 'Command sent successfully'
                });
                setTimeout(() => setNotification(null), 3000);
            }
            return { success: true, ...response.data };
        } catch (error) {
            console.error('Error controlling container:', error);
            if (!skipLoadingState) {
                setLoadingAction(null);
                setNotification({
                    type: 'error',
                    message: error.response?.data?.message || 'Failed to send command'
                });
                setTimeout(() => setNotification(null), 3000);
            }
            return { success: false, message: error.response?.data?.message || error.message };
        }
    };

    if (!localDockerData) {
        return <div className="min-h-screen bg-bg-dark text-white p-8 pt-20 flex justify-center">Loading...</div>;
    }

    const network = localDockerData.networks?.find(n => n.name === networkName);

    if (!network) {
        return (
            <div className="min-h-screen bg-bg-dark text-white p-8 pt-20">
                <div className="max-w-7xl mx-auto">
                    <button
                        onClick={() => navigate(`/server/${serverId}/docker-details`, { state: { dockerData: localDockerData, agentName: localAgentName, activeTab: 'networks' } })}
                        className="mb-4 flex items-center gap-2 text-accent hover:text-white transition-colors"
                    >
                        <i className="fas fa-arrow-left"></i> Back to Docker Details
                    </button>
                    <div className="text-center py-12">
                        <i className="fas fa-network-wired text-6xl text-white/10 mb-4"></i>
                        <p className="text-text-secondary">Network "{networkName}" not found.</p>
                    </div>
                </div>
            </div>
        );
    }

    const containers = localDockerData.containers || [];
    const connectedContainers = network.containers?.map(nc => {
        // Match container by ID (handle potential short vs long ID differences)
        const fullContainer = containers.find(c =>
            c.id === nc.id ||
            (c.id && nc.id && (c.id.startsWith(nc.id) || nc.id.startsWith(c.id)))
        );

        return {
            ...nc,
            state: fullContainer?.state || 'unknown',
            status: fullContainer?.status || 'Unknown'
        };
    }) || [];

    const runningContainers = connectedContainers.filter(c => c.state === 'running');
    const stoppedContainers = connectedContainers.filter(c => c.state !== 'running');

    return (
        <div className="min-h-screen bg-bg-dark text-white p-4 md:p-8 pt-20">
            <div className="max-w-7xl mx-auto">
                {notification && (
                    <div className={`fixed top-24 right-8 p-4 rounded-xl shadow-2xl z-50 animate-slide-in border ${notification.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
                        }`}>
                        {notification.message}
                    </div>
                )}

                <div className="mb-8">
                    <button
                        onClick={() => navigate(`/server/${serverId}/docker-details`, { state: { dockerData: localDockerData, agentName: localAgentName, activeTab: 'networks' } })}
                        className="mb-4 flex items-center gap-2 text-accent hover:text-white transition-colors"
                    >
                        <i className="fas fa-arrow-left"></i> Back to Docker Details
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <i className="fas fa-network-wired text-blue-400"></i>
                                {network.name}
                            </h1>
                            <p className="text-text-secondary mt-2">
                                Network Details & Management
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    const toStart = stoppedContainers;
                                    if (toStart.length === 0) return;
                                    setLoadingAction({ action: 'startAll', networkId: network.id });

                                    let successCount = 0;
                                    let failCount = 0;

                                    for (const c of toStart) {
                                        const res = await handleDockerControl(c.id, 'start', null, true);
                                        if (res && res.success) successCount++;
                                        else failCount++;
                                    }

                                    setLoadingAction(null);
                                    if (failCount === 0) {
                                        setNotification({ type: 'success', message: `Successfully started all ${successCount} containers` });
                                    } else {
                                        setNotification({ type: 'warning', message: `Started ${successCount} containers, failed to start ${failCount}` });
                                    }
                                    setTimeout(() => setNotification(null), 3000);
                                }}
                                disabled={loadingAction?.networkId === network.id || stoppedContainers.length === 0}
                                className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingAction?.action === 'startAll' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-play"></i>}
                                Start All
                            </button>
                            <button
                                onClick={async () => {
                                    const toRestart = connectedContainers;
                                    if (toRestart.length === 0) return;
                                    setLoadingAction({ action: 'restartAll', networkId: network.id });

                                    let successCount = 0;
                                    let failCount = 0;

                                    for (const c of toRestart) {
                                        const res = await handleDockerControl(c.id, 'restart', null, true);
                                        if (res && res.success) successCount++;
                                        else failCount++;
                                    }

                                    setLoadingAction(null);
                                    if (failCount === 0) {
                                        setNotification({ type: 'success', message: `Successfully restarted all ${successCount} containers` });
                                    } else {
                                        setNotification({ type: 'warning', message: `Restarted ${successCount} containers, failed to restart ${failCount}` });
                                    }
                                    setTimeout(() => setNotification(null), 3000);
                                }}
                                disabled={loadingAction?.networkId === network.id || connectedContainers.length === 0}
                                className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500 hover:text-white transition-all border border-yellow-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingAction?.action === 'restartAll' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync"></i>}
                                Restart All
                            </button>
                            <button
                                onClick={async () => {
                                    const toStop = runningContainers;
                                    if (toStop.length === 0) return;
                                    setLoadingAction({ action: 'stopAll', networkId: network.id });

                                    let successCount = 0;
                                    let failCount = 0;

                                    for (const c of toStop) {
                                        const res = await handleDockerControl(c.id, 'stop', null, true);
                                        if (res && res.success) successCount++;
                                        else failCount++;
                                    }

                                    setLoadingAction(null);
                                    if (failCount === 0) {
                                        setNotification({ type: 'success', message: `Successfully stopped all ${successCount} containers` });
                                    } else {
                                        setNotification({ type: 'warning', message: `Stopped ${successCount} containers, failed to stop ${failCount}` });
                                    }
                                    setTimeout(() => setNotification(null), 3000);
                                }}
                                disabled={loadingAction?.networkId === network.id || runningContainers.length === 0}
                                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingAction?.action === 'stopAll' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-stop"></i>}
                                Stop All
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="glass p-6 rounded-xl border-l-4 border-blue-500">
                        <p className="text-text-secondary text-sm">Driver</p>
                        <p className="text-xl font-bold text-white">{network.driver}</p>
                    </div>
                    <div className="glass p-6 rounded-xl border-l-4 border-purple-500">
                        <p className="text-text-secondary text-sm">Subnet</p>
                        <p className="text-xl font-mono text-white">{network.subnet || 'N/A'}</p>
                    </div>
                    <div className="glass p-6 rounded-xl border-l-4 border-green-500">
                        <p className="text-text-secondary text-sm">Gateway</p>
                        <p className="text-xl font-mono text-white">{network.gateway || 'N/A'}</p>
                    </div>
                </div>

                <div className="glass p-6 rounded-xl">
                    <h2 className="text-xl font-bold mb-4">Connected Containers ({connectedContainers.length})</h2>
                    {connectedContainers.length === 0 ? (
                        <p className="text-text-secondary">No containers connected to this network.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-text-secondary border-b border-white/10">
                                        <th className="p-3">Name</th>
                                        <th className="p-3">IPv4 Address</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {connectedContainers.map(container => (
                                        <tr key={container.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-3 font-medium">
                                                {container.name}
                                                <div className="text-xs text-text-secondary font-mono mt-1">{container.id.substring(0, 12)}</div>
                                            </td>
                                            <td className="p-3 font-mono text-sm">{container.ipv4 || 'N/A'}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs ${container.state === 'running' ? 'bg-green-500/20 text-green-400' :
                                                    container.state === 'exited' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {container.state}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {container.state === 'running' ? (
                                                        <button
                                                            onClick={() => handleDockerControl(container.id, 'stop')}
                                                            className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors"
                                                            title="Stop"
                                                            disabled={loadingAction?.containerId === container.id}
                                                        >
                                                            {loadingAction?.containerId === container.id && loadingAction?.action === 'stop' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-stop"></i>}
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleDockerControl(container.id, 'start')}
                                                                className="p-2 bg-green-500/10 text-green-400 rounded hover:bg-green-500 hover:text-white transition-colors"
                                                                title="Start"
                                                                disabled={loadingAction?.containerId === container.id}
                                                            >
                                                                {loadingAction?.containerId === container.id && loadingAction?.action === 'start' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-play"></i>}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDockerControl(container.id, 'remove')}
                                                                className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors"
                                                                title="Delete"
                                                                disabled={loadingAction?.containerId === container.id}
                                                            >
                                                                {loadingAction?.containerId === container.id && loadingAction?.action === 'remove' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleDockerControl(container.id, 'restart')}
                                                        className="p-2 bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500 hover:text-white transition-colors"
                                                        title="Restart"
                                                        disabled={loadingAction?.containerId === container.id}
                                                    >
                                                        {loadingAction?.containerId === container.id && loadingAction?.action === 'restart' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync"></i>}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DockerNetworkDetails;
