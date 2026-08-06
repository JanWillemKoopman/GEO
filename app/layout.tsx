import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Geist Sans en Geist Mono, het paar dat de NOVA-workspace zelf gebruikt.
// Mono was JetBrains Mono: twee families van twee makers naast elkaar is precies
// het soort verschil dat je niet ziet maar wel voelt. Zie designsystem.md §3.

export const metadata: Metadata = {
  title: "Aura · AI-zichtbaarheid, gemeten",
  description:
    "Aura meet hoe vaak AI-assistenten jouw merk noemen, laat zien waar je mist en schrijft de pagina's die dat verhelpen.",
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" data-theme="light" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
