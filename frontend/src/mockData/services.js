// Mock service data for APM demonstration
export const mockServices = [
    {
        id: 'svc-001',
        name: 'device-api',
        type: 'Node.js',
        host: 'APMOSYSLT0953',
        hostId: '507f1f77bcf86cd799439011',
        port: 3000,
        health: 'critical',
        status: 'running',
        uptime: 86400,
        version: '2.1.0',
        metrics: {
            requestsPerMin: 800,
            p50Latency: 450,
            p95Latency: 890,
            p99Latency: 1200,
            errorRate: 1.2,
            availability: 99.2,
            throughput: 13.3
        },
        baseline: {
            p95Latency: 690,
            errorRate: 0.4,
            requestsPerMin: 695
        },
        endpoints: [
            {
                id: 'ep-001',
                method: 'GET',
                path: '/devices',
                p50: 800,
                p95: 1200,
                p99: 1500,
                errorRate: 1.5,
                requestsPerMin: 300,
                calls: 5000,
                breakdown: {
                    code: 80,
                    database: 1020,
                    external: 100
                },
                databaseCalls: [
                    {
                        type: 'MongoDB',
                        operation: 'find',
                        query: 'db.devices.find({status: "active"})',
                        duration: 1010,
                        rowsReturned: 1245
                    },
                    {
                        type: 'Redis',
                        operation: 'get',
                        query: 'GET device:cache:*',
                        duration: 10,
                        rowsReturned: 1
                    }
                ]
            },
            {
                id: 'ep-002',
                method: 'POST',
                path: '/connect',
                p50: 600,
                p95: 900,
                p99: 1100,
                errorRate: 0.8,
                requestsPerMin: 200,
                calls: 3200,
                breakdown: {
                    code: 120,
                    database: 680,
                    external: 100
                }
            },
            {
                id: 'ep-003',
                method: 'GET',
                path: '/health',
                p50: 8,
                p95: 12,
                p99: 18,
                errorRate: 0,
                requestsPerMin: 100,
                calls: 1600,
                breakdown: {
                    code: 12,
                    database: 0,
                    external: 0
                }
            }
        ],
        dependencies: [
            { type: 'database', name: 'MongoDB', latency: 1010, health: 'critical' },
            { type: 'service', name: 'auth-api', latency: 120, health: 'healthy' },
            { type: 'cache', name: 'Redis', latency: 10, health: 'healthy' }
        ]
    },
    {
        id: 'svc-002',
        name: 'auth-api',
        type: 'Node.js',
        host: 'APMOSYSLT0953',
        hostId: '507f1f77bcf86cd799439011',
        port: 3001,
        health: 'healthy',
        status: 'running',
        uptime: 172800,
        version: '1.5.2',
        metrics: {
            requestsPerMin: 300,
            p50Latency: 80,
            p95Latency: 120,
            p99Latency: 180,
            errorRate: 0,
            availability: 99.9,
            throughput: 5
        },
        baseline: {
            p95Latency: 115,
            errorRate: 0,
            requestsPerMin: 280
        },
        endpoints: [
            {
                id: 'ep-006',
                method: 'POST',
                path: '/login',
                p50: 80,
                p95: 120,
                p99: 180,
                errorRate: 0,
                requestsPerMin: 150,
                calls: 2400,
                breakdown: {
                    code: 40,
                    database: 70,
                    external: 10
                }
            }
        ],
        dependencies: [
            { type: 'database', name: 'MongoDB', latency: 70, health: 'healthy' },
            { type: 'cache', name: 'Redis', latency: 10, health: 'healthy' }
        ]
    },
    {
        id: 'svc-003',
        name: 'payment-api',
        type: 'Node.js',
        host: 'APMOSYSLT0954',
        hostId: '507f1f77bcf86cd799439012',
        port: 3002,
        health: 'warning',
        status: 'running',
        uptime: 43200,
        version: '3.0.1',
        metrics: {
            requestsPerMin: 450,
            p50Latency: 520,
            p95Latency: 820,
            p99Latency: 1100,
            errorRate: 0.5,
            availability: 99.5,
            throughput: 7.5
        },
        baseline: {
            p95Latency: 650,
            errorRate: 0.2,
            requestsPerMin: 420
        },
        endpoints: [
            {
                id: 'ep-009',
                method: 'POST',
                path: '/payment',
                p50: 700,
                p95: 1100,
                p99: 1500,
                errorRate: 0.8,
                requestsPerMin: 200,
                calls: 3200,
                breakdown: {
                    code: 100,
                    database: 200,
                    external: 800
                }
            }
        ],
        dependencies: [
            { type: 'database', name: 'MongoDB', latency: 200, health: 'healthy' },
            { type: 'external', name: 'Stripe API', latency: 800, health: 'warning' }
        ]
    },
    {
        id: 'svc-004',
        name: 'notification-api',
        type: 'Node.js',
        host: 'APMOSYSLT0953',
        hostId: '507f1f77bcf86cd799439011',
        port: 3003,
        health: 'healthy',
        status: 'running',
        uptime: 259200,
        version: '1.2.0',
        metrics: {
            requestsPerMin: 150,
            p50Latency: 60,
            p95Latency: 95,
            p99Latency: 130,
            errorRate: 0,
            availability: 99.95,
            throughput: 2.5
        },
        baseline: {
            p95Latency: 90,
            errorRate: 0,
            requestsPerMin: 140
        },
        endpoints: [
            {
                id: 'ep-012',
                method: 'POST',
                path: '/send',
                p50: 60,
                p95: 95,
                p99: 130,
                errorRate: 0,
                requestsPerMin: 100,
                calls: 1600,
                breakdown: {
                    code: 30,
                    database: 20,
                    external: 45
                }
            }
        ],
        dependencies: [
            { type: 'database', name: 'MongoDB', latency: 20, health: 'healthy' },
            { type: 'external', name: 'SendGrid API', latency: 45, health: 'healthy' }
        ]
    },
    {
        id: 'svc-005',
        name: 'api-gateway',
        type: 'Nginx',
        host: 'APMOSYSLT0953',
        hostId: '507f1f77bcf86cd799439011',
        port: 80,
        health: 'healthy',
        status: 'running',
        uptime: 604800,
        version: '1.21.6',
        metrics: {
            requestsPerMin: 1200,
            p50Latency: 150,
            p95Latency: 220,
            p99Latency: 300,
            errorRate: 0.1,
            availability: 99.99,
            throughput: 20
        },
        baseline: {
            p95Latency: 210,
            errorRate: 0.1,
            requestsPerMin: 1150
        },
        endpoints: [
            {
                id: 'ep-014',
                method: 'ALL',
                path: '/*',
                p50: 150,
                p95: 220,
                p99: 300,
                errorRate: 0.1,
                requestsPerMin: 1200,
                calls: 19200,
                breakdown: {
                    code: 20,
                    database: 0,
                    external: 200
                }
            }
        ],
        dependencies: [
            { type: 'service', name: 'device-api', latency: 890, health: 'critical' },
            { type: 'service', name: 'auth-api', latency: 120, health: 'healthy' },
            { type: 'service', name: 'payment-api', latency: 820, health: 'warning' }
        ]
    }
];

export const getServiceById = (id) => mockServices.find(service => service.id === id);
export const getServiceByName = (name) => mockServices.find(service => service.name === name);
export const getServicesByHost = (hostId) => mockServices.filter(service => service.hostId === hostId);
export const getEndpointById = (serviceId, endpointId) => {
    const service = getServiceById(serviceId);
    return service?.endpoints.find(ep => ep.id === endpointId);
};

export const getGlobalMetrics = () => {
    const totalServices = mockServices.length;
    const totalRequestsPerMin = mockServices.reduce((sum, s) => sum + s.metrics.requestsPerMin, 0);
    const avgErrorRate = mockServices.reduce((sum, s) => sum + s.metrics.errorRate, 0) / totalServices;
    const avgLatency = mockServices.reduce((sum, s) => sum + s.metrics.p95Latency, 0) / totalServices;
    const problemCount = mockServices.filter(s => s.health === 'critical' || s.health === 'warning').length;

    return {
        totalServices,
        totalRequestsPerMin,
        avgErrorRate: parseFloat(avgErrorRate.toFixed(2)),
        avgLatency: Math.round(avgLatency),
        problemCount,
        healthyServices: mockServices.filter(s => s.health === 'healthy').length,
        warningServices: mockServices.filter(s => s.health === 'warning').length,
        criticalServices: mockServices.filter(s => s.health === 'critical').length
    };
};
