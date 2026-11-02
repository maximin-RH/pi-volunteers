import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  // Default is 1 MB, too small for logos, event photos and Child Safe PDFs.
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
  // pi-volunteer.com (singular) catches typos. Send it, keeping the path, to the real site.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(www\\.)?pi-volunteer\\.com" }],
        destination: "https://www.pi-volunteers.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
