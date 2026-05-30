import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "CommissionPro", template: "%s | CommissionPro" },
  description: "Plataforma de Comisionamiento Industrial — PTAR, PTAP, Sistemas Eléctricos y Automatización",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CommissionPro" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // evitar zoom accidental en campo
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
