import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: '**',
      },
    ],
  },
  // Enable standalone output for Docker
  output: 'standalone',
  // Optimize for production
  compress: true,
  // Generate ETags for better caching
  generateEtags: true,
  // Enable HTTP caching
  httpAgentOptions: {
    keepAlive: true,
  },
};

export default nextConfig;
