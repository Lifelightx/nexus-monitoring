import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import Notification from '../../components/Notification';

const AlertsPage = () => {
    const [activeTab, setActiveTab] = useState('alerts');
    const [alerts, setAlerts] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [showTestEmailModal, setShowTestEmailModal] = useState(false);
    const [testEmailAddress, setTestEmailAddress] = useState('');
    const socket = useSocket();

    // Email configuration form
    const [emailConfig, setEmailConfig] = useState({
        emailProvider: 'gmail',
        user: '',
        password: '',
        from: '',
        host: '',
        port: 587,
        secure: false
    });

    const [recipientEmail, setRecipientEmail] = useState('');
    const [thresholds, setThresholds] = useState({
        cpu: 80,
        memory: 90,
        disk: 85
    });

    const [deduplicationWindow, setDeduplicationWindow] = useState(15);

    // Fetch alerts
    useEffect(() => {
        fetchAlerts();
        fetchSettings();
    }, []);

    // Listen for new alerts via socket
    useEffect(() => {
        if (!socket) return;

        const handleNewAlerts = (newAlerts) => {
            setAlerts(prev => [...newAlerts, ...prev]);
            setNotification({
                type: 'warning',
                message: `${newAlerts.length} new alert(s) received`
            });
        };

        socket.on('alerts:new', handleNewAlerts);

        return () => {
            socket.off('alerts:new', handleNewAlerts);
        };
    }, [socket]);

    const fetchAlerts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/alerts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAlerts(response.data);
        } catch (error) {
            console.error('Error fetching alerts:', error);
            setNotification({ type: 'error', message: 'Failed to fetch alerts' });
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/alerts/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(response.data);

            // Populate form with existing settings
            if (response.data.emailConfig) {
                setEmailConfig({
                    emailProvider: response.data.emailProvider || 'gmail',
                    user: response.data.emailConfig.user || '',
                    password: '', // Don't show password
                    from: response.data.emailConfig.from || '',
                    host: response.data.emailConfig.host || '',
                    port: response.data.emailConfig.port || 587,
                    secure: response.data.emailConfig.secure || false
                });
            }

            if (response.data.thresholds) {
                setThresholds(response.data.thresholds);
            }

            if (response.data.alertDeduplicationWindow !== undefined) {
                setDeduplicationWindow(response.data.alertDeduplicationWindow);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const acknowledgeAlert = async (alertId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_BASE_URL}/api/alerts/${alertId}/acknowledge`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setAlerts(prev => prev.map(alert =>
                alert._id === alertId ? { ...alert, acknowledged: true } : alert
            ));

            setNotification({ type: 'success', message: 'Alert acknowledged' });
        } catch (error) {
            console.error('Error acknowledging alert:', error);
            setNotification({ type: 'error', message: 'Failed to acknowledge alert' });
        }
    };

    const deleteAlert = async (alertId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(`${API_BASE_URL}/api/alerts/${alertId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setAlerts(prev => prev.filter(alert => alert._id !== alertId));
            setNotification({ type: 'success', message: 'Alert deleted successfully' });
        } catch (error) {
            console.error('Error deleting alert:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to delete alert';
            setNotification({ type: 'error', message: errorMessage });
        }
    };

    const saveEmailConfig = async () => {
        try {
            const token = localStorage.getItem('token');

            const payload = {
                emailProvider: emailConfig.emailProvider,
                emailConfig: {
                    user: emailConfig.user,
                    from: emailConfig.from,
                    ...(emailConfig.password && { password: emailConfig.password }),
                    ...(emailConfig.emailProvider === 'smtp' && {
                        host: emailConfig.host,
                        port: emailConfig.port,
                        secure: emailConfig.secure
                    })
                },
                thresholds,
                alertDeduplicationWindow: deduplicationWindow,
                emailEnabled: true
            };

            await axios.put(`${API_BASE_URL}/api/alerts/settings`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNotification({ type: 'success', message: 'Email configuration saved successfully' });
            fetchSettings();
        } catch (error) {
            console.error('Error saving email config:', error);
            setNotification({ type: 'error', message: 'Failed to save configuration' });
        }
    };

    const addRecipient = async () => {
        if (!recipientEmail) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_BASE_URL}/api/alerts/settings/recipients`,
                { email: recipientEmail },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setRecipientEmail('');
            setNotification({ type: 'success', message: 'Recipient added successfully' });
            fetchSettings();
        } catch (error) {
            console.error('Error adding recipient:', error);
            setNotification({ type: 'error', message: error.response?.data?.error || 'Failed to add recipient' });
        }
    };

    const removeRecipient = async (email) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/api/alerts/settings/recipients/${encodeURIComponent(email)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNotification({ type: 'success', message: 'Recipient removed successfully' });
            fetchSettings();
        } catch (error) {
            console.error('Error removing recipient:', error);
            setNotification({ type: 'error', message: 'Failed to remove recipient' });
        }
    };

    const sendTestEmail = async () => {
        if (!testEmailAddress) {
            setNotification({ type: 'error', message: 'Please enter an email address' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_BASE_URL}/api/alerts/settings/test-email`,
                { testEmail: testEmailAddress },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setNotification({ type: 'success', message: 'Test email sent successfully' });
            setShowTestEmailModal(false);
            setTestEmailAddress('');
        } catch (error) {
            console.error('Error sending test email:', error);
            setNotification({ type: 'error', message: error.response?.data?.details || 'Failed to send test email' });
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
            case 'warning': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
            case 'info': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
            default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
        }
    };

    const formatAlertType = (type) => {
        const typeMap = {
            container_stopped: 'Container Stopped',
            container_error: 'Container Error',
            agent_offline: 'Agent Offline',
            high_cpu: 'High CPU Usage',
            high_memory: 'High Memory Usage',
            high_disk: 'High Disk Usage'
        };
        return typeMap[type] || type;
    };

    return (
        <div className="p-6">
            {/* Notification */}
            {notification && (
                <Notification
                    type={notification.type}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}

            {/* Test Email Modal */}
            {showTestEmailModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass p-6 rounded-xl max-w-md w-full mx-4">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <i className="fas fa-paper-plane text-accent"></i>
                            Send Test Email
                        </h3>
                        <p className="text-text-secondary text-sm mb-4">
                            Enter an email address to send a test notification
                        </p>
                        <input
                            type="email"
                            value={testEmailAddress}
                            onChange={(e) => setTestEmailAddress(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendTestEmail()}
                            placeholder="test@example.com"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 mb-4 focus:border-accent focus:outline-none"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={sendTestEmail}
                                className="flex-1 px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 transition-all"
                            >
                                <i className="fas fa-paper-plane mr-2"></i>
                                Send Test
                            </button>
                            <button
                                onClick={() => {
                                    setShowTestEmailModal(false);
                                    setTestEmailAddress('');
                                }}
                                className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <i className="fas fa-bell text-yellow-400"></i>
                    Alerts & Configuration
                </h1>
                <p className="text-text-secondary mt-1">Monitor system alerts and configure email notifications</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-white/10 mb-6">
                <button
                    onClick={() => setActiveTab('alerts')}
                    className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'alerts'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-text-secondary hover:text-white'
                        }`}
                >
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Alerts
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'logs'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-text-secondary hover:text-white'
                        }`}
                >
                    <i className="fas fa-file-alt mr-2"></i>
                    Logs
                </button>
                <button
                    onClick={() => setActiveTab('configuration')}
                    className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'configuration'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-text-secondary hover:text-white'
                        }`}
                >
                    <i className="fas fa-cog mr-2"></i>
                    Configuration
                </button>
            </div>

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-12">
                            <i className="fas fa-spinner fa-spin text-4xl text-accent"></i>
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="glass p-12 rounded-xl text-center">
                            <i className="fas fa-check-circle text-6xl text-green-400 mb-4"></i>
                            <p className="text-xl text-text-secondary">No alerts found</p>
                        </div>
                    ) : (
                        alerts.map(alert => (
                            <div key={alert._id} className={`glass p-4 rounded-xl border ${getSeverityColor(alert.severity)} ${alert.acknowledged ? 'opacity-50' : ''}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getSeverityColor(alert.severity)}`}>
                                                {alert.severity}
                                            </span>
                                            <span className="text-sm text-text-secondary">
                                                {formatAlertType(alert.type)}
                                            </span>
                                            {alert.acknowledged && (
                                                <span className="text-xs text-green-400">
                                                    <i className="fas fa-check mr-1"></i>
                                                    Acknowledged
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-lg font-semibold mb-2">{alert.message}</p>
                                        <div className="flex items-center gap-4 text-sm text-text-secondary">
                                            <span>
                                                <i className="fas fa-server mr-1"></i>
                                                {alert.agent?.name || 'Unknown Agent'}
                                            </span>
                                            {alert.containerName && (
                                                <span>
                                                    <i className="fas fa-box mr-1"></i>
                                                    {alert.containerName}
                                                </span>
                                            )}
                                            <span>
                                                <i className="fas fa-clock mr-1"></i>
                                                {new Date(alert.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {!alert.acknowledged && (
                                            <button
                                                onClick={() => acknowledgeAlert(alert._id)}
                                                className="px-3 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all"
                                                title="Acknowledge"
                                            >
                                                <i className="fas fa-check"></i>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteAlert(alert._id)}
                                            className="px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                            title="Delete"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
                <div className="glass p-6 rounded-xl">
                    <p className="text-text-secondary text-center py-12">
                        System logs will be displayed here
                    </p>
                </div>
            )}

            {/* Configuration Tab */}
            {activeTab === 'configuration' && (
                <div className="space-y-6">
                    {/* Saved Email Configuration Display */}
                    {settings?.emailConfig?.user && (
                        <div className="glass p-6 rounded-xl border-l-4 border-accent">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <i className="fas fa-check-circle text-green-400"></i>
                                Current Email Configuration
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white/5 p-3 rounded-lg">
                                    <p className="text-xs text-text-secondary mb-1">Provider</p>
                                    <p className="font-medium capitalize">{settings.emailProvider}</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-lg">
                                    <p className="text-xs text-text-secondary mb-1">From Email</p>
                                    <p className="font-medium">{settings.emailConfig.from}</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-lg">
                                    <p className="text-xs text-text-secondary mb-1">Username</p>
                                    <p className="font-medium">{settings.emailConfig.user}</p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-lg">
                                    <p className="text-xs text-text-secondary mb-1">Status</p>
                                    <p className="font-medium text-green-400">
                                        <i className="fas fa-check-circle mr-1"></i>
                                        Configured
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Email Provider Configuration */}
                    <div className="glass p-6 rounded-xl">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <i className="fas fa-envelope text-accent"></i>
                            Email Provider Configuration
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Email Provider</label>
                                <select
                                    value={emailConfig.emailProvider}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, emailProvider: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 focus:border-accent focus:outline-none"
                                >
                                    <option value="gmail">Gmail</option>
                                    <option value="outlook">Outlook</option>
                                    <option value="smtp">Custom SMTP</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">From Email Address</label>
                                <input
                                    type="email"
                                    value={emailConfig.from}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, from: e.target.value })}
                                    placeholder="noreply@example.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 focus:border-accent focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Email Username</label>
                                <input
                                    type="email"
                                    value={emailConfig.user}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, user: e.target.value })}
                                    placeholder="your-email@gmail.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 focus:border-accent focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Password / App Password</label>
                                <input
                                    type="password"
                                    value={emailConfig.password}
                                    onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                                    placeholder="Enter password to update"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 focus:border-accent focus:outline-none"
                                />
                            </div>

                            {emailConfig.emailProvider === 'smtp' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">SMTP Host</label>
                                        <input
                                            type="text"
                                            value={emailConfig.host}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })}
                                            placeholder="smtp.example.com"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 focus:border-accent focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">SMTP Port</label>
                                        <input
                                            type="number"
                                            value={emailConfig.port}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, port: parseInt(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 focus:border-accent focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={emailConfig.secure}
                                            onChange={(e) => setEmailConfig({ ...emailConfig, secure: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <label className="text-sm">Use SSL/TLS (port 465)</label>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={saveEmailConfig}
                                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 transition-all"
                            >
                                <i className="fas fa-save mr-2"></i>
                                Save Configuration
                            </button>
                            <button
                                onClick={() => setShowTestEmailModal(true)}
                                className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"
                            >
                                <i className="fas fa-paper-plane mr-2"></i>
                                Send Test Email
                            </button>
                        </div>
                    </div>

                    {/* Recipient Emails */}
                    <div className="glass p-6 rounded-xl">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <i className="fas fa-users text-accent"></i>
                            Alert Recipients
                        </h3>

                        <div className="flex gap-3 mb-4">
                            <input
                                type="email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                                placeholder="admin@example.com"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2.5 focus:border-accent focus:outline-none"
                            />
                            <button
                                onClick={addRecipient}
                                className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-500/20"
                            >
                                <i className="fas fa-plus mr-2"></i>
                                Add Recipient
                            </button>
                        </div>

                        <div className="space-y-2">
                            {settings?.recipientEmails?.length === 0 ? (
                                <p className="text-text-secondary text-center py-4">No recipients configured</p>
                            ) : (
                                settings?.recipientEmails?.map(email => (
                                    <div key={email} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                                        <span className="flex items-center gap-2">
                                            <i className="fas fa-envelope text-accent"></i>
                                            {email}
                                        </span>
                                        <button
                                            onClick={() => removeRecipient(email)}
                                            className="px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Alert Thresholds */}
                    <div className="glass p-6 rounded-xl">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <i className="fas fa-sliders-h text-accent"></i>
                            Alert Thresholds
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">CPU Usage (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={thresholds.cpu}
                                    onChange={(e) => setThresholds({ ...thresholds, cpu: parseInt(e.target.value) })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 focus:border-accent focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Memory Usage (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={thresholds.memory}
                                    onChange={(e) => setThresholds({ ...thresholds, memory: parseInt(e.target.value) })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 focus:border-accent focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Disk Usage (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={thresholds.disk}
                                    onChange={(e) => setThresholds({ ...thresholds, disk: parseInt(e.target.value) })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 focus:border-accent focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Alert Deduplication (minutes)
                                    <span className="block text-xs text-text-secondary font-normal mt-0.5">
                                        Suppress duplicate alerts within this window
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="1440"
                                    value={deduplicationWindow}
                                    onChange={(e) => setDeduplicationWindow(parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 focus:border-accent focus:outline-none"
                                    placeholder="15"
                                />
                            </div>
                        </div>

                        <button
                            onClick={saveEmailConfig}
                            className="mt-4 px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 transition-all"
                        >
                            <i className="fas fa-save mr-2"></i>
                            Save Thresholds
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlertsPage;
