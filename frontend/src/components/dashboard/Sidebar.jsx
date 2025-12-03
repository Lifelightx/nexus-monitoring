import React, { useState, useEffect } from 'react';
import { Link, useLocation, matchPath } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();
    const [isServerContext, setIsServerContext] = useState(false);
    const [serverId, setServerId] = useState(null);

    useEffect(() => {
        const match = matchPath('/server/:id/*', location.pathname);
        if (match) {
            setIsServerContext(true);
            setServerId(match.params.id);
        } else {
            setIsServerContext(false);
            setServerId(null);
        }
    }, [location.pathname]);

    const globalMenuItems = [
        { name: 'Dashboard', icon: 'fas fa-th-large', path: '/dashboard' },
        { name: 'Servers', icon: 'fas fa-server', path: '/servers' },
        { name: 'Metrics', icon: 'fas fa-chart-line', path: '/metrics' },
        { name: 'Alerts & Logs', icon: 'fas fa-bell', path: '/alerts' },
        { name: 'Settings', icon: 'fas fa-cog', path: '/settings' },
    ];

    const serverMenuItems = [
        { name: 'Overview', icon: 'fas fa-info-circle', path: `/server/${serverId}/overview` },
        { name: 'Metrics', icon: 'fas fa-chart-area', path: `/server/${serverId}/metrics` },
        {
            name: 'Docker',
            icon: 'fab fa-docker',
            path: `/server/${serverId}/docker`,
            subItems: [
                { name: 'Containers', path: `/server/${serverId}/docker/containers` },
                { name: 'Images', path: `/server/${serverId}/docker/images` },
                { name: 'Volumes', path: `/server/${serverId}/docker/volumes` },
                { name: 'Networks', path: `/server/${serverId}/docker/networks` },
            ]
        },
        { name: 'Logs', icon: 'fas fa-file-alt', path: `/server/${serverId}/logs` },
        { name: 'Agent Info', icon: 'fas fa-microchip', path: `/server/${serverId}/agent-info` },
    ];

    const currentMenuItems = isServerContext ? serverMenuItems : globalMenuItems;

    return (
        <div className="w-64 bg-bg-secondary/50 backdrop-blur-xl border-r border-white/5 h-screen fixed left-0 top-0 pt-20 flex flex-col z-40">
            <div className="px-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                        {isServerContext ? 'Server Navigation' : 'Services'}
                    </h3>
                    {isServerContext && (
                        <Link to="/servers" className="text-xs text-accent hover:text-white transition-colors" title="Back to All Servers">
                            <i className="fas fa-arrow-left mr-1"></i> Back
                        </Link>
                    )}
                </div>

                <div className="space-y-2">
                    {currentMenuItems.map((item) => (
                        <div key={item.name}>
                            <Link
                                to={item.subItems ? item.subItems[0].path : item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 group ${(item.subItems ? location.pathname.startsWith(item.path) : location.pathname === item.path)
                                    ? 'bg-white/5 text-white shadow-sm shadow-accent/20'
                                    : 'text-text-secondary hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <i className={`${item.icon} w-5 text-center transition-transform group-hover:scale-110`}></i>
                                <span className="font-medium">{item.name}</span>
                            </Link>

                            {/* Sub-items */}
                            {item.subItems && (location.pathname.startsWith(item.path)) && (
                                <div className="ml-9 mt-2 space-y-1 border-l border-white/10 pl-2">
                                    {item.subItems.map(sub => (
                                        <Link
                                            key={sub.name}
                                            to={sub.path}
                                            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${location.pathname === sub.path
                                                ? 'text-white bg-white/10'
                                                : 'text-text-secondary hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            {sub.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-auto px-6 pb-8">
                <div className="bg-gradient-to-br from-accent/20 to-purple-500/20 p-4 rounded-xl border border-white/10">
                    <h4 className="font-bold text-white mb-1">Pro Plan</h4>
                    <p className="text-xs text-text-secondary mb-3">Get access to advanced features</p>
                    <button className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                        Upgrade Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
