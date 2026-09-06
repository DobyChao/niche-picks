import { NextRequest, NextResponse } from 'next/server';
import { clientIp } from '@/lib/server/auth';
import { rateLimit } from '@/lib/server/rate-limit';

// Endpoints the JS SDK actually calls through serviceHost: Geocoder,
// PlaceSearch, DistrictSearch, city IP lookup, and vector map styles.
const ALLOWED_PATH_PREFIXES = ['v3/place/', 'v3/geocode', 'v3/config/', 'v3/ip', 'v4/map/styles'];

const PROXY_WINDOW_MS = 60_000;
const PROXY_LIMIT_PER_IP = 300;

function isSameSite(request: NextRequest): boolean {
  const host = request.headers.get('host');
  if (!host) return false;

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // JSONP <script> loads carry Referer instead of Origin. Requests with
  // neither header are not browser-driven page traffic — reject them.
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  const path = pathSegments.join('/');

  if (!ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return new NextResponse('Forbidden path', { status: 403 });
  }

  if (!isSameSite(request)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const ip = clientIp(request);
  const { allowed, retryAfterSec } = rateLimit(`amap:${ip}`, PROXY_LIMIT_PER_IP, PROXY_WINDOW_MS);
  if (!allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec) },
    });
  }

  const jscode = process.env.AMAP_SECURITY_CODE;

  if (!jscode) {
    return new NextResponse('Missing AMAP_SECURITY_CODE', { status: 500 });
  }

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  searchParams.set('jscode', jscode);

  const upstreamBase = path.startsWith('v4/map/styles')
    ? 'https://webapi.amap.com'
    : 'https://restapi.amap.com';

  const targetUrl = `${upstreamBase}/${path}?${searchParams.toString()}`;
  let response: Response;
  try {
    response = await fetch(targetUrl, { signal: AbortSignal.timeout(12_000) });
  } catch (err) {
    console.error('[amap proxy] upstream fetch failed:', err);
    return new NextResponse('AMap upstream request failed', { status: 504 });
  }
  const data = await response.text();

  // JSONP requests have a callback parameter — must return JS, not JSON
  const isJsonp = url.searchParams.has('callback');
  const contentType = isJsonp
    ? 'application/javascript'
    : (response.headers.get('Content-Type') || 'application/json');

  return new NextResponse(data, {
    status: response.status,
    headers: {
      'Content-Type': contentType,
    },
  });
}
