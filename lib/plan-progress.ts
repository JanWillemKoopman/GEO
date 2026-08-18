/**
 * Twee blokken op Overzicht: hoe ver het plan is per funnelfase, en hoe het
 * verdeeld is over de paginatypes.
 *
 * ── WAAROM DIT EEN PURE MODULE IS ───────────────────────────────────────────
 *
 * Allebei zijn het tellingen die de klant als voortgang leest, en een fout erin
 * is niet zichtbaar op het scherm. "3 van de 8 geplaatst" terwijl het er 3 van
 * de 11 zijn, ziet er precies hetzelfde uit. Conventie 2.
 *
 * ── ⚠️ RESERVEPAGINA'S TELLEN NIET MEE ──────────────────────────────────────
 *
 * `planned_pages.is_buffer` markeert pagina's die klaarstaan om in te schuiven
 * als er eentje sneuvelt. Ze horen niet bij het maandtotaal dat de klant
 * afneemt (migratie 0049), dus ook niet bij de noemer van zijn voortgang. Zonder
 * dat filter staat een plan van 12 maanden op "24 van de 30" terwijl er 24
 * pagina's besteld zijn.
 *
 * ── ⚠️ ÉÉN AS VOOR "SOORT PAGINA", EN DIT IS DEZELFDE ALS BIJ ANALYTICS ─────
 *
 * De contentmix telt op `planned_pages.page_type` (informatief, categorie,
 * dienst) en niet op `content_pieces.type` (landing, article, faq). Dat is
 * dezelfde as als "klikken per paginatype" op het Zoekverkeer-scherm, en dat is
 * de bedoeling: twee schermen die "contentmix" zeggen en iets anders tellen is
 * precies de fout die deze bouwronde opruimt. Nagerekend op productie op
 * 17 augustus 2026: informatief 131, categorie 67, dienst 66.
 */

/** Alleen wat de tellingen dragen. Smal, zodat een test geen hele planrij nabouwt. */
export interface VoortgangPagina {
  funnel_stage_id: string | null;
  page_type: string;
  is_buffer: boolean;
  posted_at: string | null;
}

export interface Funnelfase {
  id: string;
  label: string;
  sort_order: number;
}

export interface FunnelVoortgang {
  label: string;
  geplaatst: number;
  gepland: number;
  /** 0 tot 100. `null` als er niets gepland is: 0% suggereert achterstand. */
  percentage: number | null;
}

/**
 * Per funnelfase: hoeveel van de geplande pagina's staan live?
 *
 * De fases houden hun eigen volgorde (`sort_order`), niet die van het aantal.
 * Een funnel ís een volgorde, en hem op grootte sorteren maakt van een reis een
 * ranglijst.
 *
 * ⚠️ Een fase zonder geplande pagina's blijft staan met 0 van 0. Stil weglaten
 * is erger dan een leeg vakje: dan ziet de klant niet dát die fase bestaat en
 * dat er niets voor gepland is (`docs/ux-design.md` §4).
 */
export function funnelVoortgang(
  paginas: VoortgangPagina[],
  fases: Funnelfase[],
): FunnelVoortgang[] {
  const echt = paginas.filter((p) => !p.is_buffer);

  return [...fases]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((fase) => {
      const vanFase = echt.filter((p) => p.funnel_stage_id === fase.id);
      const geplaatst = vanFase.filter((p) => p.posted_at !== null).length;
      return {
        label: fase.label,
        geplaatst,
        gepland: vanFase.length,
        percentage: vanFase.length > 0 ? (geplaatst / vanFase.length) * 100 : null,
      };
    });
}

export interface MixDeel {
  type: string;
  aantal: number;
  /** Aandeel binnen het plan, 0 tot 100. */
  percentage: number;
}

/**
 * De verdeling van de geplande pagina's over de paginatypes.
 *
 * Aflopend op aantal: bij een mix is de vraag "waar zit het zwaartepunt", niet
 * "in welke volgorde staan de labels".
 */
export function contentMix(paginas: VoortgangPagina[]): MixDeel[] {
  const echt = paginas.filter((p) => !p.is_buffer);
  if (echt.length === 0) return [];

  const per = new Map<string, number>();
  for (const p of echt) per.set(p.page_type, (per.get(p.page_type) ?? 0) + 1);

  return [...per.entries()]
    .map(([type, aantal]) => ({ type, aantal, percentage: (aantal / echt.length) * 100 }))
    .sort((a, b) => b.aantal - a.aantal);
}

/** Het totaal waar beide blokken op rusten, reservepagina's uitgezonderd. */
export function planTotalen(paginas: VoortgangPagina[]): {
  gepland: number;
  geplaatst: number;
  reserve: number;
} {
  const reserve = paginas.filter((p) => p.is_buffer).length;
  const echt = paginas.filter((p) => !p.is_buffer);
  return {
    gepland: echt.length,
    geplaatst: echt.filter((p) => p.posted_at !== null).length,
    reserve,
  };
}
