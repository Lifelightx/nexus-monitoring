import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const DashboardNavbar = ({ showGuideButton, onToggleGuide }) => {
    const { logout, user } = useAuth();
    const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'dark');

    React.useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'light') {
            root.classList.add('light');
        } else {
            root.classList.remove('light');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <nav className="h-16 bg-bg-secondary/80 backdrop-blur-md border-b border-white/5 fixed top-0 left-0 right-0 z-50 px-6 flex items-center justify-between">
            <div className="flex items-center gap-12">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
                        <i className="fas fa-network-wired text-white text-sm"></i>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        Nexus
                    </span>
                </Link>
            </div>

            <div className="flex items-center gap-6">
                {showGuideButton && (
                    <button
                        onClick={onToggleGuide}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-all border border-white/5"
                    >
                        <i className="fas fa-book-open text-accent"></i>
                        <span className="text-sm font-medium">Installation Guide</span>
                    </button>
                )}

                <button
                    onClick={toggleTheme}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-all border border-white/5"
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
                </button>

                <div className="h-6 w-px bg-white/10"></div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end hidden md:flex">
                        <span className="text-sm font-medium text-white">{user?.name || 'User'}</span>
                        <span className="text-xs text-text-secondary">{user?.email}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center border border-white/10">
                        <i className="fas fa-user text-white/70"></i>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Logout"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default DashboardNavbar;
