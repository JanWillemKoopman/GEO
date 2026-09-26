/**
 * BLOK A: wat we zeker weten over het bedrijf
 * (`docs/tasks/contentketen-opnieuw.md` §5 en §6.4).
 *
 * Code, geen AI. Welke feiten mee gaan naar de schrijver, en in welke vorm.
 *
 * ── WELKE FEITEN ────────────────────────────────────────────────────────────
 *
 * Alleen feiten die kloppen en bij deze pagina horen:
 *   - niet betwist en niet vervangen (een betwist feit gaat niet naar de
 *     schrijver tot de adviseur beslist, §4);
 *   - niet uitgesloten (`allowed = false`);
 *   - voor het hele merk (`geldt_voor` leeg), of voor iets wat in de titel, het
 *     onderwerp of de zoekintentie van deze pagina voorkomt. Een prijs voor
 *     ketelonderhoud hoort niet op een pagina over zonnepanelen.
 * Sterk bewijs eerst, en hooguit 150: bij grote merken wordt de invoer anders
 * duur en afleidend (§11 risico 10).
 *
 * Puur en zonder `server-only` (conventie 2).
 */

export const MAX_FEITEN = 150;

export interface FeitRij {
  id: string;
  text: string;
  stand: string | null;
  superseded_by: string | null;
  allowed: boolean | null;
  geldt_voor: string | null;
  bewijskracht: string | null;
}

export interface PaginaContext {
  titel: string;
  onderwerp: string | null;
  zoekintentie: string | null;
}

function woorden(tekst: string): string[] {
  return tekst
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
}

/** Hoort een feit met deze `geldt_voor` bij deze pagina? */
export function hoortBijPagina(geldtVoor: string | null, pagina: PaginaContext): boolean {
  if (!geldtVoor || !geldtVoor.trim()) return true;
  const context = new Set(woorden([pagina.titel, pagina.onderwerp ?? "", pagina.zoekintentie ?? ""].join(" ")));
  return woorden(geldtVoor).some((w) => context.has(w));
}

const KRACHT: Record<string, number> = { sterk: 0, gewoon: 1, geen: 2 };

export function kiesFeiten(feiten: FeitRij[], pagina: PaginaContext): FeitRij[] {
  return feiten
    .filter((f) => f.text?.trim())
    .filter((f) => f.stand !== "betwist" && f.stand !== "vervangen" && !f.superseded_by)
    .filter((f) => f.allowed !== false)
    .filter((f) => hoortBijPagina(f.geldt_voor, pagina))
    .sort((a, b) => (KRACHT[a.bewijskracht ?? "gewoon"] ?? 1) - (KRACHT[b.bewijskracht ?? "gewoon"] ?? 1))
    .slice(0, MAX_FEITEN);
}

/** Een beantwoorde vraag aan de ondernemer, zoals hij in `fact_requests` staat. */
export interface AntwoordRij {
  question: string;
  answer: string | null;
  scope: string | null;
  analysis_id: string | null;
  content_piece_ids: string[] | null;
  open_vraag: boolean | null;
}

/**
 * Welke eerder beantwoorde vragen in blok A horen (besluit B17, 26 september 2026).
 *
 *   - Een vraag voor het hele merk (`scope = 'merk'`): altijd.
 *   - Een vraag uit het rapport van DIT cluster (`scope = 'analyse'`): ook. Tot
 *     26 september 2026 bereikte zo'n antwoord de schrijver alleen als een brief
 *     de vraag toevallig aan de pagina koppelde; anders ging het alleen naar
 *     `proof_points`, dat de nieuwe keten niet leest. En de brief zag de vraag
 *     wel als "beantwoord" en stelde hem daarom niet opnieuw: de ondernemer
 *     antwoordde voor niets.
 *   - Niet de open vraag, en niet een rapportvraag die al aan deze pagina hangt:
 *     die staan in blok B (`klantinput()` in `schrijven.ts`, dat alles behalve
 *     `scope = 'merk'` neemt), en twee keer hetzelfde antwoord in de invoer maakt
 *     het niet beter. Een merkvraag die aan deze pagina hangt, staat juist
 *     alleen hier.
 */
export function antwoordenVoorBlokA(
  rijen: readonly AntwoordRij[],
  pagina: { analysisId: string; pieceId: string },
): { vraag: string; antwoord: string }[] {
  return rijen
    .filter((r) => r.answer?.trim() && !r.open_vraag)
    .filter(
      (r) =>
        r.scope === "merk" ||
        (r.scope === "analyse" && r.analysis_id === pagina.analysisId && !(r.content_piece_ids ?? []).includes(pagina.pieceId)),
    )
    .map((r) => ({ vraag: r.question, antwoord: (r.answer as string).trim() }));
}

export interface BedrijfsInvoer {
  bedrijfsnaam: string;
  feiten: FeitRij[];
  /** Waardeproposities, al geschoond (`schoneWaardeproposities`). */
  waardeproposities: string[];
  verhalen: string | null;
  bezwaren: string[];
  /** Antwoorden op eerder gestelde vragen: voor het hele merk, en uit het rapport van dit cluster. */
  merkAntwoorden: { vraag: string; antwoord: string }[];
  /** Wat het anders doet dan anderen (`profiles.differentiator`). */
  onderscheid?: string | null;
  /** Bewijs dat nergens op de site staat (`profiles.offline_proof`). */
  offlineBewijs?: string[];
}

/** Blok A als tekst voor de schrijver. Lege onderdelen vallen weg. */
export function blokA(invoer: BedrijfsInvoer): string {
  const delen: string[] = [`Bedrijf: ${invoer.bedrijfsnaam}`];
  if (invoer.feiten.length > 0) {
    delen.push("Wat we zeker weten:\n" + invoer.feiten.map((f) => `- ${f.text.trim()}`).join("\n"));
  }
  if (invoer.waardeproposities.length > 0) {
    delen.push("Waar het bedrijf voor staat:\n" + invoer.waardeproposities.map((w) => `- ${w}`).join("\n"));
  }
  if (invoer.onderscheid?.trim()) delen.push(`Wat het bedrijf anders doet dan anderen: ${invoer.onderscheid.trim()}`);
  if ((invoer.offlineBewijs ?? []).length > 0) {
    delen.push("Bewijs dat niet op de site staat:\n" + (invoer.offlineBewijs ?? []).map((b) => `- ${b}`).join("\n"));
  }
  if (invoer.verhalen?.trim()) delen.push(`Verhalen van de ondernemer:\n${invoer.verhalen.trim()}`);
  if (invoer.bezwaren.length > 0) {
    delen.push("Bezwaren die klanten noemen, met het antwoord van de ondernemer:\n" + invoer.bezwaren.map((b) => `- ${b}`).join("\n"));
  }
  if (invoer.merkAntwoorden.length > 0) {
    delen.push(
      "Eerder beantwoorde vragen:\n" + invoer.merkAntwoorden.map((a) => `- ${a.vraag}\n  ${a.antwoord}`).join("\n"),
    );
  }
  return delen.join("\n\n");
}
