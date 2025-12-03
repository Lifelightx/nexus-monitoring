import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ContainerTerminal from './ContainerTerminal';
import ContainerLogs from './ContainerLogs';

const ContainerDetails = () => {
    const { serverId, containerId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('logs');

    // We expect agentId to be passed in state, or we derive it from serverId (which IS the agentId in this app's context usually)
    // In DockerDetails, serverId is used as agentId.
    const agentId = serverId;
    const containerName = location.state?.containerName || containerId.substring(0, 12);

    return (
        <div className="min-h-screen bg-bg-dark text-white p-4 md:p-8 pt-20 flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
                <div className="mb-6">
                    <button
                        onClick={() => navigate(`/server/${serverId}/docker-details`, {
                            state: {
                                activeTab: 'containers',
                                dockerData: location.state?.dockerData,
                                agentName: location.state?.agentName
                            }
                        })}
                        className="mb-4 flex items-center gap-2 text-accent hover:text-white transition-colors"
                    >
                        <i className="fas fa-arrow-left"></i> Back
                    </button>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <i className="fas fa-box text-blue-400"></i>
                        {containerName}
                    </h1>
                    <p className="text-text-secondary font-mono text-sm mt-1">{containerId}</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/10 mb-4">
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'logs'
                            ? 'border-accent text-accent'
                            : 'border-transparent text-text-secondary hover:text-white'
                            }`}
                    >
                        <i className="fas fa-file-alt mr-2"></i> Logs
                    </button>
                    <button
                        onClick={() => setActiveTab('terminal')}
                        className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'terminal'
                            ? 'border-accent text-accent'
                            : 'border-transparent text-text-secondary hover:text-white'
                            }`}
                    >
                        <i className="fas fa-terminal mr-2"></i> Terminal
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-[#1e1e1e] rounded-xl border border-white/10 overflow-hidden shadow-2xl min-h-[500px] flex flex-col">
                    {activeTab === 'logs' && (
                        <ContainerLogs containerId={containerId} agentId={agentId} />
                    )}
                    {activeTab === 'terminal' && (
                        <ContainerTerminal containerId={containerId} agentId={agentId} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContainerDetails;
