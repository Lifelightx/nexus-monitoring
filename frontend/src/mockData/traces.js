// Mock trace data for distributed tracing demonstration
export const mockTraces = [
    {
        id: 'trace-001',
        timestamp: new Date(Date.now() - 120000).toISOString(), // 2 min ago
        duration: 1320,
        service: 'device-api',
        endpoint: 'GET /devices',
        status: 200,
        method: 'GET',
        path: '/devices',
        spans: [
            {
                id: 'span-001',
                name: 'device-api.handler()',
                duration: 90,
                startOffset: 0,
                type: 'code',
                service: 'device-api'
            },
            {
                id: 'span-002',
                name: 'MongoDB.find()',
                duration: 1010,
                startOffset: 90,
                type: 'database',
                service: 'device-api',
                metadata: {
                    query: 'db.devices.find({status: "active"})',
                    rowsReturned: 1245,
                    database: 'MongoDB'
                }
            },
            {
                id: 'span-003',
                name: 'auth-api.verify()',
                duration: 120,
                startOffset: 1100,
                type: 'service',
                service: 'auth-api',
                children: [
                    {
                        id: 'span-004',
                        name: 'Redis.get()',
                        duration: 10,
                        startOffset: 1110,
                        type: 'cache',
                        service: 'auth-api',
                        metadata: {
                            key: 'session:abc123',
                            database: 'Redis'
                        }
                    }
                ]
            },
            {
                id: 'span-005',
                name: 'JSON.serialize()',
                duration: 20,
                startOffset: 1220,
                type: 'code',
                service: 'device-api'
            }
        ]
    },
    {
        id: 'trace-002',
        timestamp: new Date(Date.now() - 119000).toISOString(),
        duration: 1280,
        service: 'device-api',
        endpoint: 'GET /devices',
        status: 200,
        method: 'GET',
        path: '/devices',
        spans: [
            {
                id: 'span-006',
                name: 'device-api.handler()',
                duration: 85,
                startOffset: 0,
                type: 'code',
                service: 'device-api'
            },
            {
                id: 'span-007',
                name: 'MongoDB.find()',
                duration: 980,
                startOffset: 85,
                type: 'database',
                service: 'device-api',
                metadata: {
                    query: 'db.devices.find({status: "active"})',
                    rowsReturned: 1230
                }
            },
            {
                id: 'span-008',
                name: 'auth-api.verify()',
                duration: 115,
                startOffset: 1065,
                type: 'service',
                service: 'auth-api'
            },
            {
                id: 'span-009',
                name: 'JSON.serialize()',
                duration: 18,
                startOffset: 1180,
                type: 'code',
                service: 'device-api'
            }
        ]
    },
    {
        id: 'trace-003',
        timestamp: new Date(Date.now() - 118000).toISOString(),
        duration: 890,
        service: 'device-api',
        endpoint: 'POST /connect',
        status: 200,
        method: 'POST',
        path: '/connect',
        spans: [
            {
                id: 'span-010',
                name: 'device-api.handler()',
                duration: 120,
                startOffset: 0,
                type: 'code',
                service: 'device-api'
            },
            {
                id: 'span-011',
                name: 'MongoDB.updateOne()',
                duration: 680,
                startOffset: 120,
                type: 'database',
                service: 'device-api',
                metadata: {
                    query: 'db.devices.updateOne({_id: ObjectId(...)})',
                    rowsReturned: 1
                }
            },
            {
                id: 'span-012',
                name: 'notification-api.send()',
                duration: 90,
                startOffset: 800,
                type: 'service',
                service: 'notification-api'
            }
        ]
    },
    {
        id: 'trace-004',
        timestamp: new Date(Date.now() - 115000).toISOString(),
        duration: 2100,
        service: 'payment-api',
        endpoint: 'POST /payment',
        status: 500,
        method: 'POST',
        path: '/payment',
        error: 'Stripe API timeout',
        spans: [
            {
                id: 'span-013',
                name: 'payment-api.handler()',
                duration: 100,
                startOffset: 0,
                type: 'code',
                service: 'payment-api'
            },
            {
                id: 'span-014',
                name: 'MongoDB.insertOne()',
                duration: 200,
                startOffset: 100,
                type: 'database',
                service: 'payment-api',
                metadata: {
                    query: 'db.transactions.insertOne({...})',
                    rowsReturned: 1
                }
            },
            {
                id: 'span-015',
                name: 'Stripe.charge()',
                duration: 1800,
                startOffset: 300,
                type: 'external',
                service: 'payment-api',
                error: 'Request timeout after 1800ms',
                metadata: {
                    endpoint: 'https://api.stripe.com/v1/charges'
                }
            }
        ]
    },
    {
        id: 'trace-005',
        timestamp: new Date(Date.now() - 110000).toISOString(),
        duration: 120,
        service: 'auth-api',
        endpoint: 'POST /login',
        status: 200,
        method: 'POST',
        path: '/login',
        spans: [
            {
                id: 'span-016',
                name: 'auth-api.handler()',
                duration: 40,
                startOffset: 0,
                type: 'code',
                service: 'auth-api'
            },
            {
                id: 'span-017',
                name: 'MongoDB.findOne()',
                duration: 70,
                startOffset: 40,
                type: 'database',
                service: 'auth-api',
                metadata: {
                    query: 'db.users.findOne({email: "user@example.com"})',
                    rowsReturned: 1
                }
            },
            {
                id: 'span-018',
                name: 'bcrypt.compare()',
                duration: 10,
                startOffset: 110,
                type: 'code',
                service: 'auth-api'
            }
        ]
    },
    {
        id: 'trace-006',
        timestamp: new Date(Date.now() - 105000).toISOString(),
        duration: 1150,
        service: 'payment-api',
        endpoint: 'POST /payment',
        status: 200,
        method: 'POST',
        path: '/payment',
        spans: [
            {
                id: 'span-019',
                name: 'payment-api.handler()',
                duration: 95,
                startOffset: 0,
                type: 'code',
                service: 'payment-api'
            },
            {
                id: 'span-020',
                name: 'MongoDB.insertOne()',
                duration: 180,
                startOffset: 95,
                type: 'database',
                service: 'payment-api'
            },
            {
                id: 'span-021',
                name: 'Stripe.charge()',
                duration: 850,
                startOffset: 275,
                type: 'external',
                service: 'payment-api',
                metadata: {
                    endpoint: 'https://api.stripe.com/v1/charges',
                    amount: 4999
                }
            },
            {
                id: 'span-022',
                name: 'notification-api.send()',
                duration: 25,
                startOffset: 1125,
                type: 'service',
                service: 'notification-api'
            }
        ]
    },
    {
        id: 'trace-007',
        timestamp: new Date(Date.now() - 100000).toISOString(),
        duration: 95,
        service: 'notification-api',
        endpoint: 'POST /send',
        status: 200,
        method: 'POST',
        path: '/send',
        spans: [
            {
                id: 'span-023',
                name: 'notification-api.handler()',
                duration: 30,
                startOffset: 0,
                type: 'code',
                service: 'notification-api'
            },
            {
                id: 'span-024',
                name: 'MongoDB.insertOne()',
                duration: 20,
                startOffset: 30,
                type: 'database',
                service: 'notification-api'
            },
            {
                id: 'span-025',
                name: 'SendGrid.send()',
                duration: 45,
                startOffset: 50,
                type: 'external',
                service: 'notification-api',
                metadata: {
                    endpoint: 'https://api.sendgrid.com/v3/mail/send'
                }
            }
        ]
    },
    {
        id: 'trace-008',
        timestamp: new Date(Date.now() - 95000).toISOString(),
        duration: 450,
        service: 'device-api',
        endpoint: 'PUT /devices/:id',
        status: 200,
        method: 'PUT',
        path: '/devices/abc123',
        spans: [
            {
                id: 'span-026',
                name: 'device-api.handler()',
                duration: 90,
                startOffset: 0,
                type: 'code',
                service: 'device-api'
            },
            {
                id: 'span-027',
                name: 'MongoDB.updateOne()',
                duration: 340,
                startOffset: 90,
                type: 'database',
                service: 'device-api',
                metadata: {
                    query: 'db.devices.updateOne({_id: ObjectId("abc123")})',
                    rowsReturned: 1
                }
            },
            {
                id: 'span-028',
                name: 'Redis.del()',
                duration: 20,
                startOffset: 430,
                type: 'cache',
                service: 'device-api',
                metadata: {
                    key: 'device:abc123'
                }
            }
        ]
    }
];

// Helper functions
export const getTraceById = (id) => {
    return mockTraces.find(trace => trace.id === id);
};

export const getTracesByService = (serviceName) => {
    return mockTraces.filter(trace => trace.service === serviceName);
};

export const getTracesByEndpoint = (serviceName, endpoint) => {
    return mockTraces.filter(trace => trace.service === serviceName && trace.endpoint === endpoint);
};

export const getTracesByStatus = (status) => {
    return mockTraces.filter(trace => trace.status === status);
};

export const getSlowTraces = (threshold = 1000) => {
    return mockTraces.filter(trace => trace.duration >= threshold);
};

export const getErrorTraces = () => {
    return mockTraces.filter(trace => trace.status >= 400);
};

// Calculate trace statistics
export const getTraceStats = () => {
    const totalTraces = mockTraces.length;
    const errorTraces = getErrorTraces().length;
    const avgDuration = mockTraces.reduce((sum, t) => sum + t.duration, 0) / totalTraces;
    const slowTraces = getSlowTraces().length;

    return {
        totalTraces,
        errorTraces,
        errorRate: ((errorTraces / totalTraces) * 100).toFixed(2),
        avgDuration: Math.round(avgDuration),
        slowTraces,
        slowRate: ((slowTraces / totalTraces) * 100).toFixed(2)
    };
};
