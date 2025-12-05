const mongoose = require('mongoose');
const Metric = require('../src/models/Metric');
const Agent = require('../src/models/Agent');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testReport() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/nexus-monitor';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const agent = await Agent.findOne();
        if (!agent) {
            console.log('No agents found');
            return;
        }
        console.log(`Testing report for agent: ${agent.name} (${agent._id})`);

        // Create a dummy metric if none exist
        const metricCount = await Metric.countDocuments({ agent: agent._id });
        if (metricCount === 0) {
            console.log('Creating dummy metric...');
            await Metric.create({
                agent: agent._id,
                cpu: { load: 10, user: 5, sys: 5 },
                memory: { total: 16000000000, used: 8000000000 },
                network: [{ rx_sec: 1024, tx_sec: 2048 }],
                timestamp: new Date()
            });
        }

        const metrics = await Metric.find({ agent: agent._id }).limit(5);
        console.log(`Found ${metrics.length} metrics.`);

        // Simulate Controller Logic
        let csv = 'Timestamp,CPU Load (%),Memory Used (MB),Memory Total (MB),Memory Usage (%),Network RX (KB/s),Network TX (KB/s)\n';
        metrics.forEach(m => {
            const time = new Date(m.timestamp).toLocaleString();
            const cpu = m.cpu?.load?.toFixed(2) || 0;
            const memUsed = (m.memory?.used / 1024 / 1024).toFixed(2) || 0;
            const memTotal = (m.memory?.total / 1024 / 1024).toFixed(2) || 0;
            const memPercent = m.memory?.total ? ((m.memory.used / m.memory.total) * 100).toFixed(2) : 0;
            const netRx = m.network?.[0]?.rx_sec ? (m.network[0].rx_sec / 1024).toFixed(2) : 0;
            const netTx = m.network?.[0]?.tx_sec ? (m.network[0].tx_sec / 1024).toFixed(2) : 0;
            csv += `"${time}",${cpu},${memUsed},${memTotal},${memPercent},${netRx},${netTx}\n`;
        });

        console.log('Generated CSV Preview:');
        console.log(csv);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testReport();
