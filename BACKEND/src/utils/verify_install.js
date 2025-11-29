const API_URL = 'http://localhost:3000';

async function test() {
    console.log('Starting verification (using fetch)...');

    try {
        // 1. Get Token
        console.log('1. Fetching token...');
        const tokenRes = await fetch(`${API_URL}/api/install/token`);
        if (!tokenRes.ok) throw new Error(`Failed to get token: ${tokenRes.statusText}`);
        const tokenData = await tokenRes.json();
        const token = tokenData.token;
        if (!token) throw new Error('No token received');
        console.log('   Token received:', token.substring(0, 10) + '...');

        // 2. Get Script
        console.log('2. Fetching install script...');
        const scriptRes = await fetch(`${API_URL}/api/install/script`);
        if (!scriptRes.ok) throw new Error(`Failed to get script: ${scriptRes.statusText}`);
        const scriptText = await scriptRes.text();
        if (!scriptText.includes('Nexus Agent Installation Script')) throw new Error('Invalid script content');
        console.log('   Script received and verified.');

        console.log('Verification PASSED (HTTP Endpoints)!');
        console.log('Note: Socket connection not verified due to missing client lib, but token generation works.');

    } catch (err) {
        console.error('Verification FAILED:', err.message);
        process.exit(1);
    }
}

test();
