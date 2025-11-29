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
            uptime: time.uptime
        };
    } catch (error) {
        console.error('Error collecting system metrics:', error);
        return null;
    }
}

module.exports = {
    collectSystemMetrics
};
