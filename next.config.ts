import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Per-user, permission-checked app: pages render dynamically on every request.
  serverExternalPackages: ["pg", "pdfkit"],
  allowedDevOrigins: ["100.71.189.109"],
  poweredByHeader: false,
  // Separate output folder for local production builds so the dev server is not disturbed.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: false,
  experimental: {
    // Offer attachments: up to 5 files × 10 MB
    serverActions: { bodySizeLimit: "55mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
