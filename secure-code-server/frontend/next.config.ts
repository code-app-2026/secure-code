import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  output: 'standalone',
  async rewrites() {
    // Read the internal backend URL from the Docker environment
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`, // Proxy to Backend
      },
      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`, // Proxy WebSockets
      },
      {
        source: '/yjs',
        destination: `${backendUrl}/yjs`, // Proxy Yjs WebSockets
      }
    ];
  },
};

export default nextConfig;
