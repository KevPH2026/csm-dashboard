import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  // GitHub Pages static export mode
  output: isStaticExport ? 'export' : undefined,
  basePath: isStaticExport ? '/csm-dashboard' : undefined,
  // Disable image optimization for static export (not supported)
  images: isStaticExport ? { unoptimized: true } : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ['http://localhost:81', 'http://127.0.0.1:81', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
