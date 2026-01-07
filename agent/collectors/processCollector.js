const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const os = require('os');

/**
 * Collect running processes with detailed information
 * @returns {Promise<Array>} List of processes
 */
async function collectProcesses() {
    const platform = os.platform();
    const processes = [];

    try {
        if (platform === 'linux') {
            // Use ps command to get process information
            const { stdout } = await execPromise(
                'ps aux --no-headers | awk \'{print $2"|"$3"|"$4"|"$11}\'',
                { timeout: 5000 }
            );

            const lines = stdout.trim().split('\n');

            for (const line of lines) {
                const [pid, cpu, mem, command] = line.split('|');

                if (!pid || !command) continue;

                // Get process name from command
                const commandParts = command.split(' ');
                const processName = commandParts[0].split('/').pop();

                processes.push({
                    pid: parseInt(pid),
                    name: processName,
                    command: command.substring(0, 200), // Limit command length
                    cpu: parseFloat(cpu) || 0,
                    memory: parseFloat(mem) || 0,
                    type: detectProcessType(processName, command)
                });
            }
        } else if (platform === 'win32') {
            // Windows: Use PowerShell
            const psCmd = `Get-Process | Select-Object Id, ProcessName, CPU, WorkingSet, Path | ConvertTo-Json`;
            const { stdout } = await execPromise(
                `powershell -Command "${psCmd.replace(/"/g, '\\"')}"`,
                { timeout: 5000 }
            );

            const procs = JSON.parse(stdout);
            const procList = Array.isArray(procs) ? procs : [procs];

            for (const proc of procList) {
                if (!proc.Id) continue;

                processes.push({
                    pid: proc.Id,
                    name: proc.ProcessName,
                    command: proc.Path || proc.ProcessName,
                    cpu: proc.CPU || 0,
                    memory: proc.WorkingSet ? (proc.WorkingSet / 1024 / 1024) : 0, // Convert to MB
                    type: detectProcessType(proc.ProcessName, proc.Path || '')
                });
            }
        }

        return processes;
    } catch (error) {
        console.error('Error collecting processes:', error.message);
        return [];
    }
}

/**
 * Get listening ports and their associated processes
 * @returns {Promise<Array>} List of ports with process info
 */
async function collectListeningPorts() {
    const platform = os.platform();
    const ports = [];

    try {
        if (platform === 'linux') {
            // Use ss or netstat to get listening ports
            let stdout;
            try {
                ({ stdout } = await execPromise('ss -tulpn 2>/dev/null', { timeout: 3000 }));
            } catch {
                // Fallback to netstat if ss not available
                ({ stdout } = await execPromise('netstat -tulpn 2>/dev/null', { timeout: 3000 }));
            }

            const lines = stdout.split('\n').slice(1); // Skip header

            for (const line of lines) {
                if (!line.trim()) continue;

                // Parse ss/netstat output
                const parts = line.trim().split(/\s+/);
                if (parts.length < 5) continue;

                const localAddress = parts[4] || parts[3];
                const processInfo = parts[parts.length - 1];

                // Extract port from address (format: 0.0.0.0:3000 or :::3000)
                const portMatch = localAddress.match(/:(\d+)$/);
                if (!portMatch) continue;

                const port = parseInt(portMatch[1]);

                // Extract PID from process info (format: users:(("node",pid=1234,fd=20)))
                const pidMatch = processInfo.match(/pid=(\d+)/);
                const pid = pidMatch ? parseInt(pidMatch[1]) : null;

                // Extract process name
                const nameMatch = processInfo.match(/\("([^"]+)"/);
                const processName = nameMatch ? nameMatch[1] : null;

                ports.push({
                    port,
                    pid,
                    processName,
                    protocol: parts[0].toLowerCase().includes('tcp') ? 'tcp' : 'udp'
                });
            }
        } else if (platform === 'win32') {
            // Windows: Use netstat
            const { stdout } = await execPromise('netstat -ano', { timeout: 3000 });
            const lines = stdout.split('\n').slice(4); // Skip headers

            for (const line of lines) {
                if (!line.trim() || !line.includes('LISTENING')) continue;

                const parts = line.trim().split(/\s+/);
                if (parts.length < 5) continue;

                const localAddress = parts[1];
                const pid = parseInt(parts[4]);

                // Extract port
                const portMatch = localAddress.match(/:(\d+)$/);
                if (!portMatch) continue;

                const port = parseInt(portMatch[1]);

                ports.push({
                    port,
                    pid,
                    processName: null, // Will be matched with process list
                    protocol: parts[0].toLowerCase()
                });
            }
        }

        return ports;
    } catch (error) {
        console.error('Error collecting listening ports:', error.message);
        return [];
    }
}

/**
 * Detect process type from name and command
 * @param {string} name - Process name
 * @param {string} command - Full command
 * @returns {string} Process type
 */
function detectProcessType(name, command) {
    const lowerName = name.toLowerCase();
    const lowerCommand = command.toLowerCase();

    // Node.js
    if (lowerName.includes('node') || lowerCommand.includes('node')) {
        return 'Node.js';
    }

    // Python
    if (lowerName.includes('python') || lowerCommand.includes('python')) {
        return 'Python';
    }

    // Java
    if (lowerName.includes('java') || lowerCommand.includes('java')) {
        return 'Java';
    }

    // Nginx
    if (lowerName.includes('nginx')) {
        return 'Nginx';
    }

    // MongoDB
    if (lowerName.includes('mongod')) {
        return 'MongoDB';
    }

    // Redis
    if (lowerName.includes('redis')) {
        return 'Redis';
    }

    // PostgreSQL
    if (lowerName.includes('postgres')) {
        return 'PostgreSQL';
    }

    // MySQL
    if (lowerName.includes('mysqld') || lowerName.includes('mysql')) {
        return 'MySQL';
    }

    // Docker
    if (lowerName.includes('dockerd') || lowerName.includes('docker')) {
        return 'Docker';
    }

    // Apache
    if (lowerName.includes('httpd') || lowerName.includes('apache')) {
        return 'Apache';
    }

    return 'Other';
}

/**
 * Merge processes with port information
 * @param {Array} processes - List of processes
 * @param {Array} ports - List of listening ports
 * @returns {Array} Processes with port information
 */
function mergeProcessesWithPorts(processes, ports) {
    const processMap = new Map(processes.map(p => [p.pid, p]));

    // Add port information to processes
    for (const port of ports) {
        const process = processMap.get(port.pid);
        if (process) {
            if (!process.ports) {
                process.ports = [];
            }
            process.ports.push({
                port: port.port,
                protocol: port.protocol
            });
        }
    }

    return processes;
}

/**
 * Main function to collect all process data
 * @returns {Promise<Object>} Process collection result
 */
async function collectProcessData() {
    try {
        const [processes, ports] = await Promise.all([
            collectProcesses(),
            collectListeningPorts()
        ]);

        const processesWithPorts = mergeProcessesWithPorts(processes, ports);

        // Filter to only include processes with ports (potential services)
        const servicesProcesses = processesWithPorts.filter(p => p.ports && p.ports.length > 0);

        return {
            allProcesses: processesWithPorts,
            serviceProcesses: servicesProcesses,
            totalProcesses: processesWithPorts.length,
            totalServices: servicesProcesses.length
        };
    } catch (error) {
        console.error('Error in collectProcessData:', error);
        return {
            allProcesses: [],
            serviceProcesses: [],
            totalProcesses: 0,
            totalServices: 0
        };
    }
}

module.exports = {
    collectProcessData,
    collectProcesses,
    collectListeningPorts,
    detectProcessType
};
