import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://webapi.amap.com https://*.amap.com https://*.autonavi.com",
  "style-src 'self' 'unsafe-inline' https://webapi.amap.com https://*.amap.com",
  "img-src 'self' data: blob: https://*.amap.com https://*.autonavi.com https://*.is.autonavi.com",
  "font-src 'self' data: https://webapi.amap.com https://*.amap.com",
  "connect-src 'self' https://webapi.amap.com https://restapi.amap.com https://*.amap.com https://*.autonavi.com",
  "worker-src 'self' blob:",
  "child-src blob:",
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/_AMapService/:path*',
        destination: '/api/amap/proxy/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=15552000' },
        ],
      },
    ];
  },
};

export default nextConfig;
