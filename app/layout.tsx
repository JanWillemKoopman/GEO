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
  title: "GEO Tracker",
  description:
    "Simpele GEO-tracking: zie hoe zichtbaar jouw merk is in ChatGPT en andere AI-assistenten.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" data-theme="dark" className={`${GeistSans.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
