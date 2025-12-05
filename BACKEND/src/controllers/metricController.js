const Metric = require('../models/Metric');
const Agent = require('../models/Agent');
const PDFDocument = require('pdfkit-table');

exports.getMetricsReport = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { days = 7 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const metrics = await Metric.find({
            agent: agentId,
            timestamp: { $gte: startDate }
        }).sort({ timestamp: 1 });

        if (!metrics || metrics.length === 0) {
            return res.status(404).json({ message: 'No metrics found for this period' });
        }

        const agent = await Agent.findById(agentId);
        const agentName = agent ? agent.name : 'Unknown_Agent';

        // Create PDF
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const filename = `metrics_report_${agentName}_${new Date().toISOString().split('T')[0]}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // --- Header ---
        doc.rect(0, 0, doc.page.width, 120).fill('#1e293b'); // Dark blue background
        doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('Server Metrics Report', 40, 40);
        doc.fontSize(12).font('Helvetica').text(`Agent: ${agentName}`, 40, 80);
        doc.text(`Period: Last ${days} Days`, 40, 95);
        doc.text(`Generated: ${new Date().toLocaleString()}`, doc.page.width - 250, 95, { align: 'right' });

        // --- Summary Dashboard ---
        doc.moveDown(5);
        const startY = 150;
        const boxWidth = 120;
        const boxHeight = 70;
        const gap = 20;
        // Center the 4 boxes: Total width = (120*4) + (20*3) = 480 + 60 = 540.
        // Page width = 595. Margin = (595 - 540) / 2 = 27.5.
        const startX = (doc.page.width - ((boxWidth * 4) + (gap * 3))) / 2;

        // Helper to draw summary box
        const drawSummaryBox = (x, title, value, color) => {
            doc.roundedRect(x, startY, boxWidth, boxHeight, 5).fillOpacity(0.1).fill(color);
            doc.rect(x, startY, boxWidth, boxHeight).stroke(color); // Border
            doc.fillOpacity(1).fillColor('#334155').fontSize(10).font('Helvetica').text(title, x + 10, startY + 10);
            doc.fillColor(color).fontSize(18).font('Helvetica-Bold').text(value, x + 10, startY + 35);
        };

        let totalCpu = 0;
        let totalMem = 0;
        let maxCpu = 0;
        let maxMem = 0;

        metrics.forEach(m => {
            const cpu = m.cpu?.load || 0;
            const mem = m.memory?.total ? (m.memory.used / m.memory.total) * 100 : 0;
            totalCpu += cpu;
            totalMem += mem;
            if (cpu > maxCpu) maxCpu = cpu;
            if (mem > maxMem) maxMem = mem;
        });

        const avgCpu = (totalCpu / metrics.length).toFixed(1);
        const avgMem = (totalMem / metrics.length).toFixed(1);

        drawSummaryBox(startX, 'Avg CPU Load', `${avgCpu}%`, '#3b82f6'); // Blue
        drawSummaryBox(startX + boxWidth + gap, 'Max CPU Load', `${maxCpu.toFixed(1)}%`, '#ef4444'); // Red
        drawSummaryBox(startX + (boxWidth + gap) * 2, 'Avg Memory', `${avgMem}%`, '#a855f7'); // Purple
        drawSummaryBox(startX + (boxWidth + gap) * 3, 'Max Memory', `${maxMem.toFixed(1)}%`, '#f97316'); // Orange

        doc.moveDown(6);

        // --- Table ---
        doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold').text('Detailed Metrics Log', startX, doc.y);
        doc.fontSize(10).font('Helvetica').fillColor('#64748b').text('High usage (>80%) is highlighted in red.', startX, doc.y + 5);
        doc.moveDown(1);

        const table = {
            headers: [
                { label: "Timestamp", property: 'time', width: 140, renderer: null },
                { label: "CPU (%)", property: 'cpu', width: 80, renderer: null },
                { label: "Memory (%)", property: 'mem', width: 80, renderer: null },
                { label: "Net RX (KB/s)", property: 'rx', width: 100, renderer: null },
                { label: "Net TX (KB/s)", property: 'tx', width: 100, renderer: null }
            ],
            datas: metrics.map(m => {
                const cpu = m.cpu?.load || 0;
                const mem = m.memory?.total ? (m.memory.used / m.memory.total) * 100 : 0;

                return {
                    time: new Date(m.timestamp).toLocaleString(),
                    cpu: cpu.toFixed(2),
                    mem: mem.toFixed(2),
                    rx: m.network?.[0]?.rx_sec ? (m.network[0].rx_sec / 1024).toFixed(2) : '0.00',
                    tx: m.network?.[0]?.tx_sec ? (m.network[0].tx_sec / 1024).toFixed(2) : '0.00',
                    cpuVal: cpu, // Hidden data for styling
                    memVal: mem
                };
            })
        };

        await doc.table(table, {
            x: startX,
            width: 540, // Match dashboard width
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10).fillColor('#1e293b'),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                doc.font("Helvetica").fontSize(10);

                // Zebra Striping
                if (indexRow % 2 === 0) {
                    doc.addBackground(rectRow, '#f1f5f9', 0.5);
                }

                // Color coding logic based on values
                const cpu = parseFloat(row.cpu);
                const mem = parseFloat(row.mem);

                if (cpu > 80 || mem > 80) {
                    doc.fillColor('#ef4444'); // Red
                } else {
                    doc.fillColor('#334155'); // Slate
                }
            },
        });

        // Footer
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).fillColor('#94a3b8').text(
                `Page ${i + 1} of ${range.count}`,
                0,
                doc.page.height - 30,
                { align: 'center' }
            );
        }

        doc.end();

    } catch (error) {
        console.error('Error generating report:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error generating report' });
        }
    }
};
