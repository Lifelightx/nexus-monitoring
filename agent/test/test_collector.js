const { collectSystemMetrics } = require('../collectors/systemCollector');

async function test() {
    console.log('Testing collectSystemMetrics...');
    try {
        const metrics = await collectSystemMetrics();
        console.log('Metrics collected:', JSON.stringify(metrics, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
