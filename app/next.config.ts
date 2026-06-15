import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa") as (config: object) => (nextConfig: NextConfig) => NextConfig;

// Workaround: Avast intercepta SSL en desarrollo, Node.js no puede verificar
// certificados de Supabase. Solo aplica en dev — nunca en producción (Vercel).
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

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
