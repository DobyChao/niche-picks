import { NextRequest, NextResponse } from 'next/server';
import { consumeRate, getClientIp } from '@/lib/server/security';

const SAFE_PATH = /^v[3-5]\/[A-Za-z0-9_./-]{1,180}$/;
const SAFE_CALLBACK = /^[_$a-zA-Z][_$a-zA-Z0-9.]{0,64}$/;
const MAX_UPSTREAM_BYTES = 2_000_000;

function sameOrigin(request: NextRequest): boolean {
  const site = request.headers.get('sec-fetch-site');
  const mode = request.headers.get('sec-fetch-mode');
  if (mode === 'navigate') return false;
  if (site === 'same-origin') return true;
  if (site === 'cross-site' || site === 'same-site' || site === 'none') return false;

  const expected = request.nextUrl.origin;
  const origin = request.headers.get('origin');
  if (origin) return origin === expected;
  const referer = request.headers.get('referer');
  if (!referer) return false;
  try {
    return new URL(referer).origin === expected;
  } catch {
    return false;
  }
}

function safeContentType(upstream: string | null, isJsonp: boolean): string {
  if (isJsonp) return 'application/javascript; charset=utf-8';
  const base = (upstream || '').split(';')[0].trim().toLowerCase();
  if (base === 'application/json' || base === 'text/plain' || base === 'application/javascript') {
    return `${base}; charset=utf-8`;
  }
  return 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!sameOrigin(request)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  if (!consumeRate(`amap:${getClientIp(request)}`, 300, 60_000)) {
    return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const { path: pathSegments } = await params;
  const path = pathSegments.join('/');
  if (!SAFE_PATH.test(path) || path.includes('..') || path.includes('//')) {
    return new NextResponse('Invalid AMap path', { status: 400 });
  }

  const jscode = process.env.AMAP_SECURITY_CODE;
  if (!jscode) {
    return new NextResponse('Missing AMAP_SECURITY_CODE', { status: 500 });
  }

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const callback = searchParams.get('callback');
  if (callback && !SAFE_CALLBACK.test(callback)) {
    searchParams.delete('callback');
  }
  searchParams.delete('jscode');
  searchParams.set('jscode', jscode);

  const upstreamBase = path.startsWith('v4/map/styles')
    ? 'https://webapi.amap.com'
    : 'https://restapi.amap.com';
  const target = new URL(`${upstreamBase}/${path}`);
  if (target.origin !== new URL(upstreamBase).origin) {
    return new NextResponse('Invalid AMap path', { status: 400 });
  }
  target.search = searchParams.toString();

  let response: Response;
  try {
    response = await fetch(target, {
      signal: AbortSignal.timeout(12_000),
      redirect: 'manual',
    });
  } catch (err) {
    console.error('[amap proxy] upstream fetch failed:', err instanceof Error ? err.message : 'unknown');
    return new NextResponse('AMap upstream request failed', { status: 504 });
  }

  if (response.status >= 300 && response.status < 400) {
    return new NextResponse('AMap upstream redirect blocked', { status: 502 });
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_UPSTREAM_BYTES) {
    return new NextResponse('AMap upstream response too large', { status: 502 });
  }

  let data = new TextDecoder().decode(bytes);
  if (jscode) data = data.split(jscode).join('');

  const isJsonp = searchParams.has('callback');
  return new NextResponse(data, {
    status: response.status,
    headers: {
      'Content-Type': safeContentType(response.headers.get('content-type'), isJsonp),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=60',
    },
  });
}
