import { NextResponse } from 'next/server';

const WS_SERVER = process.env.WS_SERVER_URL || 'http://localhost:3001';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } | { params: { id: string } } }
) {
  const { id } = 'params' in params && typeof params.params === 'object' ? params.params : params;
  const res = await fetch(`${WS_SERVER}/api/world/${id}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
