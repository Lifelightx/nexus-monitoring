import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useSocket } from '../context/SocketContext';

const ContainerLogs = ({ containerId, agentId }) => {
    const terminalRef = useRef(null);
    const socket = useSocket();
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);

    useEffect(() => {
        if (!socket || !terminalRef.current) return;

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: false,
            disableStdin: true, // Read-only
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
            convertEol: true, // Convert \n to \r\n
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Handle resize
        const handleResize = () => {
            fitAddon.fit();
        };

        window.addEventListener('resize', handleResize);

        // Listen for logs from backend
        const handleLogsData = (data) => {
            if (data.containerId === containerId) {
                // Docker logs might come line by line or chunked
                term.write(data.data);
            }
        };

        socket.on('docker:logs:data', handleLogsData);

        // Start logs stream
        socket.emit('docker:logs:start', { agentId, containerId });

        // Initial resize
        setTimeout(() => handleResize(), 100);

        return () => {
            socket.off('docker:logs:data', handleLogsData);
            socket.emit('docker:logs:stop', { agentId, containerId });
            term.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, [socket, containerId, agentId]);

    return (
        <div className="h-full w-full bg-[#1e1e1e] rounded-lg overflow-hidden p-2">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
};

export default ContainerLogs;
