const axios = require('axios');

async function testBackend() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'test@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token obtained.');

        // 2. Get Agents
        console.log('Fetching agents...');
        const agentsRes = await axios.get('http://localhost:5000/api/agents', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Agents found:', agentsRes.data.length);
        agentsRes.data.forEach(agent => {
            console.log(`- ${agent.name} (${agent.status}) [${agent.platform}]`);
        });

    } catch (error) {
        console.error('Test failed:', error.response ? error.response.data : error.message);
    }
}

testBackend();
