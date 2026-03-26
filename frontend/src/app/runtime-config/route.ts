import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    wsUrl: process.env.API_PUBLIC_URL || '',
    apiPort: process.env.API_PORT || '9001',
  });
}
