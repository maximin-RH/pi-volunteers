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
  // Security headers on every response. See docs/PRIVACY-AND-SECURITY.md.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HTTPS only for 2 years (browsers ignore this on http://localhost).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // Nobody can put the site in a frame (stops click-jacking), forms only post back here.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Other sites only see the domain, never a page address (which may hold a private calendar link).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
