import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}
