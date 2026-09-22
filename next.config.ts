import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Model data lives under a versioned path, so it can be cached forever.
  // A new data generation goes to /models/v2 instead of overwriting v1.
  async headers() {
    return [
      {
        source: "/models/v1/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
