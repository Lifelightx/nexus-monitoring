import React from 'react';

const InstallationGuide = ({ onClose }) => {
    return (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl border border-white/10 p-6 mb-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
                <button
                    onClick={onClose}
                    className="text-text-secondary hover:text-white transition-colors"
                >
                    <i className="fas fa-times"></i>
                </button>
            </div>

            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

            <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-2">🚀 Connect Your First Server</h2>
                <p className="text-text-secondary mb-6 max-w-2xl">
                    Follow these simple steps to install the Nexus Agent on your server and start monitoring metrics in real-time.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold border border-blue-500/20">1</div>
                            <h3 className="font-semibold text-white">Prerequisites</h3>
                        </div>
                        <p className="text-sm text-text-secondary">Ensure <span className="text-white">Node.js v16+</span> is installed on your server.</p>
                    </div>

                    <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold border border-purple-500/20">2</div>
                            <h3 className="font-semibold text-white">Download Agent</h3>
                        </div>
                        <div className="bg-black/40 rounded p-2 font-mono text-xs text-gray-300 flex justify-between items-center group/code cursor-pointer hover:bg-black/60 transition-colors">
                            <span>git clone https://github.com/nexus/agent.git</span>
                            <i className="fas fa-copy opacity-0 group-hover/code:opacity-100 transition-opacity"></i>
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold border border-green-500/20">3</div>
                            <h3 className="font-semibold text-white">Start Agent</h3>
                        </div>
                        <div className="bg-black/40 rounded p-2 font-mono text-xs text-gray-300 flex justify-between items-center group/code cursor-pointer hover:bg-black/60 transition-colors">
                            <span>npm install && npm start</span>
                            <i className="fas fa-copy opacity-0 group-hover/code:opacity-100 transition-opacity"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallationGuide;
