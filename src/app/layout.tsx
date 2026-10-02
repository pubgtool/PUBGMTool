import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { PROTOCOL } from "@/config/protocol";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: PROTOCOL.name, template: `%s · ${PROTOCOL.name}` },
  description: PROTOCOL.tagline,
  appleWebApp: { capable: true, statusBarStyle: "default", title: PROTOCOL.shortName },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F6FA",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} bg-canvas`}>
      <body className="min-h-dvh bg-canvas font-sans text-fg">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
