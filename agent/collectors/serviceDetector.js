/**
 * Service Detector - Analyzes processes to identify services
 */

/**
 * Detect services from process list
 * @param {Array} processes - List of processes with port information
 * @param {Array} containers - List of Docker containers (optional)
 * @returns {Array} Detected services
 */
function detectServices(processes, containers = []) {
    const services = [];

    // Detect services from processes with listening ports
    for (const process of processes) {
        if (!process.ports || process.ports.length === 0) continue;

        // Skip system processes
        if (isSystemProcess(process)) continue;

        const service = {
            name: extractServiceName(process),
            type: process.type,
            port: process.ports[0].port, // Primary port
            ports: process.ports.map(p => p.port),
            pid: process.pid,
            command: process.command,
            status: 'running',
            health: 'healthy', // Default to healthy for running services
            detectedFrom: 'host',
            containerId: null,
            containerName: null
        };

        services.push(service);
    }

    // Detect services from containers
    for (const container of containers) {
        console.log('🔍 Checking container:', container.name, 'ports:', JSON.stringify(container.ports));
        const containerService = detectServiceFromContainer(container);
        if (containerService) {
            console.log('✅ Detected container service:', containerService.name, 'port:', containerService.port);
            services.push(containerService);
        } else {
            console.log('❌ No service detected for container:', container.name);
        }
    }

    // Remove duplicates (same port)
    return deduplicateServices(services);
}

/**
 * Extract service name from process information
 * @param {Object} process - Process object
 * @returns {string} Service name
 */
function extractServiceName(process) {
    const command = process.command.toLowerCase();

    // Try to extract from command line arguments
    // Example: "node /app/device-api/server.js" -> "device-api"
    const pathMatch = command.match(/\/([^\/\s]+)\/(server|index|app|main)\.(js|py|jar)/);
    if (pathMatch) {
        return pathMatch[1];
    }

    // Try to extract from working directory
    const dirMatch = command.match(/\/([^\/\s]+)\/[^\/\s]+$/);
    if (dirMatch) {
        return dirMatch[1];
    }

    // Fallback: use process type + port
    return `${process.type.toLowerCase().replace(/\./g, '')}-${process.ports[0].port}`;
}

/**
 * Check if process is a system process (should be ignored)
 * @param {Object} process - Process object
 * @returns {boolean} True if system process
 */
function isSystemProcess(process) {
    const systemProcesses = [
        'systemd', 'sshd', 'cron', 'dbus', 'systemd-resolved',
        'systemd-networkd', 'systemd-logind', 'polkitd',
        'NetworkManager', 'wpa_supplicant', 'dhclient'
    ];

    return systemProcesses.some(sp => process.name.toLowerCase().includes(sp.toLowerCase()));
}

/**
 * Detect service from Docker container
 * @param {Object} container - Container object
 * @returns {Object|null} Service object or null
 */
function detectServiceFromContainer(container) {
    // Skip if container is not running
    if (container.state !== 'running') return null;

    // Extract service information from container
    const ports = extractContainerPorts(container);
    if (ports.length === 0) return null;

    // Detect service type from image name
    const serviceType = detectServiceTypeFromImage(container.image);

    return {
        name: extractServiceNameFromContainer(container),
        type: serviceType,
        port: ports[0],
        ports: ports,
        pid: null,
        command: container.command || '',
        status: 'running',
        health: 'healthy', // Container is running, so healthy
        detectedFrom: 'container',
        containerId: container.id,
        containerName: container.name
    };
}

/**
 * Extract ports from container
 * @param {Object} container - Container object
 * @returns {Array} List of ports
 */
function extractContainerPorts(container) {
    const ports = [];
    console.log('🔧 Extracting ports from container:', container.name);

    if (container.ports && Array.isArray(container.ports)) {
        console.log('   Found ports array with', container.ports.length, 'entries');

        for (const portMapping of container.ports) {
            console.log('   Processing port mapping:', JSON.stringify(portMapping));

            // Handle different port formats
            if (typeof portMapping === 'string') {
                // Port mapping formats:
                // "0.0.0.0:3000->3000/tcp"
                // "0.0.0.0:11000-11100->11000-11100/tcp" (port range)
                // "3000/tcp" (internal only)
                // "27017/tcp"

                // Try to match host port (with possible range)
                const hostMatch = portMapping.match(/:(\d+)(?:-\d+)?->/);
                if (hostMatch) {
                    const port = parseInt(hostMatch[1]);
                    console.log('   ✅ Extracted host port:', port);
                    ports.push(port);
                } else {
                    // Internal port only: "27017/tcp" or "4723/tcp"
                    const internalMatch = portMapping.match(/^(\d+)\//);
                    if (internalMatch) {
                        const port = parseInt(internalMatch[1]);
                        console.log('   ✅ Extracted internal port:', port);
                        ports.push(port);
                    }
                }
            } else if (typeof portMapping === 'object' && portMapping !== null) {
                // Port mapping is an object with properties
                // Actual format from Docker API: { IP: '0.0.0.0', PrivatePort: 9091, PublicPort: 9091, Type: 'tcp' }
                // Also handle systeminformation format: { host: '3000', container: '3000', protocol: 'tcp' }

                if (portMapping.PublicPort) {
                    // Docker API format - use PublicPort (host-mapped port)
                    const port = parseInt(portMapping.PublicPort);
                    console.log('   ✅ Extracted from PublicPort property:', port);
                    ports.push(port);
                } else if (portMapping.PrivatePort) {
                    // Docker API format - use PrivatePort (container internal port)
                    const port = parseInt(portMapping.PrivatePort);
                    console.log('   ✅ Extracted from PrivatePort property:', port);
                    ports.push(port);
                } else if (portMapping.host) {
                    // systeminformation format
                    const port = parseInt(portMapping.host);
                    console.log('   ✅ Extracted from host property:', port);
                    ports.push(port);
                } else if (portMapping.container) {
                    const port = parseInt(portMapping.container);
                    console.log('   ✅ Extracted from container property:', port);
                    ports.push(port);
                } else if (portMapping.containerPort) {
                    const port = parseInt(portMapping.containerPort);
                    console.log('   ✅ Extracted from containerPort property:', port);
                    ports.push(port);
                } else if (portMapping.publicPort) {
                    // Lowercase variant
                    const port = parseInt(portMapping.publicPort);
                    console.log('   ✅ Extracted from publicPort property:', port);
                    ports.push(port);
                } else if (portMapping.privatePort) {
                    // Lowercase variant
                    const port = parseInt(portMapping.privatePort);
                    console.log('   ✅ Extracted from privatePort property:', port);
                    ports.push(port);
                }
            }
        }
    }

    // If no ports found, try to detect from image name (common default ports)
    if (ports.length === 0) {
        console.log('   No ports extracted, trying default port for image:', container.image);
        const defaultPort = getDefaultPortForImage(container.image);
        if (defaultPort) {
            console.log('   ✅ Using default port:', defaultPort);
            ports.push(defaultPort);
        }
    }

    console.log('   Final ports:', ports);
    return ports;
}

/**
 * Get default port for common service images
 * @param {string} imageName - Docker image name
 * @returns {number|null} Default port or null
 */
function getDefaultPortForImage(imageName) {
    const lower = imageName.toLowerCase();

    if (lower.includes('mongo')) return 27017;
    if (lower.includes('redis')) return 6379;
    if (lower.includes('postgres')) return 5432;
    if (lower.includes('mysql')) return 3306;
    if (lower.includes('nginx')) return 80;
    if (lower.includes('apache')) return 80;
    if (lower.includes('elasticsearch')) return 9200;
    if (lower.includes('rabbitmq')) return 5672;
    if (lower.includes('kafka')) return 9092;

    return null;
}

/**
 * Detect service type from Docker image name
 * @param {string} imageName - Docker image name
 * @returns {string} Service type
 */
function detectServiceTypeFromImage(imageName) {
    const lower = imageName.toLowerCase();

    if (lower.includes('node')) return 'Node.js';
    if (lower.includes('python')) return 'Python';
    if (lower.includes('java') || lower.includes('openjdk')) return 'Java';
    if (lower.includes('nginx')) return 'Nginx';
    if (lower.includes('mongo')) return 'MongoDB';
    if (lower.includes('redis')) return 'Redis';
    if (lower.includes('postgres')) return 'PostgreSQL';
    if (lower.includes('mysql')) return 'MySQL';
    if (lower.includes('apache')) return 'Apache';

    return 'Container';
}

/**
 * Extract service name from container
 * @param {Object} container - Container object
 * @returns {string} Service name
 */
function extractServiceNameFromContainer(container) {
    // Use container name (remove leading slash if present)
    let name = container.name.replace(/^\//, '');

    // Clean up common suffixes
    name = name.replace(/-container$/, '');
    name = name.replace(/-service$/, '');
    name = name.replace(/_1$/, ''); // Docker Compose suffix

    return name;
}

/**
 * Remove duplicate services (same port)
 * @param {Array} services - List of services
 * @returns {Array} Deduplicated services
 */
function deduplicateServices(services) {
    const seen = new Map();

    for (const service of services) {
        const key = service.port;

        // Prefer container services over host services
        if (!seen.has(key) || (service.detectedFrom === 'container' && seen.get(key).detectedFrom === 'host')) {
            seen.set(key, service);
        }
    }

    return Array.from(seen.values());
}

/**
 * Enrich service with additional metadata
 * @param {Object} service - Service object
 * @returns {Object} Enriched service
 */
function enrichService(service) {
    return {
        ...service,
        health: 'healthy', // Default, will be updated by health checks
        uptime: null, // Will be calculated from process uptime
        version: null, // Will be detected if possible
        endpoints: [], // Will be populated by endpoint discovery
        metrics: {
            requestsPerMin: 0,
            p95Latency: 0,
            errorRate: 0
        }
    };
}

module.exports = {
    detectServices,
    extractServiceName,
    detectServiceFromContainer,
    enrichService
};
