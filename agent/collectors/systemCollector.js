const si = require('systeminformation');

/**
 * Collect system metrics (CPU, Memory, Network)
 * @returns {Promise<Object>} System metrics object
 */
async function collectSystemMetrics() {
    try {
        const cpuLoad = await si.currentLoad();
        const mem = await si.mem();
        const networkStats = await si.networkStats();
        const time = si.time();
        const osInfo = await si.osInfo();
        const networkInterfaces = await si.networkInterfaces();
        const fsSize = await si.fsSize();
        const processes = await si.processes();

        // Get main IP
        const mainInterface = networkInterfaces.find(i => !i.internal && i.ip4) || networkInterfaces[0];

        return {
            cpu: {
                load: cpuLoad.currentLoad,
                user: cpuLoad.currentLoadUser,
                sys: cpuLoad.currentLoadSystem,
            },
            memory: {
                total: mem.total,
                used: mem.used,
                active: mem.active,
                available: mem.available,
            },
            network: networkStats.map(iface => ({
                iface: iface.iface,
                rx_bytes: iface.rx_bytes,
                tx_bytes: iface.tx_bytes,
                rx_sec: iface.rx_sec,
                tx_sec: iface.tx_sec,
            })),
            uptime: time.uptime,
            os: {
                platform: osInfo.platform,
                distro: osInfo.distro,
                release: osInfo.release,
                kernel: osInfo.kernel,
                arch: osInfo.arch,
                hostname: osInfo.hostname,
                ip: mainInterface?.ip4 || 'Unknown'
            },
            disk: fsSize.map(fs => ({
                fs: fs.fs,
                type: fs.type,
                size: fs.size,
                used: fs.used,
                use: fs.use,
                mount: fs.mount
            })),
            processes: {
                all: processes.all,
                running: processes.running,
                blocked: processes.blocked,
                sleeping: processes.sleeping,
                list: processes.list.sort((a, b) => b.cpu - a.cpu).slice(0, 5) // Top 5 by CPU
            }
        };
    } catch (error) {
        console.error('Error collecting system metrics:', error);
        return null;
    }
}

/**
 * Scan disk for largest files
 * @param {string} path - Path to scan
 * @returns {Promise<Array>} List of files
 */
async function scanDisk(path) {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const platform = require('os').platform();

    try {
        let command;
        if (platform === 'win32') {
            // PowerShell command for Windows
            // Get top 50 largest files recursively
            // Note: This might be slow on large drives, might need timeout or limit depth if needed
            const psCommand = `Get-ChildItem -Path "${path}" -Recurse -File -ErrorAction SilentlyContinue | Sort-Object Length -Descending | Select-Object -First 50 Name, Length, FullName | ConvertTo-Json`;
            command = `powershell -Command "${psCommand.replace(/"/g, '\\"')}"`;
        } else {
            // Linux command
            // find . -type f -printf "%s %p\n" | sort -rn | head -n 50
            command = `find "${path}" -type f -printf "%s %p\\n" 2>/dev/null | sort -rn | head -n 50`;
        }

        const { stdout } = await execPromise(command, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer

        if (platform === 'win32') {
            const files = JSON.parse(stdout);
            // Handle single result or array
            const fileList = Array.isArray(files) ? files : [files];
            return fileList.map(f => ({
                name: f.Name,
                path: f.FullName,
                size: f.Length
            }));
        } else {
            return stdout.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const [size, ...pathParts] = line.trim().split(' ');
                    const fullPath = pathParts.join(' ');
                    return {
                        name: fullPath.split('/').pop(),
                        path: fullPath,
                        size: parseInt(size, 10)
                    };
                });
        }
    } catch (error) {
        console.error('Error scanning disk:', error);
        return [];
    }
}

module.exports = {
    collectSystemMetrics,
    scanDisk
};
