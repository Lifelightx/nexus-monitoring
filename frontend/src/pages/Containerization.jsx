import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Containerization = () => {
    const [file, setFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [agents, setAgents] = useState([]);
    const [selectedAgents, setSelectedAgents] = useState([]);
    const [deploying, setDeploying] = useState(false);
    const [deployResults, setDeployResults] = useState(null); // { [agentId]: { success: boolean, message: string } }

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3000/api/agents', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Only show online agents
            setAgents(res.data.filter(a => a.status === 'online'));
        } catch (err) {
            console.error('Error fetching agents:', err);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (e) => setFileContent(e.target.result);
            reader.readAsText(selectedFile);
        }
    };

    const toggleAgent = (agentId) => {
        setSelectedAgents(prev =>
            prev.includes(agentId)
                ? prev.filter(id => id !== agentId)
                : [...prev, agentId]
        );
    };

    const handleDeploy = async () => {
        if (!fileContent || selectedAgents.length === 0) return;

        setDeploying(true);
        setDeployResults(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:3000/api/deploy/compose', {
                composeContent: fileContent,
                targetAgentIds: selectedAgents
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setDeployResults(response.data.results);
        } catch (error) {
            console.error('Deploy error:', error);
            // Handle global error
        } finally {
            setDeploying(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Containerization SaaS</h1>
                <p className="text-text-secondary">Deploy Docker Compose stacks to your fleet.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Upload & Preview */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-xl border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <i className="fas fa-file-code text-accent"></i>
                            1. Upload Compose File
                        </h2>

                        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-accent/50 transition-colors relative group">
                            <input
                                type="file"
                                accept=".yml,.yaml"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="pointer-events-none">
                                <i className="fas fa-cloud-upload-alt text-4xl text-text-secondary mb-3 group-hover:text-accent transition-colors"></i>
                                <p className="text-white font-medium mb-1">
                                    {file ? file.name : 'Drop docker-compose.yml here'}
                                </p>
                                <p className="text-sm text-text-secondary">or click to browse</p>
                            </div>
                        </div>

                        {fileContent && (
                            <div className="mt-4">
                                <p className="text-sm text-text-secondary mb-2">Preview:</p>
                                <pre className="bg-[#1e1e1e] p-4 rounded-lg text-xs font-mono text-gray-300 overflow-x-auto max-h-64 border border-white/5">
                                    {fileContent}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Target Selection & Deploy */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-xl border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <i className="fas fa-server text-green-400"></i>
                            2. Select Targets
                        </h2>

                        {agents.length === 0 ? (
                            <div className="text-center py-8 text-text-secondary">
                                No online servers found.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {agents.map(agent => (
                                    <div
                                        key={agent._id}
                                        onClick={() => toggleAgent(agent._id)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${selectedAgents.includes(agent._id)
                                            ? 'bg-accent/10 border-accent'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded-full border-2 ${selectedAgents.includes(agent._id)
                                                ? 'border-accent bg-accent'
                                                : 'border-text-secondary'
                                                } flex items-center justify-center`}>
                                                {selectedAgents.includes(agent._id) && <i className="fas fa-check text-[10px] text-white"></i>}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{agent.name}</h3>
                                                <p className="text-xs text-text-secondary">{agent.ip}</p>
                                            </div>
                                        </div>
                                        <div className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                                            Online
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-white/10">
                            <button
                                onClick={handleDeploy}
                                disabled={!fileContent || selectedAgents.length === 0 || deploying}
                                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${!fileContent || selectedAgents.length === 0 || deploying
                                    ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                    : 'bg-accent hover:bg-accent-hover text-white shadow-lg hover:shadow-accent/25'
                                    }`}
                            >
                                {deploying ? (
                                    <>
                                        <i className="fas fa-circle-notch fa-spin"></i>
                                        Deploying...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-rocket"></i>
                                        Deploy to {selectedAgents.length} Server{selectedAgents.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Results Area */}
                    {deployResults && (
                        <div className="glass p-6 rounded-xl border border-white/10 animate-fade-in">
                            <h3 className="text-lg font-bold text-white mb-4">Deployment Results</h3>
                            <div className="space-y-3">
                                {Object.entries(deployResults).map(([agentId, result]) => {
                                    const agent = agents.find(a => a._id === agentId);
                                    return (
                                        <div key={agentId} className={`p-3 rounded-lg border ${result.success
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : 'bg-red-500/10 border-red-500/30'
                                            }`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-white">{agent?.name || agentId}</span>
                                                <span className={`text-xs font-bold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                                                    {result.success ? 'SUCCESS' : 'FAILED'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-text-secondary font-mono">{result.message}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Containerization;
