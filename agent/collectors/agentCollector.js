const si = require('systeminformation');
const os = require('os');

/**
 * Collect static agent information
 * @param {string} agentName - Name of the agent
 * @returns {Promise<Object>} Agent information object
 */
async function collectAgentInfo(agentName) {
    try {
        const osInfo = await si.osInfo();
        const system = await si.system();

        return {
            name: agentName,
            hostname: os.hostname(),
            platform: os.platform(),
            distro: osInfo.distro,
            release: osInfo.release,
            model: system.model,
            manufacturer: system.manufacturer,
        };
    } catch (error) {
        console.error('Error collecting agent info:', error);
        return {
            name: agentName,
            hostname: os.hostname(),
            platform: os.platform(),
        };
    }
}

module.exports = {
    collectAgentInfo
};
