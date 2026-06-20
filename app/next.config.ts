import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Workaround: Avast intercepta SSL en desarrollo, Node.js no puede verificar
// certificados de Supabase. Solo aplica en dev — nunca en producción (Vercel).
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // En dev el SW se desactiva para no interferir con HMR; activo en prod.
  disable: process.env.NODE_ENV === "development",
  // Cachea rutas al navegar con next/link (mejora cobertura offline).
  cacheOnNavigation: true,
  reloadOnOnline: true,
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

export default withSerwist(nextConfig);
