const si = require('systeminformation');

/**
 * Collect comprehensive Docker data including containers, images, volumes, and system info
 * @returns {Promise<Object>} Docker data object
 */
async function collectDockerData() {
    const dockerData = {
        containers: [],
        images: [],
        volumes: [],
        networks: [],
        info: null
    };

    try {
        // Get all containers (running and stopped)
        const allContainers = await si.dockerContainers(true);
        dockerData.containers = allContainers.map(c => ({
            id: c.id,
            name: c.name,
            image: c.image,
            imageID: c.imageID,
            state: c.state,
            status: c.status,
            created: c.created,
            started: c.started,
            finished: c.finished,
            ports: c.ports || [],
            mounts: c.mounts || [],
            restartCount: c.restartCount || 0,
            platform: c.platform,
            command: c.command
        }));

        // Get container stats for running containers
        const runningContainers = allContainers.filter(c => c.state === 'running');
        for (const container of runningContainers) {
            try {
                const stats = await si.dockerContainerStats(container.id);
                if (stats && stats.length > 0) {
                    const stat = stats[0];
                    const containerIndex = dockerData.containers.findIndex(c => c.id === container.id);
                    if (containerIndex !== -1) {
                        dockerData.containers[containerIndex].stats = {
                            cpuPercent: stat.cpuPercent || 0,
                            memUsage: stat.memUsage || 0,
                            memLimit: stat.memLimit || 0,
                            memPercent: stat.memPercent || 0,
                            netIO: {
                                rx: stat.netIO?.rx || 0,
                                wx: stat.netIO?.wx || 0
                            },
                            blockIO: {
                                r: stat.blockIO?.r || 0,
                                w: stat.blockIO?.w || 0
                            },
                            pids: stat.pids || 0
                        };
                    }
                }
            } catch (e) {
                // Stats not available for this container
            }
        }

        // Get Docker images
        const images = await si.dockerImages();
        dockerData.images = images.map(img => ({
            id: img.id,
            container: img.container,
            comment: img.comment,
            os: img.os,
            architecture: img.architecture,
            parent: img.parent,
            dockerVersion: img.dockerVersion,
            size: img.size || 0,
            sharedSize: img.sharedSize || 0,
            virtualSize: img.virtualSize || 0,
            author: img.author,
            created: img.created,
            repoTags: img.repoTags,
            containerConfig: img.containerConfig,
            config: img.config
        }));

        // Get Docker volumes
        const volumes = await si.dockerVolumes();
        dockerData.volumes = volumes.map(vol => ({
            name: vol.name,
            driver: vol.driver,
            labels: vol.labels,
            mountpoint: vol.mountpoint,
            options: vol.options,
            scope: vol.scope,
            created: vol.created
        }));

        // Get Docker Networks
        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execPromise = util.promisify(exec);

            // Get list of network IDs
            const { stdout: lsOut } = await execPromise('docker network ls -q');
            const networkIds = lsOut.trim().split('\n').filter(id => id);

            if (networkIds.length > 0) {
                // Inspect all networks
                const { stdout: inspectOut } = await execPromise(`docker network inspect ${networkIds.join(' ')}`);
                const networksInfo = JSON.parse(inspectOut);

                dockerData.networks = networksInfo.map(net => ({
                    id: net.Id,
                    name: net.Name,
                    driver: net.Driver,
                    scope: net.Scope,
                    created: net.Created,
                    internal: net.Internal,
                    attachable: net.Attachable,
                    ingress: net.Ingress,
                    subnet: net.IPAM?.Config?.[0]?.Subnet || '',
                    gateway: net.IPAM?.Config?.[0]?.Gateway || '',
                    containers: net.Containers ? Object.keys(net.Containers).map(cid => ({
                        id: cid,
                        name: net.Containers[cid].Name,
                        ipv4: net.Containers[cid].IPv4Address,
                        ipv6: net.Containers[cid].IPv6Address,
                        mac: net.Containers[cid].MacAddress
                    })) : []
                }));
            }
        } catch (netError) {
            console.error('Error collecting docker networks:', netError.message);
        }

        // Get Docker info
        const info = await si.dockerInfo();
        dockerData.info = {
            id: info.id,
            containers: info.containers,
            containersRunning: info.containersRunning,
            containersPaused: info.containersPaused,
            containersStopped: info.containersStopped,
            images: info.images,
            driver: info.driver,
            memoryLimit: info.memoryLimit,
            swapLimit: info.swapLimit,
            kernelMemory: info.kernelMemory,
            cpuCfsPeriod: info.cpuCfsPeriod,
            cpuCfsQuota: info.cpuCfsQuota,
            cpuShares: info.cpuShares,
            cpuSet: info.cpuSet,
            ipv4Forwarding: info.ipv4Forwarding,
            bridgeNfIptables: info.bridgeNfIptables,
            bridgeNfIp6tables: info.bridgeNfIp6tables,
            debug: info.debug,
            nfd: info.nfd,
            oomKillDisable: info.oomKillDisable,
            ngoroutines: info.ngoroutines,
            systemTime: info.systemTime,
            loggingDriver: info.loggingDriver,
            cgroupDriver: info.cgroupDriver,
            nEventsListener: info.nEventsListener,
            kernelVersion: info.kernelVersion,
            operatingSystem: info.operatingSystem,
            osType: info.osType,
            architecture: info.architecture,
            ncpu: info.ncpu,
            memTotal: info.memTotal,
            dockerRootDir: info.dockerRootDir,
            httpProxy: info.httpProxy,
            httpsProxy: info.httpsProxy,
            noProxy: info.noProxy,
            name: info.name,
            serverVersion: info.serverVersion
        };

    } catch (e) {
        // Docker might not be running or accessible
        console.log('Docker not available:', e.message);
    }

    return dockerData;
}

module.exports = {
    collectDockerData
};
