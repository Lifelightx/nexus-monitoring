import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import Notification from '../../components/Notification';
import { API_BASE_URL } from '../../config';

const DockerDetails = ({ dockerData, agentName, serverId: propServerId, initialTab = 'containers' }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get serverId from props or location state (fallback)
    const serverId = propServerId || location.state?.agentId;

    // Local state for real-time updates
    const [localDockerData, setLocalDockerData] = useState(dockerData || location.state?.dockerData);
    const [localAgentName, setLocalAgentName] = useState(agentName || location.state?.agentName);
    const [selectedContainer, setSelectedContainer] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [loadingAction, setLoadingAction] = useState(null); // {containerId, action}


    const [notification, setNotification] = useState(null); // {type, message}
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        image: '',
        name: '',
        ports: '', // "8080:80, 3000:3000"
        env: '', // "KEY=VALUE, KEY2=VALUE2"
        restart: 'no', // no, always, on-failure, unless-stopped
        command: ''
    });

    const socket = useSocket();

    // Update activeTab when initialTab changes
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    // Sync dockerData prop to local state
    useEffect(() => {
        if (dockerData) {
            setLocalDockerData(dockerData);
        }
    }, [dockerData]);

    // Socket.io for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleDashboardUpdate = (data) => {
            // Check if update is for the current agent
            if (data.agentId === serverId) {
                if (data.dockerDetails) {
                    setLocalDockerData(data.dockerDetails);
                }
                if (data.agent) {
                    setLocalAgentName(data.agent);
                }
            }
        };

        const handleControlResult = (data) => {
            console.log('Docker control result:', data);

            if (loadingAction && data.containerId === loadingAction.containerId) {
                setLoadingAction(null);

                if (data.success) {
                    setNotification({
                        type: 'success',
                        message: data.message
                    });
                    // Close modal if it was a create action
                    if (loadingAction.action === 'create') {
                        setShowCreateModal(false);
                        // Reset form
                        setCreateForm({
                            image: '',
                            name: '',
                            ports: '',
                            env: '',
                            restart: 'no',
                            command: ''
                        });
                    }
                } else {
                    setNotification({
                        type: 'error',
                        message: data.message || 'Operation failed'
                    });
                }

                // Notification handled by component auto-dismiss
            }
        };

        // Listen for general dashboard updates (metrics)
        socket.on('dashboard:update', handleDashboardUpdate);
        socket.on('docker:control:result', handleControlResult);

        return () => {
            socket.off('dashboard:update', handleDashboardUpdate);
            socket.off('docker:control:result', handleControlResult);
        };
    }, [loadingAction, serverId, socket]);

    const handleDockerControl = async (containerId, action, payload = null, skipLoadingState = false) => {
        if (!serverId) {
            setNotification({
                type: 'error',
                message: 'Agent ID not available'
            });
            return;
        }

        if (!skipLoadingState) setLoadingAction({ containerId, action });

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_BASE_URL}/api/agents/${serverId}/docker/control`,
                { action, containerId, payload },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('Control command sent:', response.data);

        } catch (error) {
            console.error('Error controlling container:', error);
            if (!skipLoadingState) setLoadingAction(null);
            setNotification({
                type: 'error',
                message: error.response?.data?.message || 'Failed to send command'
            });
            // Notification handled by component auto-dismiss
        }
    };

    if (!localDockerData) {
        return (
            <div className="min-h-screen bg-bg-dark text-white p-8 pt-20 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-text-secondary">Loading Docker details...</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mt-6 text-accent hover:text-white transition-colors text-sm"
                >
                    Return to Dashboard
                </button>
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
        <div className="text-white p-4" onClick={() => setActiveActionMenu(null)}>
            <div className="max-w-7xl mx-auto">
                {/* Improved Notification Toast */}
                <Notification
                    type={notification?.type}
                    message={notification?.message}
                    onClose={() => setNotification(null)}
                />

                {/* Header Removed - handled by ServerLayout */}

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

                {/* Tabs Removed - Handled by Sidebar */}
                <div className="flex justify-end mb-6">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 rounded-lg font-medium bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-500/20 text-sm flex items-center gap-2"
                    >
                        <i className="fas fa-plus"></i>
                        Create Container
                    </button>
                </div>

                {/* Create Container Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
                        <div className="glass max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-xl p-6 relative" onClick={(e) => e.stopPropagation()}>
                            {loadingAction?.action === 'create' && (
                                <div className="absolute inset-0 bg-bg-dark/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
                                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-white font-medium">Creating Container...</p>
                                    <p className="text-text-secondary text-sm mt-2">This may take a moment</p>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <i className="fas fa-plus-circle text-green-400"></i>
                                    Create Container
                                </h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-text-secondary hover:text-white transition-colors"
                                >
                                    <i className="fas fa-times text-2xl"></i>
                                </button>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handleDockerControl('new', 'create', createForm);
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Image Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., nginx:latest"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:border-accent focus:outline-none transition-colors"
                                        value={createForm.image}
                                        onChange={e => setCreateForm({ ...createForm, image: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Container Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., my-web-server"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:border-accent focus:outline-none transition-colors"
                                            value={createForm.name}
                                            onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Restart Policy</label>
                                        <select
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:border-accent focus:outline-none transition-colors"
                                            value={createForm.restart}
                                            onChange={e => setCreateForm({ ...createForm, restart: e.target.value })}
                                        >
                                            <option value="no">No</option>
                                            <option value="always">Always</option>
                                            <option value="on-failure">On Failure</option>
                                            <option value="unless-stopped">Unless Stopped</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Port Mapping (Host:Container)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 8080:80, 3000:3000"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:border-accent focus:outline-none transition-colors"
                                        value={createForm.ports}
                                        onChange={e => setCreateForm({ ...createForm, ports: e.target.value })}
                                    />
                                    <p className="text-xs text-text-secondary mt-1">Comma separated list of port mappings</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Environment Variables</label>
                                    <textarea
                                        rows="2"
                                        placeholder="e.g., NODE_ENV=production, DB_HOST=192.168.1.100"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:border-accent focus:outline-none transition-colors resize-none"
                                        value={createForm.env}
                                        onChange={e => setCreateForm({ ...createForm, env: e.target.value })}
                                    ></textarea>
                                    <p className="text-xs text-text-secondary mt-1">Comma separated list of KEY=VALUE pairs</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Command (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., npm start"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:border-accent focus:outline-none transition-colors"
                                        value={createForm.command}
                                        onChange={e => setCreateForm({ ...createForm, command: e.target.value })}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loadingAction?.action === 'create'}
                                        className="px-6 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loadingAction?.action === 'create' ? 'Creating...' : 'Create Container'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

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
                                                        <div className="flex items-center gap-2 relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedContainer(container);
                                                                }}
                                                                className="p-2 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500 hover:text-white transition-colors"
                                                                title="View Details"
                                                            >
                                                                <i className="fas fa-info-circle"></i>
                                                            </button>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (container.state === 'running') {
                                                                        navigate(`/server/${serverId}/docker/containers/${encodeURIComponent(container.name)}`, {
                                                                            state: {
                                                                                containerId: container.id,
                                                                                containerName: container.name,
                                                                                dockerData: localDockerData,
                                                                                agentName: localAgentName
                                                                            }
                                                                        });
                                                                    }
                                                                }}
                                                                disabled={container.state !== 'running'}
                                                                className={`p-2 rounded transition-colors ${container.state === 'running'
                                                                    ? 'bg-gray-500/10 text-gray-400 hover:bg-gray-500 hover:text-white'
                                                                    : 'bg-gray-500/5 text-gray-600 cursor-not-allowed opacity-50'
                                                                    }`}
                                                                title={container.state === 'running' ? "Logs & Terminal" : "Start container to view logs/terminal"}
                                                            >
                                                                <i className="fas fa-terminal"></i>
                                                            </button>

                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveActionMenu(activeActionMenu === container.id ? null : container.id);
                                                                    }}
                                                                    className={`p-2 rounded hover:bg-white/10 hover:text-white transition-colors ${activeActionMenu === container.id ? 'bg-white/10 text-white' : 'bg-white/5 text-text-secondary'}`}
                                                                >
                                                                    <i className="fas fa-ellipsis-v w-4"></i>
                                                                </button>
                                                                {activeActionMenu === container.id && (
                                                                    <div className="absolute right-0 top-full mt-2 w-48 bg-bg-card border border-white/10 rounded-lg shadow-xl z-20 backdrop-blur-xl">
                                                                        {container.state === 'running' ? (
                                                                            <>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDockerControl(container.id, 'restart');
                                                                                        setActiveActionMenu(null);
                                                                                    }}
                                                                                    disabled={loadingAction?.containerId === container.id}
                                                                                    className="w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-white/5 first:rounded-t-lg flex items-center gap-2"
                                                                                >
                                                                                    {loadingAction?.containerId === container.id && loadingAction?.action === 'restart' ? (
                                                                                        <i className="fas fa-spinner fa-spin w-4"></i>
                                                                                    ) : (
                                                                                        <i className="fas fa-sync w-4"></i>
                                                                                    )}
                                                                                    Restart
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDockerControl(container.id, 'stop');
                                                                                        setActiveActionMenu(null);
                                                                                    }}
                                                                                    disabled={loadingAction?.containerId === container.id}
                                                                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 last:rounded-b-lg flex items-center gap-2"
                                                                                >
                                                                                    {loadingAction?.containerId === container.id && loadingAction?.action === 'stop' ? (
                                                                                        <i className="fas fa-spinner fa-spin w-4"></i>
                                                                                    ) : (
                                                                                        <i className="fas fa-stop w-4"></i>
                                                                                    )}
                                                                                    Stop
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDockerControl(container.id, 'start');
                                                                                    setActiveActionMenu(null);
                                                                                }}
                                                                                disabled={loadingAction?.containerId === container.id}
                                                                                className="w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-white/5 first:rounded-t-lg flex items-center gap-2"
                                                                            >
                                                                                {loadingAction?.containerId === container.id && loadingAction?.action === 'start' ? (
                                                                                    <i className="fas fa-spinner fa-spin w-4"></i>
                                                                                ) : (
                                                                                    <i className="fas fa-play w-4"></i>
                                                                                )}
                                                                                Start
                                                                            </button>
                                                                        )}
                                                                        {container.state !== 'running' && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDockerControl(container.id, 'remove');
                                                                                    setActiveActionMenu(null);
                                                                                }}
                                                                                disabled={loadingAction?.containerId === container.id}
                                                                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-white/5 last:rounded-b-lg flex items-center gap-2 border-t border-white/5"
                                                                            >
                                                                                {loadingAction?.containerId === container.id && loadingAction?.action === 'remove' ? (
                                                                                    <i className="fas fa-spinner fa-spin w-4"></i>
                                                                                ) : (
                                                                                    <i className="fas fa-trash w-4"></i>
                                                                                )}
                                                                                Delete
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
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
                                                <th className="p-3">ID</th>
                                                <th className="p-3">Name</th>
                                                <th className="p-3">Size</th>
                                                <th className="p-3">Architecture</th>
                                                <th className="p-3">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...images]
                                                .sort((a, b) => {
                                                    const getTag = (img) => img.repoTags?.find(t => t !== '<none>:<none>');
                                                    const aTag = getTag(a);
                                                    const bTag = getTag(b);
                                                    if (aTag && !bTag) return -1;
                                                    if (!aTag && bTag) return 1;
                                                    return 0;
                                                })
                                                .map((image) => (
                                                    <tr
                                                        key={image.id}
                                                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                                        onClick={() => {
                                                            const imageName = image.repoTags && image.repoTags.length > 0
                                                                ? image.repoTags.find(t => t !== '<none>:<none>') || image.repoTags[0]
                                                                : image.id;
                                                            // Encode image name to handle slashes in repo/tag
                                                            navigate(`/server/${serverId}/docker/images/${encodeURIComponent(imageName)}`, {
                                                                state: {
                                                                    dockerData: localDockerData,
                                                                    agentName: localAgentName
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        <td className="p-3 font-mono text-sm text-text-secondary">
                                                            {image.id?.replace('sha256:', '').substring(0, 12) || 'N/A'}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="font-medium text-blue-400 hover:text-blue-300 transition-colors underline">
                                                                {image.repoTags && image.repoTags.length > 0
                                                                    ? image.repoTags.filter(t => t !== '<none>:<none>').join(', ') || '<none>'
                                                                    : '<none>'}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-sm">{formatBytes(image.size)}</td>
                                                        <td className="p-3 text-sm">{image.architecture}</td>
                                                        <td className="p-3 text-sm">{formatDate(image.created)}</td>
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
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-text-secondary border-b border-white/10">
                                                <th className="p-3">Name</th>
                                                <th className="p-3">Driver</th>
                                                <th className="p-3">Mount Point</th>
                                                <th className="p-3">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {volumes.map((volume) => (
                                                <tr key={volume.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="p-3 font-medium text-white">{volume.name}</td>
                                                    <td className="p-3 text-sm text-text-secondary">{volume.driver}</td>
                                                    <td className="p-3 font-mono text-xs text-text-secondary">{volume.mountpoint}</td>
                                                    <td className="p-3 text-sm">{volume.createdAt || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Networks Tab */}
                    {activeTab === 'networks' && (
                        <div>
                            {localDockerData.networks && localDockerData.networks.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-text-secondary border-b border-white/10">
                                                <th className="p-3">Name</th>
                                                <th className="p-3">Driver</th>
                                                <th className="p-3">Scope</th>
                                                <th className="p-3">Subnet</th>
                                                <th className="p-3">Containers</th>
                                                <th className="p-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {localDockerData.networks.map((network) => (
                                                <tr
                                                    key={network.id}
                                                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                                    onClick={() => navigate(`/server/${serverId}/docker/networks/${encodeURIComponent(network.name)}`, {
                                                        state: {
                                                            dockerData: localDockerData,
                                                            agentName: localAgentName
                                                        }
                                                    })}
                                                >
                                                    <td className="p-3 font-medium text-white">
                                                        {network.name}
                                                        <div className="text-xs text-text-secondary font-mono mt-1">{network.id.substring(0, 12)}</div>
                                                    </td>
                                                    <td className="p-3 text-sm text-text-secondary">{network.driver}</td>
                                                    <td className="p-3 text-sm text-text-secondary">{network.scope}</td>
                                                    <td className="p-3 font-mono text-xs text-text-secondary">
                                                        {network.ipam?.config?.[0]?.subnet || '-'}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${network.containers?.length > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                                            {network.containers?.length || 0} Containers
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`Are you sure you want to delete network "${network.name}"?`)) {
                                                                    handleDockerControl(network.id, 'removeNetwork');
                                                                }
                                                            }}
                                                            disabled={loadingAction?.containerId === network.id}
                                                            className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500 hover:text-white transition-colors"
                                                            title="Delete Network"
                                                        >
                                                            {loadingAction?.containerId === network.id && loadingAction?.action === 'removeNetwork' ? (
                                                                <i className="fas fa-spinner fa-spin"></i>
                                                            ) : (
                                                                <i className="fas fa-trash"></i>
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <i className="fas fa-network-wired text-6xl text-white/10 mb-4"></i>
                                    <p className="text-text-secondary">No networks found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Container Details Modal */}
                {selectedContainer && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedContainer(null)}>
                        <div className="glass max-w-4xl w-full max-h-[85vh] overflow-y-auto rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
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
                                            <p>{selectedContainer.status || 'Unknown'}</p>
                                        </div>
                                        <div>
                                            <p className="text-text-secondary text-sm">Created</p>
                                            <p className="text-sm">{formatDate(selectedContainer.created)}</p>
                                        </div>
                                        <div>
                                            <p className="text-text-secondary text-sm">Uptime</p>
                                            <p className="text-sm">
                                                {selectedContainer.state === 'running' && selectedContainer.started
                                                    ? (() => {
                                                        const started = new Date(selectedContainer.started * 1000);
                                                        const now = new Date();
                                                        const diff = Math.floor((now - started) / 1000);
                                                        const hours = Math.floor(diff / 3600);
                                                        const minutes = Math.floor((diff % 3600) / 60);
                                                        return `${hours}h ${minutes}m`;
                                                    })()
                                                    : 'N/A'}
                                            </p>
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
                                                <p className="text-2xl font-bold text-blue-400">
                                                    {selectedContainer.stats.cpuPercent.toFixed(2)}%
                                                    <span className="text-xs text-text-secondary ml-1 font-normal">(of total capacity)</span>
                                                </p>
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
                                                    <span className="font-mono">
                                                        {port.PublicPort ? `${port.PublicPort}:` : ''}{port.PrivatePort}/{port.Type}
                                                    </span>
                                                    {port.IP && <span className="text-xs text-text-secondary">({port.IP})</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Volumes/Mounts */}
                                {selectedContainer.mounts && selectedContainer.mounts.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold mb-3 text-accent">Volumes & Mounts</h3>
                                        <div className="bg-white/5 p-4 rounded-lg space-y-2 max-h-60 overflow-y-auto">
                                            {selectedContainer.mounts.map((mount, idx) => (
                                                <div key={idx} className="p-3 bg-white/5 rounded border-l-2 border-purple-500">
                                                    <div className="grid grid-cols-1 gap-1 text-sm">
                                                        {Object.entries(mount).map(([key, value]) => (
                                                            <div key={key} className="grid grid-cols-3 gap-2">
                                                                <span className="text-text-secondary font-medium">{key}:</span>
                                                                <span className="col-span-2 font-mono text-xs break-all">{String(value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DockerDetails;
