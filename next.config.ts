import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Note: output: "standalone" is needed for build.sh deployment
  // but causes issues with "next dev". Remove for dev, add back for build.
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
