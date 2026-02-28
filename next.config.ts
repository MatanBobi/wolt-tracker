import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imageproxy.wolt.com",
      },
    ],
  },
};

export default nextConfig;
