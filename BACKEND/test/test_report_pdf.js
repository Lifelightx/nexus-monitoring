const mongoose = require('mongoose');
const Metric = require('../src/models/Metric');
const Agent = require('../src/models/Agent');
const dotenv = require('dotenv');
const PDFDocument = require('pdfkit-table');
const fs = require('fs');

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
        console.log(`Testing PDF report for agent: ${agent.name} (${agent._id})`);

        const metrics = await Metric.find({ agent: agent._id }).limit(5);
        if (metrics.length === 0) {
            console.log('No metrics found, creating dummy...');
            await Metric.create({
                agent: agent._id,
                cpu: { load: 85, user: 5, sys: 5 }, // High load for testing color
                memory: { total: 16000000000, used: 8000000000 },
                network: [{ rx_sec: 1024, tx_sec: 2048 }],
                timestamp: new Date()
            });
        }

        // Simulate Controller Logic (Simplified for script)
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const stream = fs.createWriteStream('test_report.pdf');
        doc.pipe(stream);

        doc.fontSize(20).text('Test Report', 30, 30);

        const table = {
            title: "Detailed Metrics",
            headers: ["Timestamp", "CPU", "Memory"],
            datas: metrics.map(m => ({
                Timestamp: new Date(m.timestamp).toLocaleString(),
                CPU: m.cpu?.load?.toFixed(2),
                Memory: (m.memory?.used / 1024 / 1024).toFixed(2)
            }))
        };

        await doc.table(table);
        doc.end();

        console.log('PDF generated successfully: test_report.pdf');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testReport();
