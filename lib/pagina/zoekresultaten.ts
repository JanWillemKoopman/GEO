import "server-only";

/**
 * DE ZOEKRESULTATEN VAN GOOGLE OPHALEN, vóór de ene aanroep van de brief
 * (besluit B34 in `docs/tasks/contentketen-opnieuw.md` §2). De regels staan in
 * `zoekresultaten-regels.ts`; dit bestand doet alleen het ophalen en het
 * kostenlog.
 *
 * Alleen voor een soort met `onderzoek: "web_en_zoekresultaten"` (`soorten.ts`)
 * en alleen met `BRIEF_ZOEKRESULTATEN_ENABLED=true`. Anders `null`, en draait de
 * brief precies zoals vóór 29 september 2026.
 *
 * Gooit nooit. Een mislukte zoekopdracht staat als `mislukt` in de uitkomst, en
 * lukt geen enkele, dan gaat de brief door met zijn eigen zoektocht op het web:
 * minder onderzoek is minder goed, niet kapot (zelfde regel als bij een
 * mislukte brief, §6.1).
 *
 * ⚠️ Geen hergebruik bij een herhaalde brief: mislukt de brief na het ophalen,
 * dan haalt de volgende poging opnieuw op (ongeveer $0,03). De brief zelf is de
 * dure stap en bewaart zijn uitkomst wel (conventie 9); een eigen cache voor
 * dertig cent per honderd pagina's is meer code dan hij waard is.
 */
import { haalZoekresultatenpagina } from "@/lib/ai-overview/client";
import { leesZoekresultaten } from "@/lib/ai-overview/parse-serp";
import { zoekresultatenCredentials } from "@/lib/ai-overview/registry";
import { logAiCall } from "@/lib/openai/ledger";
import { soortVan } from "@/lib/pagina/soorten";
import {
  schoonResultaten,
  zoekopdrachtenVoor,
  type BriefZoekresultaten,
  type MerkVoorZoeken,
  type ZoekVoorPagina,
  type Zoekopdrachtuitkomst,
} from "@/lib/pagina/zoekresultaten-regels";

/** De engine-naam in `ai_calls`, zodat het dagplafond deze kosten meetelt. */
export const ZOEKRESULTATEN_ENGINE = "dataforseo_serp";

export interface ZoekContext extends ZoekVoorPagina {
  type: string;
  profileId: string;
  analysisId: string;
  pieceId: string;
}

export async function haalZoekresultatenVoorBrief(
  c: ZoekContext,
  merk: MerkVoorZoeken,
): Promise<BriefZoekresultaten | null> {
  if (soortVan(c.type).onderzoek !== "web_en_zoekresultaten") return null;
  const creds = zoekresultatenCredentials();
  if (!creds) return null;

  const zoekopdrachten = zoekopdrachtenVoor(c);
  if (zoekopdrachten.length === 0) return null;

  let kostenUsd = 0;
  const uitkomsten: Zoekopdrachtuitkomst[] = await Promise.all(
    zoekopdrachten.map(async (zoekopdracht) => {
      const start = Date.now();
      const ruw = await haalZoekresultatenpagina(zoekopdracht, creds);
      kostenUsd += ruw.kostenUsd;
      const pagina = ruw.status === "gelukt" ? schoonResultaten(leesZoekresultaten(ruw.json), merk) : null;
      await logAiCall(
        { kind: "pagina_zoekresultaten", profileId: c.profileId, analysisId: c.analysisId, engine: ZOEKRESULTATEN_ENGINE, contentPieceId: c.pieceId },
        {
          model: "dataforseo/serp-google-organic",
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          webSearch: true,
          costUsd: ruw.kostenUsd,
          responseId: null,
          // De geschoonde uitkomst en niet de hele respons: die loopt per
          // zoekopdracht in de tientallen kilobytes, en wat je wilt kunnen
          // nalezen is wat de brief te zien kreeg (conventie 8).
          raw: { status: ruw.status, melding: ruw.melding, pagina },
          input: { user: zoekopdracht, webSearch: true },
          durationMs: Date.now() - start,
        },
      );
      return { zoekopdracht, status: ruw.status, pagina, melding: ruw.melding };
    }),
  );

  return {
    opgehaaldOp: new Date().toISOString(),
    kostenUsd: Math.round(kostenUsd * 1e6) / 1e6,
    zoekopdrachten: uitkomsten,
  };
}
