import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ContainerLogs from './ContainerLogs';

const ContainerDetails = ({ serverId: propServerId, containerName: propContainerName, containerId: propContainerId, agentName: propAgentName }) => {
    const { serverId: paramServerId, containerName: paramContainerName } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const serverId = propServerId || paramServerId;
    const containerName = propContainerName || paramContainerName || location.state?.containerName;
    const containerId = propContainerId || location.state?.containerId;
    const agentId = serverId;

    return (
        <div className="flex flex-col h-full">
            <div className="w-full flex-1 flex flex-col">
                <div className="mb-6">
                    <button
                        onClick={() => navigate(`/server/${serverId}/docker/containers`)}
                        className="mb-4 flex items-center gap-2 text-accent hover:text-white transition-colors"
                    >
                        <i className="fas fa-arrow-left"></i> Back to Containers
                    </button>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <i className="fas fa-box text-blue-400"></i>
                        {containerName}
                    </h1>
                    <p className="text-text-secondary font-mono text-sm mt-1">{containerId}</p>
                </div>

                {/* Logs Section */}
                <div className="flex-1 bg-[#1e1e1e] rounded-xl border border-white/10 overflow-hidden shadow-2xl min-h-[500px] flex flex-col">
                    <div className="bg-[#2d2d2d] px-4 py-3 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-file-alt text-accent"></i>
                            <span className="font-semibold">Container Logs</span>
                        </div>
                    </div>
                    <ContainerLogs containerId={containerId} agentId={agentId} />
                </div>
            </div>
        </div>
    );
};

export default ContainerDetails;
