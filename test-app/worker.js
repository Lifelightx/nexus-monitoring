const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;

app.get('/process', (req, res) => {
    console.log('Worker received request');
    // Simulate work
    setTimeout(() => {
        res.json({ message: 'Processed by worker service', timestamp: Date.now() });
    }, 100 + Math.random() * 200);
});

app.listen(PORT, () => {
    console.log(`Worker service running on port ${PORT}`);
});
