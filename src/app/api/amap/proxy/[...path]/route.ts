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
  const response = await fetch(targetUrl);
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
