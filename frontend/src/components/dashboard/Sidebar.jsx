import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();

    const menuItems = [
        { name: 'Dashboard', icon: 'fas fa-th-large', path: '/dashboard' },
        { name: 'Metrics Monitoring', icon: 'fas fa-chart-line', path: '/metrics' },
        { name: 'Containerization SaaS', icon: 'fab fa-docker', path: '/containerization' },
        { name: 'Server Management', icon: 'fas fa-server', path: '/servers' },
        { name: 'Logs & Alerts', icon: 'fas fa-bell', path: '/alerts' },
        { name: 'Settings', icon: 'fas fa-cog', path: '/settings' },
    ];

    return (
        <div className="w-64 bg-bg-secondary/50 backdrop-blur-xl border-r border-white/5 h-screen fixed left-0 top-0 pt-20 flex flex-col z-40">
            <div className="px-6 mb-8">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Services</h3>
                <div className="space-y-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${location.pathname === item.path
                                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                                    : 'text-text-secondary hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <i className={`${item.icon} w-5 text-center transition-transform group-hover:scale-110`}></i>
                            <span className="font-medium">{item.name}</span>
                        </Link>
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
