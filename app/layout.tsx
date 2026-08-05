import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Aeonik-vervanger (geometrische grotesk) + TT-Commons-vervanger (technische mono),
// conform designsystem.md §A2/§C-aanbeveling (open-source substituten).
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aura — AI-zichtbaarheid, gemeten",
  description:
    "Aura meet hoe vaak AI-assistenten jouw merk noemen, laat zien waar je mist en schrijft de pagina's die dat verhelpen.",
};

export const viewport: Viewport = {
  themeColor: "#f7f8f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" data-theme="light" className={`${GeistSans.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
