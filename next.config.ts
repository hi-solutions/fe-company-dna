import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://ai.hi-solutions.co/api/:path*",
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
