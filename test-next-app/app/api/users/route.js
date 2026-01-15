import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import axios from 'axios';

export async function GET() {
    await dbConnect();

    try {
        // 1. Fetch local users from MongoDB
        const users = await User.find({}).limit(5);

        // 2. Fetch external users (simulating distributed tracing)
        const externalResponse = await axios.get('https://jsonplaceholder.typicode.com/users?_limit=3');
        const externalUsers = externalResponse.data;

        return NextResponse.json({ success: true, local: users, external: externalUsers });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request) {
    await dbConnect();

    try {
        const body = await request.json();
        const user = await User.create(body);
        return NextResponse.json({ success: true, data: user }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
