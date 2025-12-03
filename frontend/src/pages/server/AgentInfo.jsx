import React from 'react';
import { useOutletContext } from 'react-router-dom';

const AgentInfo = () => {
    const { agent } = useOutletContext();

    return (
        <div className="text-white">
            <h2 className="text-2xl font-bold mb-4">Agent Information</h2>
            <div className="glass p-6 rounded-xl max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-text-secondary text-sm">Agent ID</p>
                        <p className="font-mono text-sm">{agent?._id}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary text-sm">Version</p>
                        <p>1.0.0</p>
                    </div>
                    <div>
                        <p className="text-text-secondary text-sm">Platform</p>
                        <p>{agent?.platform}</p>
                    </div>
                    <div>
                        <p className="text-text-secondary text-sm">Last Seen</p>
                        <p>{new Date(agent?.lastSeen).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentInfo;
