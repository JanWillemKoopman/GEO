/**
 * "Markeer alles als geplaatst": welke pagina's mogen mee, en wat zeg je als er
 * maar een deel lukt?
 *
 * ── WAAROM DIT EEN PURE MODULE IS ───────────────────────────────────────────
 *
 * Kwaliteitslat **K5** uit `docs/logbook.md` luidt: *een bulkactie is eerlijk
 * over gedeeltelijk succes.* De toets erbij is letterlijk "laat een bulkactie
 * half mislukken, wordt dat eerlijk gemeld?". Zo'n melding is rekenwerk over een
 * lijst uitkomsten, en dat hoort in een testbare module en niet in een
 * `catch`-blok halverwege een clientcomponent (conventie 2). Anders is de enige
 * manier om hem te toetsen: met de hand een storing veroorzaken.
 *
 * ── WAAROM EEN PAGINA KAN AFVALLEN ──────────────────────────────────────────
 *
 * Twee redenen, en ze zijn allebei gewoon en geen storing:
 *
 *   1. **Geen adres.** `markPosted()` legt vast op wélk adres de pagina live
 *      staat, want ORBIT ENGINE gaat dat adres meten. Een pagina zonder
 *      `url_path` heeft dat adres niet, en een verzonnen adres levert een
 *      meting op die nergens over gaat (conventie 3: onbekend is beter dan
 *      verkeerd).
 *   2. **Nog niet goedgekeurd.** Een pagina die nog geschreven of nog niet
 *      afgetikt is, staat niet live. Hem toch op `geplaatst` zetten is een
 *      onomkeerbare handeling op grond van een aanname.
 *
 * Reservepagina's (`is_buffer`) tellen sowieso niet mee: die staan klaar om in
 * te schuiven en horen niet in het maandtotaal (migratie 0049).
 */
import type { PlannedPageStatus } from "@/lib/types/database";

/** Alleen wat het oordeel draagt. Smal, zodat een test geen hele planrij hoeft na te bouwen. */
export interface BulkKandidaat {
  id: string;
  title: string;
  status: PlannedPageStatus;
  url_path: string | null;
  is_buffer: boolean;
}

export type OverslaanReden = "geen-adres" | "niet-goedgekeurd";

export interface BulkSelectie {
  /** Deze gaan mee, met het adres waarop ze gemarkeerd worden. */
  mee: { id: string; title: string; url: string }[];
  /** Deze blijven staan, met de reden erbij. */
  overslaan: { id: string; title: string; reden: OverslaanReden }[];
  /**
   * Stond al live. Geen succes en geen mislukking: de klant vroeg om deze
   * toestand en die was er al. Wél tellen, want anders lijkt "3 van de 9" alsof
   * er zes fout gingen terwijl er zes al klaar waren.
   */
  alGeplaatst: number;
}

/**
 * Welke pagina's van deze maand kunnen op "geplaatst"?
 *
 * ⚠️ Reservepagina's vallen er stilzwijgend uit en komen in geen enkele lijst.
 * Ze horen niet bij het maandtotaal (migratie 0049), dus ze melden als
 * "overgeslagen" zou de klant laten denken dat er iets misging.
 */
export function kiesVoorBulk(paginas: BulkKandidaat[]): BulkSelectie {
  const mee: BulkSelectie["mee"] = [];
  const overslaan: BulkSelectie["overslaan"] = [];
  let alGeplaatst = 0;

  for (const p of paginas) {
    if (p.is_buffer) continue;

    if (p.status === "geplaatst") {
      alGeplaatst++;
      continue;
    }
    if (p.status !== "goedgekeurd") {
      overslaan.push({ id: p.id, title: p.title, reden: "niet-goedgekeurd" });
      continue;
    }
    const adres = (p.url_path ?? "").trim();
    if (!adres) {
      overslaan.push({ id: p.id, title: p.title, reden: "geen-adres" });
      continue;
    }
    mee.push({ id: p.id, title: p.title, url: adres });
  }

  return { mee, overslaan, alGeplaatst };
}

export interface BulkUitkomst {
  /** Titels die het haalden. */
  gelukt: string[];
  /** Titels die het niet haalden, met de reden. */
  mislukt: { title: string; reden: string }[];
  /** Stond al live. Geen succes en geen mislukking. */
  alGeplaatst?: number;
}

/**
 * De melding na afloop, in gewone taal.
 *
 * ── DE REGEL VAN K5, UITGESCHREVEN ──────────────────────────────────────────
 *
 * Lukken er 7 van de 9, dan zegt de melding dat, mét welke twee niet en waarom.
 * "7 pagina's gemarkeerd" is niet eerlijk: de klant denkt dan dat het klaar is
 * en ontdekt de twee pas weken later, als de meting op die pagina's uitblijft.
 *
 * Vandaar drie uitkomsten en geen twee. "Niets gelukt" is een fout en geen
 * gedeeltelijk succes, en "alles gelukt" hoeft geen opsomming.
 */
export function bulkMelding(uitkomst: BulkUitkomst): {
  intent: "succes" | "waarschuwing" | "fout";
  title: string;
  description: string;
} {
  const g = uitkomst.gelukt.length;
  const m = uitkomst.mislukt.length;
  const al = uitkomst.alGeplaatst ?? 0;
  const alTekst = al > 0 ? ` ${al === 1 ? "Eén pagina stond" : `${al} pagina's stonden`} al live.` : "";

  if (g === 0 && m === 0) {
    return {
      intent: al > 0 ? "succes" : "waarschuwing",
      title: al > 0 ? "Deze maand stond al helemaal live" : "Er was niets te markeren",
      description:
        al > 0
          ? "Er was niets meer te markeren, alles staat al op je site."
          : "Alle pagina's van deze maand wachten nog op akkoord, of hebben nog geen adres.",
    };
  }

  if (m === 0) {
    return {
      intent: "succes",
      title: g === 1 ? "1 pagina staat op live" : `${g} pagina's staan op live`,
      description: `ORBIT ENGINE gaat deze adressen volgen en meet vanaf nu wat ze opleveren.${alTekst}`,
    };
  }

  const opsomming = uitkomst.mislukt.map((f) => `"${f.title}" (${f.reden})`).join(", ");

  if (g === 0) {
    return {
      intent: "fout",
      title: m === 1 ? "Die ene lukte niet" : `Geen van de ${m} lukte`,
      description: `Niet gemarkeerd: ${opsomming}.${alTekst}`,
    };
  }

  return {
    intent: "waarschuwing",
    title: `${g} van de ${g + m} gemarkeerd`,
    description: `Deze bleven staan: ${opsomming}.${alTekst}`,
  };
}

/** De reden in gewone taal, voor in de melding hierboven. */
export const OVERSLAAN_TEKST: Record<OverslaanReden, string> = {
  "geen-adres": "nog geen adres bekend",
  "niet-goedgekeurd": "nog niet goedgekeurd",
};
