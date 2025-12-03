import React from 'react';
import { useOutletContext } from 'react-router-dom';

const ServerLogs = () => {
    const { agent } = useOutletContext();

    return (
        <div className="text-white">
            <h2 className="text-2xl font-bold mb-4">System Logs</h2>
            <p className="text-text-secondary">Logs for server {agent?.name} coming soon.</p>
        </div>
    );
};

export default ServerLogs;
