import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
    try {
        // 1. CPU Intensive Task
        const start = Date.now();
        let result = 0;
        for (let i = 0; i < 5000000; i++) {
            result += Math.sqrt(i);
        }
        const cpuTime = Date.now() - start;

        // 2. Parallel External Requests
        const [posts, comments] = await Promise.all([
            axios.get('https://jsonplaceholder.typicode.com/posts?_limit=5'),
            axios.get('https://jsonplaceholder.typicode.com/comments?_limit=5'),
        ]);

        return NextResponse.json({
            success: true,
            cpuTime: `${cpuTime}ms`,
            data: {
                posts: posts.data.length,
                comments: comments.data.length,
            },
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
