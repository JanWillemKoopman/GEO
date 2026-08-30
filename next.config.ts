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
  /**
   * Vertelt niet langer bij elke response welke serversoftware eronder zit.
   * Kost niets, en scheelt een aanvaller de eerste stap van zijn verkenning.
   */
  poweredByHeader: false,
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
  /**
   * De beveiligingsheaders (antihack.md H3, stap Q2).
   *
   * ── WAAROM DEZE ZES, EN WAAROM HET BELEID HIER NIET STAAT ───────────────────
   *
   * Dit zijn de headers die niets kunnen breken: ze verbieden dingen die deze app
   * toch niet doet. Het contentbeveiligingsbeleid staat bewust NIET hier maar in
   * `lib/supabase/middleware.ts`, want dat kan wél iets breken en heeft een nonce
   * per verzoek nodig voor het themascript in `app/layout.tsx`.
   *
   * ── WAAROM DIT HIER ZWAARDER WEEGT DAN GEMIDDELD ────────────────────────────
   *
   * De sessiecookie van Supabase is niet `httpOnly`: de browserclient moet hem
   * kunnen lezen, dat hoort bij `@supabase/ssr`. Uitvoerbare JavaScript van een
   * aanvaller in de app is daarmee meteen een volledige sessieovername. Alles wat
   * de kans daarop verkleint telt hier dus dubbel.
   *
   * `X-Frame-Options: DENY` en niet `SAMEORIGIN`: bevestigd door de eigenaar op
   * 29 augustus 2026, schermen worden als link gedeeld en nooit ingesloten.
   * Zonder deze header kan iemand de app onzichtbaar over een eigen pagina leggen
   * en zo klikken op "goedkeuren" of "publiceren" ontfutselen.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          // De browser moet het opgegeven type geloven en niet zelf gaan raden.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Bij een klik naar buiten gaat alleen het domein mee, nooit het volledige
          // adres: dat bevat merk-id's en cluster-id's.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // ORBIT ENGINE heeft geen camera, microfoon, locatie of betaalfunctie nodig.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          // Twee jaar alleen via https, inclusief subdomeinen.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Sluit de oudere cross-domain-mechanismen (Flash, PDF-plugins) af.
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
};

export default nextConfig;
