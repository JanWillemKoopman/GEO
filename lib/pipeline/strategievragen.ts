/**
 * Van de paginastrategie naar vragen aan de ondernemer (de vragenroute sluiten,
 * werkstand contentpijplijn §4 punt 1, 25 september 2026).
 *
 * ── WAT ER MISGING ──────────────────────────────────────────────────────────
 *
 * De strategie (L5) en de FAQ-selectie (L6) beslissen per pagina wat de
 * ondernemer eerst moet vertellen: een kernvraag zonder bedrijfsfeit, een
 * onzekerheid met bestemming A, een FAQ-vraag zonder onderbouwing. Die vragen
 * werden bewaard in `strategy_json.vragenAanOndernemer` en kwamen nergens aan.
 * Bij Best van de hovenier waren het er acht ("Kan de aanleg in fases?", "Wat
 * gebeurt er bij een slechte bodem?"), precies de antwoorden die de blinde
 * lezer miste. Zonder deze route blijft elke pagina begrensd door wat bij de
 * eerste ronde toevallig bekend was, hoe goed de rest van de keten ook wordt.
 *
 * ── HOE ─────────────────────────────────────────────────────────────────────
 *
 * Deze module kiest de vragen en zet ze in de vorm van de briefing
 * (`BriefingQuestion`). De taak geeft ze daarna aan dezelfde ontdubbeling en
 * dezelfde opslag als de briefing (`beoordeelVragen`, `voegVragenSamen`,
 * `bewaarVragen`): een vraag die de ondernemer al beantwoordde of oversloeg,
 * komt niet terug, en een open vraag die hetzelfde vraagt krijgt de pagina
 * erbij. Het antwoord komt via de feitenkaart (`buildFactBase`) vanzelf in de
 * volgende versie.
 *
 * Hoogstens vier per pagina, kernvragen eerst: een ondernemer die per pagina
 * acht vragen krijgt, beantwoordt er geen. De rest staat nog in de strategie
 * en komt bij een volgende versie opnieuw in aanmerking.
 *
 * Puur (conventie 2).
 */
import type { PageStrategy } from "@/lib/schemas/page-strategy";
import type { BriefingQuestion } from "@/lib/pipeline/briefing-select";
import { claimKey } from "@/lib/pipeline/factcard";

export const MAX_STRATEGIEVRAGEN = 4;

/**
 * De vraag die `controleerStrategie` zelf invult als het model er geen gaf.
 * Die is voor ons, niet voor de ondernemer: "Wat kunnen we over X zeggen?" is
 * geen vraag die een ondernemer kan beantwoorden.
 */
const EIGEN_INVULVRAAG = /^Wat kunnen we over ".*" zeggen\?$/;

/**
 * Is dit een vraag die een ondernemer kan beantwoorden? Nameting op productie
 * (25 september 2026): het model vulde bij een onderwerp zonder vraag letterlijk
 * "Geen vraag nodig." in, en die stond daarna bij de ondernemer. Een vraag
 * eindigt op een vraagteken en is geen opmerking over dat er niets te vragen is.
 */
export function isEchteVraag(tekst: string): boolean {
  const t = tekst.trim();
  return t.length >= 8 && t.endsWith("?") && !/^(geen|n\.?v\.?t|niet van toepassing|nvt)\b/i.test(t) && !EIGEN_INVULVRAAG.test(t);
}

/** Volgorde van waarde: waar de pagina het meest op wacht, eerst. */
const PRIORITEIT = {
  kernVraag: 1,
  kernUitleg: 2,
  onzekerheid: 3,
  bijzaak: 4,
  faq: 5,
} as const;

export function strategievragen(args: {
  strategie: PageStrategy;
  /** De FAQ-vragen zonder onderbouwing (L6): criterium 3, een vraag aan de ondernemer. */
  faqVragen?: readonly string[];
  pieceId: string | null;
}): BriefingQuestion[] {
  const kandidaten: { vraag: string; reden: string; prioriteit: number; kern: boolean }[] = [];
  for (const o of args.strategie.onderwerpen) {
    const vraag = o.vraag?.trim();
    if (!vraag || o.besluit === "weglaten") continue;
    const prioriteit =
      o.besluit === "eerst vragen"
        ? o.kern
          ? PRIORITEIT.kernVraag
          : PRIORITEIT.bijzaak
        : o.kern
          ? PRIORITEIT.kernUitleg
          : PRIORITEIT.bijzaak;
    kandidaten.push({ vraag, reden: o.onderwerp, prioriteit, kern: o.kern });
  }
  for (const o of args.strategie.onzekerheden) {
    if (o.bestemming !== "A") continue;
    kandidaten.push({ vraag: (o.vraag?.trim() || o.punt).trim(), reden: o.punt, prioriteit: PRIORITEIT.onzekerheid, kern: false });
  }
  for (const vraag of args.faqVragen ?? []) {
    if (vraag.trim()) kandidaten.push({ vraag: vraag.trim(), reden: vraag.trim(), prioriteit: PRIORITEIT.faq, kern: false });
  }

  const gezien = new Set<string>();
  return kandidaten
    .filter((k) => isEchteVraag(k.vraag))
    .sort((a, b) => a.prioriteit - b.prioriteit)
    .filter((k) => {
      const sleutel = claimKey(k.vraag);
      if (!sleutel || gezien.has(sleutel)) return false;
      gezien.add(sleutel);
      return true;
    })
    .slice(0, MAX_STRATEGIEVRAGEN)
    .map((k) => ({
      claimKey: `strategie:${claimKey(k.vraag)}`,
      question: k.vraag,
      reason: `Met je antwoord wordt de pagina concreter over: ${k.reden.replace(/[?.!]+$/, "")}.`,
      kind: "aanvulling",
      answerType: "tekst_kort",
      options: [],
      suggestedAnswer: null,
      // Niet verplicht: de pagina is zonder dit antwoord al geschreven, en
      // wordt er bij een volgende versie beter van. Overslaan mag.
      required: false,
      // Een antwoord over het bedrijf geldt voor elke pagina van dit merk.
      scope: "merk",
      contentPieceIds: args.pieceId ? [args.pieceId] : [],
      sectionRefs: [],
      priority: k.prioriteit,
    }));
}
