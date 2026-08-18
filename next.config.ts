import type { NextConfig } from "next";
import { DOORVERWIJZINGEN } from "./lib/redirects";

/**
 * De configuratie is TypeScript sinds 17 augustus 2026, en dat is geen smaak:
 * de doorverwijzingenlijst bepaalt of dertien bestaande bladwijzers blijven
 * werken, dus hoort hij in een module die `scripts/test-unit.ts` kan
 * importeren en nalopen (conventie 2). Zie `lib/redirects.ts`.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server Actions / routes mogen de externe crawler-fetch + OpenAI-calls draaien.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async redirects() {
    return DOORVERWIJZINGEN;
  },
};

export default nextConfig;
