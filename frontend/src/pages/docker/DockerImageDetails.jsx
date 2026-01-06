import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import Notification from '../../components/Notification';
import { API_BASE_URL } from '../../config';

const DockerImageDetails = ({ dockerData: propDockerData, agentName: propAgentName, serverId: propServerId }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { serverId: paramServerId, imageName: paramImageName } = useParams();

    const serverId = propServerId || paramServerId || location.state?.agentId;
    const imageName = decodeURIComponent(paramImageName || '');

    // Local state
    const [localDockerData, setLocalDockerData] = useState(propDockerData || location.state?.dockerData);
    const [localAgentName, setLocalAgentName] = useState(propAgentName || location.state?.agentName);
    const [loadingAction, setLoadingAction] = useState(null); // {containerId, action} or {imageId, action}
    const [notification, setNotification] = useState(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
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

        const handleControlResult = (data) => {
            if (!loadingAction) return;

            // Handle Bulk Actions
            if (loadingAction.action === 'stopAll' || loadingAction.action === 'deleteAll') {
                if (loadingAction.pendingIds && loadingAction.pendingIds.includes(data.containerId)) {
                    const newPendingIds = loadingAction.pendingIds.filter(id => id !== data.containerId);

                    // Update state with remaining IDs
                    if (newPendingIds.length > 0) {
                        setLoadingAction(prev => ({ ...prev, pendingIds: newPendingIds }));
                    } else {
                        // All done
                        setLoadingAction(null);
                        setNotification({
                            type: 'success',
                            message: loadingAction.action === 'stopAll' ? 'All containers stopped' : 'All containers deleted'
                        });
                        // Notification handled by component auto-dismiss

                        if (loadingAction.action === 'deleteAll') {
                            setShowDeleteAllModal(false);
                        }
                    }
                }
                // Suppress individual notifications during bulk action
                return;
            }

            // Handle Single Actions
            if (loadingAction && (data.containerId === loadingAction.containerId || (data.action === 'removeImage') || (data.action === 'create'))) {
                setLoadingAction(null);
                if (data.success) {
                    setNotification({ type: 'success', message: data.message });
                    if (data.action === 'removeImage') {
                        // Navigate back to docker images list on successful image deletion
                        setTimeout(() => {
                            navigate(`/server/${serverId}/docker/images`, {
                                state: { dockerData: localDockerData, agentName: localAgentName }
                            });
                        }, 1500);
                    } else if (data.action === 'create') {
                        // Close modal and reset form on successful container creation
                        setShowCreateModal(false);
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
                    setNotification({ type: 'error', message: data.message || 'Operation failed' });
                }
                // Notification handled by component auto-dismiss
            }
        };

        socket.on('dashboard:update', handleDashboardUpdate);
        socket.on('docker:control:result', handleControlResult);

        return () => {
            socket.off('dashboard:update', handleDashboardUpdate);
            socket.off('docker:control:result', handleControlResult);
        };
    }, [loadingAction, serverId, socket, navigate, localDockerData, localAgentName]);

    const handleDockerControl = async (containerId, action, payload = null, skipLoadingState = false) => {
        if (!serverId) return;
        if (!skipLoadingState) setLoadingAction({ containerId, action });

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_BASE_URL}/api/agents/${serverId}/docker/control`,
                { action, containerId, payload },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.error('Error controlling container:', error);
            if (!skipLoadingState) setLoadingAction(null);
            setNotification({
                type: 'error',
                message: error.response?.data?.message || 'Failed to send command'
            });
        }
    };

    const handleImageControl = async (action) => {
        if (!serverId) return;
        setLoadingAction({ imageId: imageName, action });

        try {
            const token = localStorage.getItem('token');
            // Find image ID from name
            const imageObj = localDockerData?.images?.find(img => img.repoTags?.includes(imageName));
            const imageId = imageObj?.id;

            if (!imageId && action === 'removeImage') {
                setNotification({ type: 'error', message: 'Image ID not found' });
                setLoadingAction(null);
                return;
            }

            const apiUrl = API_BASE_URL;
            await axios.post(
                `${apiUrl}/api/agents/${serverId}/docker/control`,
                { action, containerId: 'image-action', payload: { imageId } }, // Sending dummy containerId
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.error('Error controlling image:', error);
            setLoadingAction(null);
            setNotification({
                type: 'error',
                message: error.response?.data?.message || 'Failed to send command'
            });
        }
    };

    if (!localDockerData) {
        return <div className="min-h-screen bg-bg-dark text-white p-8 pt-20 flex justify-center">Loading...</div>;
    }

    // Find the image object to get its ID
    const imageObj = localDockerData.images.find(img => img.repoTags?.includes(imageName));
    const imageId = imageObj?.id;

    const imageContainers = localDockerData.containers.filter(c => {
        // 1. Match by Image ID (Robust)
        if (imageId && c.imageID === imageId) return true;
        // 2. Match by exact Image Name (Tag)
        if (c.image === imageName) return true;
        // 3. Match if container image is one of the repo tags
        if (imageObj?.repoTags?.includes(c.image)) return true;

        return false;
    });

    const runningContainers = imageContainers.filter(c => c.state === 'running');
    const stoppedContainers = imageContainers.filter(c => c.state !== 'running');

    const handleStopAll = () => {
        const idsToStop = runningContainers.map(c => c.id);
        setLoadingAction({ action: 'stopAll', pendingIds: idsToStop });

        idsToStop.forEach(id => {
            handleDockerControl(id, 'stop', null, true);
        });
    };

    const handleDeleteAll = () => {
        const idsToDelete = stoppedContainers.map(c => c.id);
        setLoadingAction({ action: 'deleteAll', pendingIds: idsToDelete });

        idsToDelete.forEach(id => {
            handleDockerControl(id, 'remove', null, true);
        });
        // Don't close modal yet, wait for completion
    };

    return (
        <div className="text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <Notification
                    type={notification?.type}
                    message={notification?.message}
                    onClose={() => setNotification(null)}
                />

                <div className="mb-8">
                    <button
                        onClick={() => navigate(`/server/${serverId}/docker/images`, { state: { dockerData: localDockerData, agentName: localAgentName } })}
                        className="mb-4 flex items-center gap-2 text-accent hover:text-white transition-colors"
                    >
                        <i className="fas fa-arrow-left"></i> Back to Images
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3 text-blue-400">
                                <i className="fas fa-layer-group"></i>
                                {imageName}
                            </h1>
                            <p className="text-text-secondary mt-2">
                                {imageContainers.length} Containers ({runningContainers.length} Running, {stoppedContainers.length} Stopped)
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {runningContainers.length > 0 ? (
                                <button
                                    onClick={handleStopAll}
                                    disabled={loadingAction?.action === 'stopAll'}
                                    className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 flex items-center gap-2"
                                >
                                    {loadingAction?.action === 'stopAll' ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                    ) : (
                                        <i className="fas fa-stop-circle"></i>
                                    )}
                                    Stop All
                                </button>
                            ) : stoppedContainers.length > 0 ? (
                                <button
                                    onClick={() => setShowDeleteAllModal(true)}
                                    className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                >
                                    <i className="fas fa-trash-alt mr-2"></i> Delete All
                                </button>
                            ) : null}

                            <button
                                onClick={() => {
                                    setCreateForm({ ...createForm, image: imageName });
                                    setShowCreateModal(true);
                                }}
                                className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-500/20 flex items-center gap-2"
                            >
                                <i className="fas fa-plus"></i>
                                Create Container
                            </button>

                            <button
                                onClick={() => handleImageControl('removeImage')}
                                disabled={imageContainers.length > 0 || loadingAction?.action === 'removeImage'}
                                className={`px-4 py-2 rounded-lg transition-all shadow-lg flex items-center gap-2 ${imageContainers.length > 0
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                                    : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20'
                                    }`}
                                title={imageContainers.length > 0 ? "Remove all containers first" : "Delete Image"}
                            >
                                {loadingAction?.imageId === imageName && loadingAction?.action === 'removeImage' ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                    <i className="fas fa-trash"></i>
                                )}
                                Delete Image
                            </button>
                        </div>
                    </div>
                </div>



                <div className="glass p-6 rounded-xl">
                    <h2 className="text-xl font-bold mb-4">Containers</h2>
                    {imageContainers.length === 0 ? (
                        <p className="text-text-secondary">No containers found for this image.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-text-secondary border-b border-white/10">
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">State</th>
                                        <th className="p-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {imageContainers.map(container => (
                                        <tr key={container.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-3">
                                                <div className={`w-3 h-3 rounded-full ${container.state === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            </td>
                                            <td className="p-3 font-medium">
                                                {container.name}
                                                <div className="text-xs text-text-secondary font-mono mt-1">{container.id.substring(0, 12)}</div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs ${container.state === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
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
                                                            {loadingAction?.containerId === container.id && loadingAction?.action === 'stop' ? (
                                                                <i className="fas fa-spinner fa-spin"></i>
                                                            ) : (
                                                                <i className="fas fa-stop"></i>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDockerControl(container.id, 'start')}
                                                            className="p-2 bg-green-500/10 text-green-400 rounded hover:bg-green-500 hover:text-white transition-colors"
                                                            title="Start"
                                                            disabled={loadingAction?.containerId === container.id}
                                                        >
                                                            {loadingAction?.containerId === container.id && loadingAction?.action === 'start' ? (
                                                                <i className="fas fa-spinner fa-spin"></i>
                                                            ) : (
                                                                <i className="fas fa-play"></i>
                                                            )}
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleDockerControl(container.id, 'remove')}
                                                        disabled={container.state === 'running' || loadingAction?.containerId === container.id}
                                                        className={`p-2 rounded transition-colors ${container.state === 'running'
                                                            ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                                            : 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'
                                                            }`}
                                                        title={container.state === 'running' ? "Stop container first" : "Delete"}
                                                    >
                                                        {loadingAction?.containerId === container.id && loadingAction?.action === 'remove' ? (
                                                            <i className="fas fa-spinner fa-spin"></i>
                                                        ) : (
                                                            <i className="fas fa-trash"></i>
                                                        )}
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

                <div className="glass p-6 rounded-xl mt-8">
                    <h2 className="text-xl font-bold mb-4">Image Layers</h2>
                    {imageObj?.history && imageObj.history.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-text-secondary border-b border-white/10">
                                        <th className="p-3">Created</th>
                                        <th className="p-3">Created By</th>
                                        <th className="p-3">Size</th>
                                        <th className="p-3">Comment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {imageObj.history.map((layer, idx) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-3 whitespace-nowrap text-text-secondary">
                                                {layer.CreatedSince}
                                            </td>
                                            <td className="p-3 font-mono text-xs max-w-md truncate" title={layer.CreatedBy}>
                                                {layer.CreatedBy}
                                            </td>
                                            <td className="p-3 font-mono">
                                                {layer.Size}
                                            </td>
                                            <td className="p-3 text-text-secondary max-w-xs truncate" title={layer.Comment}>
                                                {layer.Comment}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-text-secondary">No layer history available.</p>
                    )}
                </div>
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
                                Create Container from {imageName}
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
                                    readOnly
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:border-accent focus:outline-none transition-colors cursor-not-allowed opacity-75"
                                    value={createForm.image}
                                />
                                <p className="text-xs text-text-secondary mt-1">Image is pre-selected and cannot be changed</p>
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

            {/* Delete All Confirmation Modal */}
            {
                showDeleteAllModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteAllModal(false)}>
                        <div className="glass max-w-md w-full rounded-xl p-6 border border-red-500/30" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-4 mb-4 text-red-400">
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <i className="fas fa-exclamation-triangle text-xl"></i>
                                </div>
                                <h3 className="text-xl font-bold">Delete All Containers?</h3>
                            </div>

                            <p className="text-text-secondary mb-6">
                                Are you sure you want to delete all {stoppedContainers.length} stopped containers? This action cannot be undone.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteAllModal(false)}
                                    className="px-4 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAll}
                                    disabled={loadingAction?.action === 'deleteAll'}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 flex items-center gap-2"
                                >
                                    {loadingAction?.action === 'deleteAll' ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                    ) : null}
                                    Delete All
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DockerImageDetails;
