const API_URL = 'http://localhost:3000';

async function test() {
    console.log('Starting verification (File Download)...');

    try {
        // 1. Get File
        console.log('1. Fetching agent/index.js...');
        const fileRes = await fetch(`${API_URL}/api/install/files/index.js`);
        if (!fileRes.ok) throw new Error(`Failed to get file: ${fileRes.statusText}`);
        const fileContent = await fileRes.text();

        if (!fileContent.includes('Starting Nexus Agent')) throw new Error('Invalid file content');
        console.log('   File received and verified.');

        // 2. Get Nested File
        console.log('2. Fetching agent/collectors/systemCollector.js...');
        const nestedRes = await fetch(`${API_URL}/api/install/files/collectors/systemCollector.js`);
        if (!nestedRes.ok) throw new Error(`Failed to get nested file: ${nestedRes.statusText}`);
        console.log('   Nested file received.');

        console.log('Verification PASSED!');

    } catch (err) {
        console.error('Verification FAILED:', err.message);
        process.exit(1);
    }
}

test();
