import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const FileExplorer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [agent, setAgent] = useState(location.state?.agent || null);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // currentPath is the full path string on the remote system
    // Ensure drive letters have a trailing slash (e.g., "C:" -> "C:/")
    const initialPath = location.state?.selectedDisk || 'C:';
    const normalizedInitialPath = initialPath.match(/^[A-Za-z]:$/) ? `${initialPath}/` : initialPath;
    const [currentPath, setCurrentPath] = useState(normalizedInitialPath);

    useEffect(() => {
        fetchFiles(currentPath);
    }, [id, currentPath]);

    const fetchFiles = (path) => {
        setLoading(true);
        setError(null);

        // We must use the Agent ID (DB ID) because the backend maps sockets by ID.
        // 'id' from useParams is the Agent ID.
        const agentIdentifier = id;
        const token = localStorage.getItem('token');

        fetch(`http://localhost:3000/api/agents/${agentIdentifier}/system/files?path=${encodeURIComponent(path)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => {
                setLoading(false);
                if (data.success) {
                    // Sort: Folders first, then files
                    const sorted = data.files.sort((a, b) => {
                        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                        return a.name.localeCompare(b.name);
                    });
                    setFiles(sorted);
                } else {
                    setError(data.message || 'Failed to fetch files');
                }
            })
            .catch(err => {
                setLoading(false);
                setError(err.message);
            });
    };

    const formatSize = (bytes) => {
        if (bytes === undefined || bytes === null) return '-';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleNavigate = (path) => {
        // Ensure drive letters have a trailing slash
        const normalizedPath = path.match(/^[A-Za-z]:$/) ? `${path}/` : path;
        setCurrentPath(normalizedPath);
    };

    const handleUpLevel = () => {
        // Simple parent path calculation
        // Handle both Windows (\) and Unix (/) separators
        const separator = currentPath.includes('\\') ? '\\' : '/';
        const parts = currentPath.split(separator).filter(p => p);
        if (parts.length > 1) {
            // Remove last part
            parts.pop();
            // Reconstruct path. If it was "C:", parts is ["C:"]. 
            // If "C:\Users", parts is ["C:", "Users"]. Pop -> ["C:"]. Join -> "C:".
            // If "/var/log", parts is ["var", "log"]. Pop -> ["var"]. Join -> "var" (missing leading slash).

            let newPath = parts.join(separator);
            if (currentPath.startsWith('/')) newPath = '/' + newPath; // Restore leading slash for Unix
            if (currentPath.endsWith(':') || (parts.length === 1 && parts[0].includes(':'))) newPath = parts[0] + separator; // Ensure C:\

            setCurrentPath(newPath);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <i className="fas fa-folder-open text-accent"></i>
                        File Explorer
                    </h1>
                    <p className="text-text-secondary text-sm">
                        {agent?.name || id}
                    </p>
                </div>
            </div>

            <div className="bg-bg-secondary/50 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden flex flex-col h-[70vh]">
                {/* Toolbar / Path Bar */}
                <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-white/5">
                    <div className="flex-1 bg-black/20 rounded px-3 py-2 text-sm font-mono text-white border border-white/10">
                        {currentPath}
                    </div>
                    <button
                        onClick={fetchFiles.bind(null, currentPath)}
                        className="p-2 rounded hover:bg-white/10 text-text-secondary hover:text-white"
                        title="Refresh"
                    >
                        <i className="fas fa-sync-alt"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-text-secondary">Loading files...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-red-400">
                            <i className="fas fa-exclamation-triangle text-3xl mb-2"></i>
                            <p>{error}</p>
                            <button
                                onClick={() => fetchFiles(currentPath)}
                                className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded text-white text-sm"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1">
                            <div
                                onClick={handleUpLevel}
                                className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer text-text-secondary hover:text-white transition-colors border-b border-white/5"
                            >
                                <i className="fas fa-level-up-alt w-6 text-center"></i>
                                <span>..</span>
                            </div>

                            {files.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => item.type === 'folder' ? handleNavigate(item.path) : null}
                                    className={`flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors border-b border-white/5 last:border-0 ${item.type === 'folder' ? 'cursor-pointer text-white' : 'text-text-secondary'}`}
                                >
                                    <div className={`w-8 h-8 rounded flex items-center justify-center ${item.type === 'folder' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-400'}`}>
                                        <i className={`fas ${item.type === 'folder' ? 'fa-folder' : 'fa-file'}`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate font-medium">{item.name}</p>
                                    </div>
                                    <div className="text-sm font-mono text-text-secondary w-24 text-right">
                                        {item.type === 'file' ? formatSize(item.size) : '-'}
                                    </div>
                                </div>
                            ))}

                            {files.length === 0 && (
                                <div className="text-center py-12 text-text-secondary">
                                    <p>Empty folder</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 bg-white/5 text-xs text-text-secondary flex justify-between">
                    <span>{files.length} items</span>
                </div>
            </div>
        </div>
    );
};

export default FileExplorer;
