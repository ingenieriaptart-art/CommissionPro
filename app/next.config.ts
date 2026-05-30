import type { NextConfig } from "next";
// @ts-expect-error next-pwa no tiene tipos perfectos para TS config
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.ENABLE_PWA !== "true",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-api",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: /\.(?:js|css|woff2)$/,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-resources" },
    },
  ],
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
};

export default pwaConfig(nextConfig);
