import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AddServerModal = ({ onClose }) => {
    const [command, setCommand] = useState('Loading...');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await axios.get('http://localhost:3000/api/install/token');
                const token = res.data.token;
                const serverUrl = 'http://localhost:3000'; // In prod, use window.location.origin or config
                // The command: curl -sL <url>/script | sudo bash -s -- <url> <token>
                const cmd = `curl -sL ${serverUrl}/api/install/script | sudo bash -s -- ${serverUrl} ${token}`;
                setCommand(cmd);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching token:', err);
                setCommand('Error generating command. Please try again.');
                setLoading(false);
            }
        };

        fetchToken();
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(command);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-bg-secondary border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Add New Server</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-text-secondary mb-4">
                        Run the following command on your server to install the agent.
                        This script will install dependencies (Node.js, Docker), setup the agent, and connect it to this dashboard.
                    </p>

                    <div className="relative group">
                        <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-green-400 break-all border border-white/5">
                            {loading ? (
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <i className="fas fa-circle-notch fa-spin"></i> Generating secure token...
                                </div>
                            ) : (
                                command
                            )}
                        </div>

                        {!loading && (
                            <button
                                onClick={copyToClipboard}
                                className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-2 backdrop-blur-md"
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
                                <li>Linux (Ubuntu, Debian, CentOS, etc.)</li>
                                <li>Internet access to download dependencies</li>
                                <li>Root/Sudo privileges</li>
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
