// Mock process detection data
export const mockProcesses = [
    {
        pid: 1234,
        name: 'node',
        type: 'Node.js',
        cpu: 12.5,
        memory: 471859200, // 450 MB in bytes
        linkedService: 'device-api',
        command: 'node /app/device-api/server.js',
        port: 3000,
        uptime: 86400,
        threads: 8,
        status: 'running'
    },
    {
        pid: 1235,
        name: 'node',
        type: 'Node.js',
        cpu: 5.2,
        memory: 335544320, // 320 MB
        linkedService: 'auth-api',
        command: 'node /app/auth-api/index.js',
        port: 3001,
        uptime: 172800,
        threads: 6,
        status: 'running'
    },
    {
        pid: 1236,
        name: 'mongod',
        type: 'MongoDB',
        cpu: 30.1,
        memory: 1288490188, // 1.2 GB
        linkedService: null,
        command: 'mongod --config /etc/mongod.conf',
        port: 27017,
        uptime: 604800,
        threads: 24,
        status: 'running'
    },
    {
        pid: 1237,
        name: 'nginx',
        type: 'Nginx',
        cpu: 2.3,
        memory: 83886080, // 80 MB
        linkedService: 'api-gateway',
        command: 'nginx: master process /usr/sbin/nginx',
        port: 80,
        uptime: 604800,
        threads: 4,
        status: 'running'
    },
    {
        pid: 1238,
        name: 'node',
        type: 'Node.js',
        cpu: 3.8,
        memory: 209715200, // 200 MB
        linkedService: 'notification-api',
        command: 'node /app/notification-api/server.js',
        port: 3003,
        uptime: 259200,
        threads: 4,
        status: 'running'
    },
    {
        pid: 1239,
        name: 'redis-server',
        type: 'Redis',
        cpu: 1.5,
        memory: 52428800, // 50 MB
        linkedService: null,
        command: 'redis-server *:6379',
        port: 6379,
        uptime: 604800,
        threads: 4,
        status: 'running'
    },
    {
        pid: 1240,
        name: 'python3',
        type: 'Python',
        cpu: 8.2,
        memory: 314572800, // 300 MB
        linkedService: null,
        command: 'python3 /app/ml-worker/main.py',
        port: null,
        uptime: 43200,
        threads: 12,
        status: 'running'
    },
    {
        pid: 1241,
        name: 'java',
        type: 'Java',
        cpu: 15.6,
        memory: 524288000, // 500 MB
        linkedService: null,
        command: 'java -jar /app/analytics/analytics-service.jar',
        port: 8080,
        uptime: 86400,
        threads: 32,
        status: 'running'
    }
];

// Helper functions
export const getProcessById = (pid) => {
    return mockProcesses.find(proc => proc.pid === pid);
};

export const getProcessesByType = (type) => {
    return mockProcesses.filter(proc => proc.type === type);
};

export const getProcessesByService = (serviceName) => {
    return mockProcesses.filter(proc => proc.linkedService === serviceName);
};

export const getProcessStats = () => {
    const totalProcesses = mockProcesses.length;
    const totalCpu = mockProcesses.reduce((sum, p) => sum + p.cpu, 0);
    const totalMemory = mockProcesses.reduce((sum, p) => sum + p.memory, 0);
    const linkedProcesses = mockProcesses.filter(p => p.linkedService !== null).length;

    return {
        totalProcesses,
        totalCpu: parseFloat(totalCpu.toFixed(2)),
        totalMemory,
        totalMemoryGB: (totalMemory / 1024 / 1024 / 1024).toFixed(2),
        linkedProcesses,
        unlinkedProcesses: totalProcesses - linkedProcesses
    };
};

// Process type detection patterns
export const processTypePatterns = {
    'Node.js': ['node', 'nodejs'],
    'Python': ['python', 'python3', 'python2'],
    'Java': ['java'],
    'MongoDB': ['mongod'],
    'Redis': ['redis-server'],
    'Nginx': ['nginx'],
    'PostgreSQL': ['postgres'],
    'MySQL': ['mysqld'],
    'Docker': ['dockerd'],
    'Kubernetes': ['kubelet', 'kube-proxy']
};
