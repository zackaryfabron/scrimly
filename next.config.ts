import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.valorant-api.com" },
      { protocol: "https", hostname: "api.henrikdev.xyz" },
    ],
  },
};

export default nextConfig;
