/**
 * In welke fase van de klantreis hoort een geplande pagina?
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * `planned_pages.funnel_stage_id` (migratie 0049) werd sinds 25 augustus 2026
 * nergens meer gevuld: de jaarverdeling die een fase per pagina koos verdween,
 * en niets nam het over. Op 21 september 2026 stond hij bij Van den Udenhout op
 * 0 van de 18 pagina's (`docs/logbook.md`, 22 september 2026). Gevolg: de
 * fasekolom in de export was altijd leeg, de fasechip op het contentplan
 * verscheen nooit, en een pagina zonder eigen doelgroep ging naar de schrijver
 * met "iemand die zich in de fase de klantreis bevindt" (`planBriefing()`).
 *
 * ── HOE ─────────────────────────────────────────────────────────────────────
 *
 * Elke pagina uit een aanbeveling hoort bij doelvragen, en elke doelvraag
 * heeft al een fase (`prompts.category`: Oriëntatie, Overweging, Beslissing).
 * De pagina krijgt de fase met het grootste gewicht onder zijn doelvragen. Er
 * wordt dus niets bedacht: de fase komt uit de meting die de pagina
 * rechtvaardigt.
 *
 * Twee indelingen, want de fasen van een merk (`profile_funnel_stages`) zijn
 * er vier (Oriëntatie, Vergelijken, Kiezen, Klant blijven, `DEFAULT_FUNNELS`)
 * en die van een vraag drie. Eerst op gelijke naam, daarna via de vaste
 * vertaling hieronder. "Klant blijven" heeft geen vraag die erbij hoort: een
 * AI-zoekvraag komt van iemand die nog geen klant is.
 *
 * Onbekend is beter dan fout (conventie 3): geen doelvragen, geen fase bij de
 * vragen, of twee fasen met precies hetzelfde gewicht geeft `null`. Een gok
 * zou de schrijver een doelgroep meegeven die de meting niet draagt.
 *
 * Bewust ZONDER `server-only`, testbaar vanuit `scripts/test-unit.ts`.
 */

/** Vraagfase naar de standaardfase van een merk (`DEFAULT_FUNNELS`). */
const VRAAGFASE_NAAR_MERKFASE: Record<string, string> = {
  "oriëntatie": "oriëntatie",
  overweging: "vergelijken",
  beslissing: "kiezen",
};

export interface FaseVraag {
  /** `prompts.category`; leeg of onbekend telt niet mee. */
  category: string | null;
  /** Het gewicht van de doelvraag; zonder gewicht telt hij als 1. */
  weight: number | null;
}

export interface MerkFase {
  id: string;
  label: string;
}

function sleutel(tekst: string): string {
  return tekst.trim().toLowerCase();
}

export function faseVoorPagina(vragen: FaseVraag[], fasen: MerkFase[]): string | null {
  if (vragen.length === 0 || fasen.length === 0) return null;

  const gewichtPerFase = new Map<string, number>();
  for (const v of vragen) {
    if (!v.category || !v.category.trim()) continue;
    const gewicht = typeof v.weight === "number" && v.weight > 0 ? v.weight : 1;
    const k = sleutel(v.category);
    gewichtPerFase.set(k, (gewichtPerFase.get(k) ?? 0) + gewicht);
  }
  if (gewichtPerFase.size === 0) return null;

  const gesorteerd = [...gewichtPerFase.entries()].sort((a, b) => b[1] - a[1]);
  // Gelijkspel aan de top: geen winnaar, dus geen fase.
  if (gesorteerd.length > 1 && gesorteerd[0][1] === gesorteerd[1][1]) return null;
  const vraagfase = gesorteerd[0][0];

  const opNaam = new Map(fasen.map((f) => [sleutel(f.label), f.id]));
  return opNaam.get(vraagfase) ?? opNaam.get(VRAAGFASE_NAAR_MERKFASE[vraagfase] ?? "") ?? null;
}
