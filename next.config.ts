import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Produces a self-contained `.next/standalone` build with only the files
  // needed to run `node server.js` — no platform-specific runtime required.
  output: 'standalone'
};

export default nextConfig;
