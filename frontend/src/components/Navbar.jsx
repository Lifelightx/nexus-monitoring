import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                            <i className="fas fa-bolt text-white"></i>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">Nexus Monitor</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/" className="text-sm font-medium hover:text-accent transition-colors text-slate-700">Home</Link>
                        <Link to="/services" className="text-sm font-medium hover:text-accent transition-colors text-slate-700">Services</Link>
                        <Link to="/pricing" className="text-sm font-medium hover:text-accent transition-colors text-slate-700">Pricing</Link>
                        <Link to="/docs" className="text-sm font-medium hover:text-accent transition-colors text-slate-700">Documentation</Link>

                        <Link to="/login" className="px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 font-medium">Login</Link>
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
