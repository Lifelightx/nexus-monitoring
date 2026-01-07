module.exports = {
    nodejs: {
        enabled: process.env.INSTRUMENT_NODEJS === 'true',
        frameworks: ['express', 'fastify', 'koa', 'mongodb', 'postgresql'],
        sampling: {
            rate: parseFloat(process.env.TRACE_SAMPLING_RATE || '1.0')
        }
    },
    // Placeholders for future language support
    java: {
        enabled: false
    },
    python: {
        enabled: false
    }
};
