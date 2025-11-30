import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useSocket } from '../context/SocketContext';

const ContainerTerminal = ({ containerId, agentId }) => {
    const terminalRef = useRef(null);
    const socket = useSocket();
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);

    useEffect(() => {
        if (!socket || !terminalRef.current) return;

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff',
                cursor: '#00ff00',
                selection: 'rgba(255, 255, 255, 0.3)'
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

        // Welcome message
        term.write('\x1b[32mWelcome to Nexus Terminal\x1b[0m\r\n');
        term.write('\x1b[90m(Restricted shell mode - basic commands supported)\x1b[0m\r\n\r\n');
        term.write('$ ');

        // Handle resize
        const handleResize = () => {
            if (!fitAddonRef.current || !term) return;
            try {
                fitAddonRef.current.fit();
                if (socket) {
                    socket.emit('docker:terminal:resize', {
                        agentId,
                        containerId,
                        cols: term.cols,
                        rows: term.rows
                    });
                }
            } catch (e) {
                console.error('Resize error:', e);
            }
        };

        window.addEventListener('resize', handleResize);

        // Use ResizeObserver to handle flex layout changes
        const resizeObserver = new ResizeObserver(() => {
            // Debounce slightly to allow layout to settle
            setTimeout(handleResize, 10);
        });

        if (terminalRef.current) {
            resizeObserver.observe(terminalRef.current);
        }

        // Local line buffer for editing
        let currentLine = '';

        // Handle input with local echo and editing
        term.onData((data) => {
            const code = data.charCodeAt(0);

            // Enter key (13)
            if (code === 13) {
                term.write('\r\n');
                socket.emit('docker:terminal:data', {
                    agentId,
                    containerId,
                    data: currentLine + '\n'
                });
                currentLine = '';
            }
            // Backspace (127)
            else if (code === 127) {
                if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1);
                    // Move back, print space, move back
                    term.write('\b \b');
                }
            }
            // Control characters (ignore mostly, except maybe Ctrl+C)
            else if (code < 32) {
                // Pass through Ctrl+C (3)
                if (code === 3) {
                    socket.emit('docker:terminal:data', {
                        agentId,
                        containerId,
                        data: '\x03'
                    });
                    term.write('^C\r\n');
                    currentLine = '';
                }
            }
            // Normal characters
            else {
                currentLine += data;
                term.write(data);
            }
        });

        // Listen for output from backend
        const handleTerminalData = (data) => {
            if (data.containerId === containerId) {
                term.write(data.data);
            }
        };

        socket.on('docker:terminal:data', handleTerminalData);

        // Start terminal session
        socket.emit('docker:terminal:start', { agentId, containerId });

        // Initial resize
        setTimeout(() => handleResize(), 100);

        return () => {
            socket.off('docker:terminal:data', handleTerminalData);
            socket.emit('docker:terminal:stop', { agentId, containerId });
            term.dispose();
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [socket, containerId, agentId]);

    return (
        <div className="flex-1 h-full w-full bg-[#1e1e1e] rounded-lg overflow-hidden flex flex-col border border-white/10 shadow-inner">
            {/* Terminal Header */}
            <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <span className="ml-3 text-xs text-gray-400 font-mono">root@{containerId.substring(0, 12)}:~</span>
                </div>
                <div className="text-xs text-gray-500">bash</div>
            </div>
            <div className="flex-1 p-2 relative" style={{ height: '100%' }}>
                <div ref={terminalRef} className="absolute inset-2" />
            </div>
        </div>
    );
};

export default ContainerTerminal;
