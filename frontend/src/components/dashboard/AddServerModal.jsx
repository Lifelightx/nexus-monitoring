import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const AddServerModal = ({ onClose }) => {
    const [platform, setPlatform] = useState('linux'); // Default to Linux
    const [command, setCommand] = useState('Loading...');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [token, setToken] = useState('');

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/install/token`);
                const fetchedToken = res.data.token;
                setToken(fetchedToken);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching token:', err);
                setCommand('Error generating command. Please try again.');
                setLoading(false);
            }
        };

        fetchToken();
    }, []);

    // Update command when platform or token changes
    useEffect(() => {
        if (!token) return;

        const serverUrl = API_BASE_URL;

        if (platform === 'linux') {
            const cmd = `curl -sL ${serverUrl}/api/install/script | sudo bash -s ${serverUrl} ${token}`;
            setCommand(cmd);
        } else if (platform === 'windows') {
            const cmd = `Invoke-WebRequest -Uri "${serverUrl}/api/install/script/windows" -OutFile "$env:TEMP\\install-nexus.ps1"; & "$env:TEMP\\install-nexus.ps1" -ServerUrl "${serverUrl}" -AgentToken "${token}"`;
            setCommand(cmd);
        }
    }, [platform, token]);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = command;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (e) {
                console.error('Fallback copy failed:', e);
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary border border-white/10 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Add New Server</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="p-6">
                    {/* Platform Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-white mb-3">Select Server Platform</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setPlatform('linux')}
                                className={`p-4 rounded-lg border-2 transition-all ${platform === 'linux'
                                    ? 'border-accent bg-accent/10 text-white'
                                    : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <i className="fab fa-linux text-2xl"></i>
                                    <div className="text-left">
                                        <div className="font-semibold">Linux</div>
                                        <div className="text-xs opacity-75">Ubuntu, Debian, CentOS, etc.</div>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setPlatform('windows')}
                                className={`p-4 rounded-lg border-2 transition-all ${platform === 'windows'
                                    ? 'border-accent bg-accent/10 text-white'
                                    : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <i className="fab fa-windows text-2xl"></i>
                                    <div className="text-left">
                                        <div className="font-semibold">Windows</div>
                                        <div className="text-xs opacity-75">Windows 10, Server 2016+</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <p className="text-text-secondary mb-4">
                        {platform === 'linux'
                            ? 'Run the following command in your Linux terminal with sudo privileges:'
                            : 'Run the following command in PowerShell as Administrator:'}
                    </p>

                    <div className="relative group">
                        <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-green-400 break-all border border-white/5 min-h-[80px] flex items-center">
                            {loading ? (
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <i className="fas fa-circle-notch fa-spin"></i> Generating secure token...
                                </div>
                            ) : (
                                <div className="w-full pr-20">{command}</div>
                            )}
                        </div>

                        {!loading && (
                            <button
                                onClick={copyToClipboard}
                                className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-2 backdrop-blur-md"
                            >
                                {copied ? (
                                    <>
                                        <i className="fas fa-check text-green-400"></i> Copied!
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-copy"></i> Copy
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="mt-6 flex items-start gap-3 text-sm text-text-secondary bg-blue-500/5 border border-blue-500/10 p-4 rounded-lg">
                        <i className="fas fa-info-circle text-blue-400 mt-0.5"></i>
                        <div>
                            <p className="font-medium text-blue-400 mb-1">Requirements</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                {platform === 'linux' ? (
                                    <>
                                        <li>Linux OS (Ubuntu, Debian, CentOS, RHEL, etc.)</li>
                                        <li>Internet access to download dependencies</li>
                                        <li>Root/Sudo privileges</li>
                                        <li>Node.js v16+ (auto-installed if missing)</li>
                                    </>
                                ) : (
                                    <>
                                        <li>Windows 10 or Windows Server 2016+</li>
                                        <li>PowerShell 5.1 or higher</li>
                                        <li>Administrator privileges</li>
                                        <li>Node.js v16+ (must be pre-installed)</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddServerModal;
