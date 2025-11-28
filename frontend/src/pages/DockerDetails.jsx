import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const DockerDetails = ({ dockerData, agentName }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Local state for real-time updates
    const [localDockerData, setLocalDockerData] = useState(dockerData);
    const [selectedContainer, setSelectedContainer] = useState(null);
    const [activeTab, setActiveTab] = useState('containers');
    const [loadingAction, setLoadingAction] = useState(null); // {containerId, action}
    const [notification, setNotification] = useState(null); // {type, message}

    // Get agentId from location state
    const agentId = location.state?.agentId;

    // Update local state if props change (initial load or navigation)
    // Effect removed to avoid lint error. Initial state is set via useState.
    // If props update, we might need a key on the component to force remount.

    // Socket.io for real-time updates
    useEffect(() => {
        const socket = io('http://localhost:3000');

        // Listen for general dashboard updates (metrics)
        socket.on('dashboard:update', (data) => {
            // Check if update is for the current agent
            if (data.agentId === agentId && data.dockerDetails) {
                setLocalDockerData(data.dockerDetails);
            }
        });

        socket.on('docker:control:result', (data) => {
            console.log('Docker control result:', data);

            if (loadingAction && data.containerId === loadingAction.containerId) {
                setLoadingAction(null);

                if (data.success) {
                    setNotification({
                        type: 'success',
                        message: data.message
                    });
                } else {
                    setNotification({
                        type: 'error',
                        message: data.message || 'Operation failed'
                    });
                }

                // Clear notification after 5 seconds
                setTimeout(() => setNotification(null), 5000);
            }
        });

        return () => socket.disconnect();
    }, [loadingAction, agentId]);

    const handleDockerControl = async (containerId, action) => {
        if (!agentId) {
            setNotification({
                type: 'error',
                message: 'Agent ID not available'
            });
            return;
        }

        setLoadingAction({ containerId, action });

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `http://localhost:3000/api/agents/${agentId}/docker/control`,
                { action, containerId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('Control command sent:', response.data);

        } catch (error) {
            console.error('Error controlling container:', error);
            setLoadingAction(null);
            setNotification({
                type: 'error',
                message: error.response?.data?.message || 'Failed to send command'
            });
            setTimeout(() => setNotification(null), 5000);
        }
    };

    if (!localDockerData) {
        return (
            <div className="min-h-screen bg-bg-dark text-white p-8 pt-20">
                <div className="max-w-7xl mx-auto">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mb-6 flex items-center gap-2 text-accent hover:text-white transition-colors"
                    >
                        <i className="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                    <div className="glass p-12 rounded-xl text-center">
                        <i className="fas fa-exclamation-circle text-6xl text-yellow-500 mb-4"></i>
                        <p className="text-xl">No Docker data available</p>
                    </div>
                </div>
            </div>
        );
    }

    const { containers = [], images = [], volumes = [], info } = localDockerData;

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).toLocaleString();
    };

    const getStatusColor = (state) => {
        switch (state?.toLowerCase()) {
            case 'running': return 'bg-green-500';
            case 'exited': return 'bg-red-500';
            case 'paused': return 'bg-yellow-500';
            case 'restarting': return 'bg-blue-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-bg-dark text-white p-4 md:p-8 pt-20">
            <div className="max-w-7xl mx-auto">
                {/* Improved Notification Toast */}
                {notification && (
                    <div className={`fixed top-24 right-8 p-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-slide-in backdrop-blur-md border ${notification.type === 'success'
                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                        : 'bg-red-500/10 border-red-500/50 text-red-400'
                        }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${notification.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                            <i className={`fas ${notification.type === 'success' ? 'fa-check' : 'fa-exclamation'} text-sm`}></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">{notification.type === 'success' ? 'Success' : 'Error'}</h4>
                            <p className="text-sm opacity-90">{notification.message}</p>
                        </div>
                        <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mb-4 flex items-center gap-2 text-accent hover:text-white transition-colors"
                    >
                        <i className="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <i className="fab fa-docker text-blue-400"></i>
                                Docker Management
                            </h1>
                            <p className="text-text-secondary mt-2">
                                Managing Docker on {agentName}
                            </p>
                        </div>
                        {info && (
                            <div className="glass p-4 rounded-xl">
                                <div className="text-sm text-text-secondary">Docker Version</div>
                                <div className="text-xl font-bold">{info.serverVersion}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                {info && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="glass p-6 rounded-xl border-l-4 border-green-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-text-secondary text-sm">Running</p>
                                    <p className="text-3xl font-bold text-green-400">{info.containersRunning || 0}</p>
                                </div>
                                <i className="fas fa-play-circle text-4xl text-green-500 opacity-20"></i>
                            </div>
                        </div>
                        <div className="glass p-6 rounded-xl border-l-4 border-red-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-text-secondary text-sm">Stopped</p>
                                    <p className="text-3xl font-bold text-red-400">{info.containersStopped || 0}</p>
                                </div>
                                <i className="fas fa-stop-circle text-4xl text-red-500 opacity-20"></i>
                            </div>
                        </div>
                        <div className="glass p-6 rounded-xl border-l-4 border-blue-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-text-secondary text-sm">Images</p>
                                    <p className="text-3xl font-bold text-blue-400">{info.images || 0}</p>
                                </div>
                                <i className="fas fa-layer-group text-4xl text-blue-500 opacity-20"></i>
                            </div>
                        </div>
                        <div className="glass p-6 rounded-xl border-l-4 border-purple-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-text-secondary text-sm">Volumes</p>
                                    <p className="text-3xl font-bold text-purple-400">{volumes.length}</p>
                                </div>
                                <i className="fas fa-database text-4xl text-purple-500 opacity-20"></i>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('containers')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'containers'
                            ? 'bg-accent text-white'
                            : 'glass text-text-secondary hover:text-white'
                            }`}
                    >
                        <i className="fas fa-box mr-2"></i>
                        Containers ({containers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('images')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'images'
                            ? 'bg-accent text-white'
                            : 'glass text-text-secondary hover:text-white'
                            }`}
                    >
                        <i className="fas fa-layer-group mr-2"></i>
                        Images ({images.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('volumes')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'volumes'
                            ? 'bg-accent text-white'
                            : 'glass text-text-secondary hover:text-white'
                            }`}
                    >
                        <i className="fas fa-database mr-2"></i>
                        Volumes ({volumes.length})
                    </button>
                </div>

                {/* Container Details Modal */}
                {selectedContainer && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedContainer(null)}>
                        <div className="glass max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <i className="fas fa-box text-accent"></i>
                                    {selectedContainer.name}
                                </h2>
                                <button
                                    onClick={() => setSelectedContainer(null)}
                                    className="text-text-secondary hover:text-white transition-colors"
                                >
                                    <i className="fas fa-times text-2xl"></i>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div>
                                    <h3 className="text-lg font-bold mb-3 text-accent">Basic Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="overflow-hidden">
                                            <p className="text-text-secondary text-sm">Container ID</p>
                                            <p className="font-mono text-sm truncate" title={selectedContainer.id}>{selectedContainer.id}</p>
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-text-secondary text-sm">Image</p>
                                            <p className="font-medium truncate" title={selectedContainer.image}>{selectedContainer.image}</p>
                                        </div>
                                        <div>
                                            <p className="text-text-secondary text-sm">State</p>
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${selectedContainer.state === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {selectedContainer.state}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-text-secondary text-sm">Status</p>
                                            <p>{selectedContainer.status}</p>
                                        </div>
                                        <div>
                                            <p className="text-text-secondary text-sm">Created</p>
                                            <p className="text-sm">{formatDate(selectedContainer.created)}</p>
                                        </div>
                                        <div>
                                            <p className="text-text-secondary text-sm">Restart Count</p>
                                            <p>{selectedContainer.restartCount || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Resource Usage (if running) */}
                                {selectedContainer.stats && (
                                    <div>
                                        <h3 className="text-lg font-bold mb-3 text-accent">Resource Usage</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="bg-white/5 p-4 rounded-lg">
                                                <p className="text-text-secondary text-sm">CPU Usage</p>
                                                <p className="text-2xl font-bold text-blue-400">{selectedContainer.stats.cpuPercent.toFixed(2)}%</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-lg">
                                                <p className="text-text-secondary text-sm">Memory Usage</p>
                                                <p className="text-2xl font-bold text-purple-400">{selectedContainer.stats.memPercent.toFixed(2)}%</p>
                                                <p className="text-xs text-text-secondary mt-1">
                                                    {formatBytes(selectedContainer.stats.memUsage)} / {formatBytes(selectedContainer.stats.memLimit)}
                                                </p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-lg">
                                                <p className="text-text-secondary text-sm">PIDs</p>
                                                <p className="text-2xl font-bold text-green-400">{selectedContainer.stats.pids}</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-lg">
                                                <p className="text-text-secondary text-sm">Network RX</p>
                                                <p className="text-xl font-bold">{formatBytes(selectedContainer.stats.netIO.rx)}</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-lg">
                                                <p className="text-text-secondary text-sm">Network TX</p>
                                                <p className="text-xl font-bold">{formatBytes(selectedContainer.stats.netIO.wx)}</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-lg">
                                                <p className="text-text-secondary text-sm">Block I/O</p>
                                                <p className="text-sm">R: {formatBytes(selectedContainer.stats.blockIO.r)}</p>
                                                <p className="text-sm">W: {formatBytes(selectedContainer.stats.blockIO.w)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Port Bindings */}
                                {selectedContainer.ports && selectedContainer.ports.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold mb-3 text-accent">Port Bindings</h3>
                                        <div className="bg-white/5 p-4 rounded-lg">
                                            {selectedContainer.ports.map((port, idx) => (
                                                <div key={idx} className="flex items-center gap-2 py-2 border-b border-white/10 last:border-0">
                                                    <i className="fas fa-network-wired text-accent"></i>
                                                    <span className="font-mono">{JSON.stringify(port)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Volumes/Mounts */}
                                {selectedContainer.mounts && selectedContainer.mounts.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold mb-3 text-accent">Volumes & Mounts</h3>
                                        <div className="bg-white/5 p-4 rounded-lg space-y-2">
                                            {selectedContainer.mounts.map((mount, idx) => (
                                                <div key={idx} className="p-3 bg-white/5 rounded border-l-2 border-purple-500">
                                                    <p className="font-mono text-sm">{JSON.stringify(mount)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Command */}
                                {selectedContainer.command && (
                                    <div>
                                        <h3 className="text-lg font-bold mb-3 text-accent">Command</h3>
                                        <div className="bg-black/50 p-4 rounded-lg">
                                            <code className="text-sm text-green-400">{selectedContainer.command}</code>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="glass p-6 rounded-xl">
                    {/* Containers Tab */}
                    {activeTab === 'containers' && (
                        <div>
                            {containers.length === 0 ? (
                                <div className="text-center py-12">
                                    <i className="fas fa-box-open text-6xl text-white/10 mb-4"></i>
                                    <p className="text-text-secondary">No containers found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-text-secondary border-b border-white/10">
                                                <th className="p-3">Status</th>
                                                <th className="p-3">Name</th>
                                                <th className="p-3">Image</th>
                                                <th className="p-3">State</th>
                                                <th className="p-3">CPU</th>
                                                <th className="p-3">Memory</th>
                                                <th className="p-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {containers.map((container) => (
                                                <tr key={container.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="p-3">
                                                        <div className={`w-3 h-3 rounded-full ${getStatusColor(container.state)}`}></div>
                                                    </td>
                                                    <td className="p-3 font-medium">
                                                        {container.name}
                                                        <div className="text-xs text-text-secondary font-mono mt-1">{container.id.substring(0, 12)}</div>
                                                    </td>
                                                    <td className="p-3 text-text-secondary text-sm">{container.image}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${container.state === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                            }`}>
                                                            {container.state}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-sm">
                                                        {container.state === 'running' && container.stats ? `${container.stats.cpuPercent.toFixed(1)}%` : '-'}
                                                    </td>
                                                    <td className="p-3 text-sm">
                                                        {container.state === 'running' && container.stats ? `${container.stats.memPercent.toFixed(1)}%` : '-'}
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            {/* Control Buttons */}
                                                            {container.state === 'running' ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleDockerControl(container.id, 'stop')}
                                                                        disabled={loadingAction?.containerId === container.id}
                                                                        className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                                                                        title="Stop Container"
                                                                    >
                                                                        {loadingAction?.containerId === container.id && loadingAction?.action === 'stop' ? (
                                                                            <i className="fas fa-spinner fa-spin"></i>
                                                                        ) : (
                                                                            <i className="fas fa-stop"></i>
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDockerControl(container.id, 'restart')}
                                                                        disabled={loadingAction?.containerId === container.id}
                                                                        className="p-2 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500 hover:text-white transition-colors disabled:opacity-50"
                                                                        title="Restart Container"
                                                                    >
                                                                        {loadingAction?.containerId === container.id && loadingAction?.action === 'restart' ? (
                                                                            <i className="fas fa-spinner fa-spin"></i>
                                                                        ) : (
                                                                            <i className="fas fa-sync"></i>
                                                                        )}
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleDockerControl(container.id, 'start')}
                                                                    disabled={loadingAction?.containerId === container.id}
                                                                    className="p-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
                                                                    title="Start Container"
                                                                >
                                                                    {loadingAction?.containerId === container.id && loadingAction?.action === 'start' ? (
                                                                        <i className="fas fa-spinner fa-spin"></i>
                                                                    ) : (
                                                                        <i className="fas fa-play"></i>
                                                                    )}
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => setSelectedContainer(container)}
                                                                className="p-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500 hover:text-white transition-colors"
                                                                title="View Details"
                                                            >
                                                                <i className="fas fa-info-circle"></i>
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
                    )}

                    {/* Images Tab */}
                    {activeTab === 'images' && (
                        <div>
                            {images.length === 0 ? (
                                <div className="text-center py-12">
                                    <i className="fas fa-layer-group text-6xl text-white/10 mb-4"></i>
                                    <p className="text-text-secondary">No images found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-text-secondary border-b border-white/10">
                                                <th className="p-3">Image ID</th>
                                                <th className="p-3">Container</th>
                                                <th className="p-3">Size</th>
                                                <th className="p-3">Virtual Size</th>
                                                <th className="p-3">Architecture</th>
                                                <th className="p-3">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {images.map((image) => (
                                                <tr key={image.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="p-3 font-mono text-sm">{image.id?.substring(0, 12)}</td>
                                                    <td className="p-3">{image.container || 'N/A'}</td>
                                                    <td className="p-3 text-accent font-medium">{formatBytes(image.size)}</td>
                                                    <td className="p-3 text-text-secondary">{formatBytes(image.virtualSize)}</td>
                                                    <td className="p-3">{image.architecture || 'N/A'}</td>
                                                    <td className="p-3 text-sm text-text-secondary">
                                                        {formatDate(image.created)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Volumes Tab */}
                    {activeTab === 'volumes' && (
                        <div>
                            {volumes.length === 0 ? (
                                <div className="text-center py-12">
                                    <i className="fas fa-database text-6xl text-white/10 mb-4"></i>
                                    <p className="text-text-secondary">No volumes found</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {volumes.map((volume) => (
                                        <div key={volume.name} className="bg-white/5 p-4 rounded-lg border-l-4 border-purple-500">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-lg mb-2">{volume.name}</h3>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-text-secondary">Driver</p>
                                                            <p className="font-medium">{volume.driver}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-text-secondary">Scope</p>
                                                            <p className="font-medium">{volume.scope}</p>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <p className="text-text-secondary">Mountpoint</p>
                                                            <p className="font-mono text-xs">{volume.mountpoint}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DockerDetails;
