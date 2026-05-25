import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: output: "standalone" is needed for production deployment (build.sh)
  // but should be commented out for dev mode. The platform runs "bun run dev" automatically.
  // output: "standalone",
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
