import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/_AMapService/:path*',
        destination: '/api/amap/proxy/:path*',
      },
    ];
  },
};

export default nextConfig;
