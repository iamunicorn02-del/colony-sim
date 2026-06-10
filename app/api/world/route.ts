import { NextResponse } from 'next/server';

const WS_SERVER = process.env.WS_SERVER_URL || 'http://localhost:3001';

export async function POST(request: Request) {
  let seed: number | undefined;
  try {
    const body = await request.json();
    seed = body.seed;
  } catch {
    // ignore
  }

  const res = await fetch(`${WS_SERVER}/api/world`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seed }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
