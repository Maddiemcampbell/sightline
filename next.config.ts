import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/platform-admin",
        destination: "/internal/admin",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
