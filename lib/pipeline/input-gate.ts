import "server-only";

/**
 * De inputpoort toepassen op één pagina: de cijfers ophalen en het oordeel geven.
 * (docs/tasks/vragen-voor-het-schrijven.md §4)
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * Twee lezers moeten exact hetzelfde oordeel zien: de schrijfroute, die het als
 * garantie gebruikt, en het briefingscherm, dat het als melding toont. Zouden ze
 * het los uitrekenen, dan staat er "deze pagina kan geschreven worden" op het
 * scherm terwijl de route hem weigert, en dat is precies de tegenspraak die
 * `lib/open-questions.ts` voor de vragenteller oploste.
 *
 * De BESLISSING zelf staat in `lib/content-input-gate.ts` en is puur en
 * testbaar (conventie 2). Hier staat alleen het ophalen: het contract van de
 * pagina, de feitenkaart zoals hij NU is, en de keuze die de klant maakte.
 *
 * ── WAAROM DE GRAAD OPNIEUW GEMETEN WORDT ───────────────────────────────────
 *
 * `content_pieces.input_coverage` is gezet tijdens de briefing, dus vóórdat de
 * klant ook maar één vraag beantwoordde. Precies de fout die verbetering 2 van
 * de contentronde van 1 september ophief op een andere plek: een bevroren getal
 * gebruiken alsof het de huidige stand is. De kaart wordt hier opnieuw
 * opgebouwd, mét de antwoorden, en het cijfer op de pagina meteen bijgewerkt.
 * Geen AI-aanroep, alleen databasewerk.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFactBase } from "@/lib/pipeline/factbase";
import { berekenInputCoverage } from "@/lib/pipeline/input-coverage";
import { berekenGewogenDekking, poortGraad } from "@/lib/pipeline/evidence-weight";
import { inputpoort, type InputOordeel, type WriteMode } from "@/lib/content-input-gate";
import { recommendationFromSnapshot } from "@/lib/pipeline/briefing";
import type { ContentContract } from "@/lib/schemas/content-contract";

export interface PaginaOordeel extends InputOordeel {
  pieceId: string;
  title: string;
  /** De koppen van de secties die nog op een antwoord wachten. */
  ongedekteKoppen: string[];
}

/** De velden die deze poort van een contentpagina nodig heeft. */
export interface PieceVoorPoort {
  id: string;
  title: string;
  contract_json: unknown;
  write_mode: string | null;
  briefing_snapshot_json: unknown;
  target_intent?: string | null;
}

/**
 * Mag deze pagina geschreven worden, en wat leest de klant?
 *
 * `bewaar` staat standaard aan: het cijfer dat de poort woog hoort ook op de
 * pagina te staan, anders toont het scherm een ander getal dan de route
 * gebruikte. Zet hem uit bij een puur lezende aanroep waar een schrijfactie niet
 * hoort (een rapportageweergave).
 */
export async function beoordeelPagina(
  admin: SupabaseClient,
  args: { analysisId: string; profileId: string; piece: PieceVoorPoort; bewaar?: boolean },
): Promise<PaginaOordeel> {
  const { analysisId, profileId, piece, bewaar = true } = args;

  const contract = (piece.contract_json ?? null) as ContentContract | null;

  // De doelvragen sturen welke gecrawlde pagina's op de kaart komen (S1). Ze
  // staan in de bevroren aanbeveling; ontbreekt die, dan valt de kaart terug op
  // de brede selectie, en dat is minder scherp maar niet stuk.
  const bevroren = recommendationFromSnapshot(piece.briefing_snapshot_json);
  const doelvragen = (bevroren?.targets ?? []).map((t) => t.text).filter(Boolean);

  const facts = await buildFactBase(admin, profileId, analysisId, doelvragen, [piece.id]);

  // ── De GEWOGEN dekking bepaalt het oordeel (migratie 0091) ───────────────
  //
  // `berekenInputCoverage()` telt elke merkgebonden sectie even zwaar. Negen
  // randsecties onderbouwd en de ene sectie over de prijs niet, levert 90
  // procent op, en 90 gaat vlot door de poort van 70. Gemeten op de zeven
  // pagina's van 1 en 2 september 2026 gebeurde dat ook: alle zeven haalden 86
  // tot 98 procent contractdekking terwijl hun bronherleidbaarheid tussen de 28
  // en 39 procent lag.
  //
  // `poortGraad()` weegt nu wat er ontbreekt: staat de kern niet volledig, dan
  // telt de kritieke dekking; anders de gewogen. De standen zelf (70, 40, de
  // drie uitwegen) blijven precies zoals ze waren, en `input_coverage` blijft de
  // ONGEWOGEN graad, zodat die reeks vergelijkbaar blijft.
  const gewogen = berekenGewogenDekking(contract, facts);
  const dekking = berekenInputCoverage(contract, facts);

  if (bewaar) {
    await admin
      .from("content_pieces")
      .update({
        input_coverage: dekking.graad,
        weighted_evidence_coverage: gewogen.gewogen,
        critical_evidence_coverage: gewogen.kritiek,
      })
      .eq("id", piece.id);
  }

  // De koppen die de melding noemt komen uit de GEWOGEN lijst: die staat op
  // belang gesorteerd, dus de klant leest eerst de sectie die het meeste kost.
  const ongedekteKoppen = gewogen.ongedekt.map((s) => s.heading).filter(Boolean);
  const oordeel = inputpoort({
    graad: poortGraad(gewogen),
    ongedekteSecties: gewogen.ongedekt.length,
    ongedekteKoppen,
    kritiekeSectiesZonderBewijs: gewogen.ongedekteKern.length,
    writeMode: (piece.write_mode === "algemeen" ? "algemeen" : null) as WriteMode,
  });

  return { ...oordeel, pieceId: piece.id, title: piece.title, ongedekteKoppen };
}

/** De velden die `beoordeelPagina` uit `content_pieces` nodig heeft. */
export const POORT_VELDEN =
  "id, title, contract_json, write_mode, briefing_snapshot_json, target_intent";
