import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  const path = pathSegments.join('/');
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
