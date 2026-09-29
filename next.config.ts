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
  // De versie die in de browserbundel gebakken wordt bij het bouwen, voor
  // `components/deployment-banner.tsx` (docs/tasks/nova-vergelijking-verbeterpunten.md,
  // punt 25). Vercel zet `VERCEL_GIT_COMMIT_SHA` vanzelf bij elke deploy;
  // lokaal bestaat die niet, dus dan valt dit terug op het opstartmoment van
  // de dev-server. `app/api/version/route.ts` leest dezelfde variabele bij
  // elk verzoek opnieuw en geeft dus de ECHT lopende versie terug: verschilt
  // die van wat hier gebakken is, dan draait de browser een oudere build.
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now()),
  },
  experimental: {
    // Server Actions / routes mogen de externe crawler-fetch + OpenAI-calls draaien.
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // `lib/icons.ts` haalt veertig iconen uit een pakket dat er ruim 1.600
    // levert, allemaal achter één verzamelbestand. In de productiebuild wordt
    // de rest er toch uit geschud, maar tijdens `npm run dev` compileert Next
    // dat verzamelbestand bij elke wijziging opnieuw. Dit zet de import om naar
    // de losse bestanden, en dat scheelt bij het ontwikkelen seconden per
    // schermwissel.
    optimizePackageImports: ["lucide-react"],
  },
  async redirects() {
    return DOORVERWIJZINGEN;
  },
};

export default nextConfig;
