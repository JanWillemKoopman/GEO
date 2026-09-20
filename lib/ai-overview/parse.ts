/**
 * De respons van DataForSEO uitpakken tot een meetbaar antwoord.
 *
 * ── WAAROM DIT APART STAAT VAN DE AANROEP ───────────────────────────────────
 *
 * Conventie 2. Dit is de plek waar "geen AI Overview" en "wél een AI Overview"
 * uit elkaar gehouden worden, en dat onderscheid bepaalt of een vraag die ronde
 * meetelt in de noemer. Een fout hier verlaagt stilletjes de score van een merk
 * doordat Google toevallig geen overzicht toonde. Dat hoort regel voor regel
 * testbaar te zijn vanuit een kaal script, zonder netwerk.
 *
 * ── DE VORM VAN DE RESPONS (nagemeten op 20 september 2026) ─────────────────
 *
 * `tasks[0].result[0].items[]` bevat de blokken van de resultatenpagina. Het
 * blok met `type: "ai_overview"` is het overzicht. Dat blok heeft:
 *   • `markdown`, de tekst met bronverwijzingen erin
 *   • `items[]`, dezelfde tekst in stukken, als `markdown` ontbreekt
 *   • `references[]`, met per bron een `domain`
 *
 * ⚠️ Zo'n blok kan LEEG terugkomen: `asynchronous_ai_overview: true` met geen
 * tekst en geen bronnen. Dat kwam in de meting van 20 september 4 keer voor op
 * 180 aanroepen. Een leeg overzicht is geen overzicht, en dus een niet-meting.
 */
import type { AiOverviewResultaat } from "@/lib/ai-overview/types";

/** DataForSEO's statuscode voor "alles goed". Alle andere zijn een mislukking. */
export const DFS_OK = 20000;

interface DfsReference {
  domain?: unknown;
}

interface DfsAiOverviewBlok {
  type?: unknown;
  markdown?: unknown;
  items?: { text?: unknown }[] | null;
  references?: DfsReference[] | null;
}

interface DfsResult {
  items?: DfsAiOverviewBlok[] | null;
}

interface DfsTask {
  status_code?: unknown;
  status_message?: unknown;
  cost?: unknown;
  result?: DfsResult[] | null;
}

export interface DfsResponse {
  tasks?: DfsTask[] | null;
}

/** Een domein zonder `www.`, zodat `udenhout.nl` en `www.udenhout.nl` hetzelfde zijn. */
function schoonDomein(waarde: unknown): string | null {
  if (typeof waarde !== "string") return null;
  const d = waarde.trim().toLowerCase().replace(/^www\./, "");
  return d.length > 0 ? d : null;
}

/**
 * Pak één respons uit. Gooit nooit: elke onverwachte vorm wordt een
 * `mislukt`-resultaat, want een uitzondering hier zou een hele meetronde
 * kunnen afbreken op één rare respons.
 */
export function leesAiOverview(body: unknown): AiOverviewResultaat {
  const leeg = { tekst: "", bronnen: [] as string[] };

  const response = (body ?? {}) as DfsResponse;
  const taak = response.tasks?.[0];
  if (!taak) {
    return { status: "mislukt", ...leeg, kostenUsd: 0, melding: "geen taak in de respons" };
  }

  // ⚠️ De kosten worden ALTIJD overgenomen, ook bij een mislukking. Een
  // `40101 Internal SE Server Error` kost $0,002, en dat is op 20 september
  // 2026 nagemeten op de bewaarde responsen. Die post weglaten maakt elke
  // kostenraming van deze bron structureel te laag.
  const kostenUsd = typeof taak.cost === "number" ? taak.cost : 0;

  if (taak.status_code !== DFS_OK) {
    const melding =
      typeof taak.status_message === "string" ? taak.status_message : `status ${String(taak.status_code)}`;
    return { status: "mislukt", ...leeg, kostenUsd, melding };
  }

  const blok = (taak.result?.[0]?.items ?? []).find((i) => i?.type === "ai_overview");
  if (!blok) {
    return { status: "geen_overview", ...leeg, kostenUsd, melding: null };
  }

  const uitMarkdown = typeof blok.markdown === "string" ? blok.markdown : "";
  const uitItems = (blok.items ?? [])
    .map((i) => (typeof i?.text === "string" ? i.text : ""))
    .filter(Boolean)
    .join("\n\n");
  const tekst = (uitMarkdown.trim().length > 0 ? uitMarkdown : uitItems).trim();

  const bronnen = [
    ...new Set(
      (blok.references ?? []).map((r) => schoonDomein(r?.domain)).filter((d): d is string => d !== null),
    ),
  ];

  // Een blok zonder tekst én zonder bronnen is een leeg overzicht. Dat telt als
  // niet gemeten, niet als "niemand genoemd".
  if (tekst.length === 0 && bronnen.length === 0) {
    return { status: "geen_overview", ...leeg, kostenUsd, melding: "leeg overzicht teruggekomen" };
  }

  return { status: "gemeten", tekst, bronnen, kostenUsd, melding: null };
}
