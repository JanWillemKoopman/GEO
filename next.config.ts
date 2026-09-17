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
  // `Vary: x-apparaat` op de ene publieke pagina van de app (17 september
  // 2026, redesign2026.md §10.2 stap 5).
  //
  // ── WAAROM ALLEEN DEZE ROUTE ─────────────────────────────────────────────
  //
  // Elke ingelogde pagina is toch al dynamisch, want ze leest de
  // sessiecookie: daar bestaat geen gedeelde cache die een apparaat met een
  // ander apparaat kan verwarren. `app/markt/[slug]` is de enige route buiten
  // `(app)`, zonder inlog en dus zonder die cookie, en draagt al
  // `dynamic = "force-dynamic"`. Die vlag zet Next.js' eigen Data Cache en
  // Full Route Cache uit, maar zegt niets over een CDN of een browser
  // ertussenin: mocht die caching ooit weer aan gaan (een `revalidate`, een
  // andere hostingpartij), dan voorkomt deze header dat iemand op een
  // telefoon de dashboardversie uit de cache krijgt die eerst voor een
  // computer werd gerenderd, of andersom.
  //
  // De pagina gebruikt `isTelefoon()` op dit moment nog niet: hij staat in
  // groep A van `redesign2026.md` §8.12.2 en toont op beide apparaten
  // hetzelfde. Deze regel is dus voorwaarts geschreven, niet voor een
  // verschil dat er al is.
  async headers() {
    return [
      {
        source: "/markt/:slug*",
        headers: [{ key: "Vary", value: "x-apparaat" }],
      },
    ];
  },
};

export default nextConfig;
