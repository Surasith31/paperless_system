import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React Strict Mode for better debugging
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  // Production optimizations
  ...(process.env.NODE_ENV === "production" && {
    compiler: {
      // Remove console.log in production
      removeConsole: {
        exclude: ["error", "warn"],
      },
    },
  }),

  // PoweredBy header
  poweredByHeader: false,

  // ✅ ปิด standalone - ใช้ build ปกติ
  // output: "standalone",

  // Disable source maps in production for security
  productionBrowserSourceMaps: false,

  // ✅ Allowed Dev Origins for cross-device dev
  allowedDevOrigins: ["192.168.0.100"],
};

export default nextConfig;
