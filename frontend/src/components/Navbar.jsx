import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <nav className="fixed w-full z-50 glass">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                            <i className="fas fa-bolt text-white"></i>
                        </div>
                        <span className="text-xl font-bold tracking-tight">Nexus Monitor</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium hover:text-accent transition-colors">Features</a>
                        <a href="#services" className="text-sm font-medium hover:text-accent transition-colors">Services</a>
                        <a href="#pricing" className="text-sm font-medium hover:text-accent transition-colors">Pricing</a>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            aria-label="Toggle Theme"
                        >
                            <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'} text-accent`}></i>
                        </button>
                        <Link to="/login" className="px-4 py-2 rounded-lg hover:bg-white/5 transition-colors">Login</Link>
                        <Link to="/signup" className="px-4 py-2 bg-accent hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-lg shadow-accent/20">
                            Get Started
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
