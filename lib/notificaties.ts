/**
 * WAT EEN NOTIFICATIE ZEGT, IN WELKE KLEUR, EN WAAR HIJ NAARTOE WIJST.
 *
 * ── WAAROM DIT BESTAAT (29 SEPTEMBER 2026) ──────────────────────────────────
 *
 * De database legt vast dát er iets gebeurde (migratie 0133: triggers op de
 * tabellen waar de gebeurtenis zichtbaar wordt). Deze module maakt er de zin
 * van die de gebruiker leest. Zo is een tekstwijziging een codewijziging met
 * een test, en geen migratie.
 *
 * Puur en zonder `server-only` (conventie 2): toetsbaar vanuit
 * `scripts/test-unit.ts`, en bruikbaar in de API-route en in de browser.
 *
 * ── DRIE KLEUREN, MEER NIET ────────────────────────────────────────────────
 *
 *   groen   iets is gelukt
 *   oranje  goed om te weten, er hoeft niets
 *   rood    er ging iets mis, of er moet iets gebeuren
 *
 * ── ÉÉN REGEL ──────────────────────────────────────────────────────────────
 *
 * Een melding is één korte regel. Wat erachter zit staat op de pagina waar de
 * titel naartoe linkt, zo precies mogelijk: de pagina zelf en niet de lijst
 * waarin hij staat, het cluster in Analytics en niet Analytics.
 */

export type NotificatieKleur = "groen" | "oranje" | "rood";

/** Eén rij uit `notificaties`, zoals de API hem leest. */
export interface NotificatieRij {
  id: string;
  profile_id: string | null;
  account_id: string | null;
  soort: string;
  object_id: string | null;
  gegevens: Record<string, unknown> | null;
  aantal: number;
  alleen_beheer: boolean;
  aangemaakt_op: string;
}

/** Wat het scherm toont. */
export interface Notificatie {
  id: string;
  titel: string;
  kleur: NotificatieKleur;
  /** `null` als er geen pagina is die er meer over zegt. */
  href: string | null;
  aangemaaktOp: string;
}

function tekst(g: Record<string, unknown> | null, sleutel: string): string | null {
  const v = g?.[sleutel];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function getal(g: Record<string, unknown> | null, sleutel: string): number | null {
  const v = g?.[sleutel];
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** De titel tussen aanhalingstekens, of zonder titel een omschrijving die
 *  nog steeds klopt. `begin` zet de hoofdletter voor gebruik vooraan de zin. */
function paginaNaam(g: Record<string, unknown> | null, begin = false): string {
  const titel = tekst(g, "titel");
  if (titel) return `"${titel}"`;
  return begin ? "Een pagina" : "een pagina";
}

function meervoud(n: number, een: string, meer: string): string {
  return n === 1 ? een : meer;
}

/**
 * De melding voor één rij, of `null` voor een soort die deze versie van de
 * app niet kent. Liever niets tonen dan een lege of verkeerde zin
 * (conventie 3): een nieuwe soort in de database zonder tekst hier valt zo
 * stil weg in plaats van als "undefined" op het scherm te staan.
 */
export function maakNotificatie(rij: NotificatieRij): Notificatie | null {
  const g = rij.gegevens ?? {};
  const p = rij.profile_id;
  const merk = p ? `/merk/${p}` : null;
  const pagina = merk && rij.object_id ? `${merk}/strategie/bibliotheek/${rij.object_id}` : null;
  const n = Math.max(1, rij.aantal || 1);

  const basis = { id: rij.id, aangemaaktOp: rij.aangemaakt_op };
  const maak = (titel: string, kleur: NotificatieKleur, href: string | null): Notificatie => ({
    ...basis,
    titel,
    kleur,
    href,
  });

  switch (rij.soort) {
    // ── Merk en merkdossier ──────────────────────────────────────────────
    case "onderzoek_klaar":
      return maak(
        `Het merkonderzoek van ${tekst(g, "naam") ?? "je merk"} is klaar`,
        "groen",
        merk && `${merk}/merkprofiel/bewerken`,
      );
    case "onderzoek_mislukt":
      return maak(
        `Het merkonderzoek van ${tekst(g, "naam") ?? "je merk"} is vastgelopen`,
        "rood",
        merk && `${merk}/merkprofiel/bewerken`,
      );
    case "gsc_cijfers":
      return maak("Nieuwe cijfers uit Search Console binnen", "oranje", merk && `${merk}/analytics/zoekverkeer`);
    case "gsc_fout":
      return maak("Search Console levert geen cijfers", "rood", p && `/instellingen/koppelingen/${p}`);
    case "reputatie_klaar":
      return maak("Het reputatieonderzoek is klaar", "groen", merk && `${merk}/analytics/reputatie`);
    case "reputatie_mislukt":
      return maak("Het reputatieonderzoek is vastgelopen", "rood", merk && `${merk}/analytics/reputatie`);
    case "audit_klaar":
      return maak("De technische controle van je site is klaar", "groen", merk && `${merk}/analytics`);
    case "audit_blokkade": {
      const b = getal(g, "blokkades") ?? 1;
      return maak(
        `Je site heeft ${b} ${meervoud(b, "blokkade", "blokkades")} voor AI-assistenten`,
        "rood",
        merk && `${merk}/analytics`,
      );
    }

    // ── Clusters en metingen ─────────────────────────────────────────────
    case "meting_klaar":
      return maak(
        `Meting van ${tekst(g, "naam") ?? "een cluster"} is klaar`,
        "groen",
        merk && (rij.object_id ? `${merk}/analytics?cluster=${rij.object_id}` : `${merk}/analytics`),
      );
    case "meting_mislukt":
      return maak(
        `Meting van ${tekst(g, "naam") ?? "een cluster"} is vastgelopen`,
        "rood",
        merk && `${merk}/strategie/clusters`,
      );
    case "zichtbaarheid_omhoog":
    case "zichtbaarheid_omlaag": {
      const van = getal(g, "van");
      const naar = getal(g, "naar");
      const omhoog = rij.soort === "zichtbaarheid_omhoog";
      const naam = tekst(g, "naam") ?? "een cluster";
      // Een daling is oranje en niet rood: er ging niets mis, het is een
      // uitkomst van de meting (`docs/designsystem.md` §2.6, dalen is geen
      // foutmelding). Zonder beide cijfers geen cijfers: "gestegen" klopt dan
      // nog wel.
      const titel =
        van !== null && naar !== null
          ? `Zichtbaarheid van ${naam} ${omhoog ? "gestegen" : "gedaald"} van ${van}% naar ${naar}%`
          : `Zichtbaarheid van ${naam} flink ${omhoog ? "gestegen" : "gedaald"}`;
      return maak(
        titel,
        omhoog ? "groen" : "oranje",
        merk && (rij.object_id ? `${merk}/analytics?cluster=${rij.object_id}` : `${merk}/analytics`),
      );
    }
    case "ontdekken_klaar": {
      const thema = tekst(g, "thema");
      return maak(thema ? `Nieuwe clusters ontdekt rond ${thema}` : "Nieuwe clusters ontdekt", "groen", merk && `${merk}/ontdekken`);
    }
    case "ontdekken_mislukt":
      return maak("Clusters ontdekken is vastgelopen", "rood", merk && `${merk}/ontdekken`);

    // ── Pagina's ─────────────────────────────────────────────────────────
    case "pagina_klaar":
      return maak(`${paginaNaam(g, true)} is klaar om te lezen`, "groen", pagina);
    case "nieuwe_versie":
      return maak(`Nieuwe versie van ${paginaNaam(g)} staat klaar`, "groen", pagina);
    case "pagina_live":
      return maak(`${paginaNaam(g, true)} staat live`, "groen", pagina);
    case "publicatie_niet_gevonden":
      return maak(`${paginaNaam(g, true)} niet teruggevonden op je site`, "rood", pagina);
    case "publicatie_herinnering":
      return maak("Er liggen al een week pagina's klaar om te publiceren", "oranje", merk && `${merk}/strategie/bibliotheek`);
    case "effect_gemeten":
      return maak(`Eerste effect van ${paginaNaam(g)} gemeten`, "groen", pagina);
    case "schrijven_mislukt":
      return maak(
        `Schrijven van ${paginaNaam(g)} is vastgelopen`,
        "rood",
        pagina ?? (merk && `${merk}/strategie/plan`),
      );

    // ── Vragen en kennis ─────────────────────────────────────────────────
    case "nieuwe_vragen":
      return maak(
        n === 1 ? "Er staat een nieuwe vraag voor je klaar" : `Er staan ${n} nieuwe vragen voor je klaar`,
        "rood",
        merk && `${merk}/strategie/vragen`,
      );
    case "vragen_herinnering":
      return maak("Er staan al een week vragen voor je open", "oranje", merk && `${merk}/strategie/vragen`);
    case "vragen_beantwoord":
      return maak(
        n === 1 ? "Een vraag is beantwoord" : `${n} vragen beantwoord`,
        "groen",
        merk && `${merk}/strategie/vragen`,
      );
    case "kennis_raakt_paginas":
      return maak(
        n === 1
          ? `Nieuwe bedrijfskennis raakt ${paginaNaam(g)}`
          : `Nieuwe bedrijfskennis raakt ${n} pagina's`,
        "oranje",
        n === 1 ? pagina : merk && `${merk}/strategie/bibliotheek`,
      );

    // ── Account en beheer ────────────────────────────────────────────────
    case "collega_aangemeld":
      return maak(`${tekst(g, "email") ?? "Een collega"} doet nu mee`, "groen", "/instellingen");
    case "budget_op":
      return maak("Het dagbudget voor AI-kosten is op", "rood", "/beheer");

    default:
      return null;
  }
}

/** Hoeveel meldingen er zijn sinds de gebruiker de lijst voor het laatst opende. */
export function telOngelezen(meldingen: Pick<Notificatie, "aangemaaktOp">[], gezienTot: string | null): number {
  if (!gezienTot) return meldingen.length;
  const grens = Date.parse(gezienTot);
  if (!Number.isFinite(grens)) return meldingen.length;
  return meldingen.filter((m) => Date.parse(m.aangemaaktOp) > grens).length;
}

/**
 * Welke meldingen horen nu als kleine melding in beeld te springen?
 *
 * Alleen wat er ná het openen van het scherm bijkwam en wat nog niet getoond
 * is. Wie 's ochtends inlogt en acht meldingen heeft, krijgt niet acht blokjes
 * over elkaar heen maar een teller op het belletje: dat is een lijst, geen
 * gebeurtenis. Hooguit drie tegelijk, om dezelfde reden.
 */
export const MAX_TEGELIJK = 3;

export function nieuwTeTonen(
  meldingen: Notificatie[],
  sinds: string,
  alGetoond: ReadonlySet<string>,
): Notificatie[] {
  const grens = Date.parse(sinds);
  return meldingen
    .filter((m) => Date.parse(m.aangemaaktOp) > grens && !alGetoond.has(toonSleutel(m)))
    .sort((a, b) => Date.parse(a.aangemaaktOp) - Date.parse(b.aangemaaktOp))
    .slice(-MAX_TEGELIJK);
}

/** Sleutel waaronder een getoonde melding onthouden wordt. Met de tijd erbij:
 *  een samengevoegde melding ("3 nieuwe vragen") mag opnieuw verschijnen als
 *  er een vierde bijkomt. */
export function toonSleutel(m: Pick<Notificatie, "id" | "aangemaaktOp">): string {
  return `${m.id}@${m.aangemaaktOp}`;
}

/** "zojuist", "12 min geleden", "3 uur geleden", "gisteren", "4 dagen geleden". */
export function wanneer(iso: string, nu: Date = new Date()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const minuten = Math.floor((nu.getTime() - t) / 60_000);
  if (minuten < 1) return "zojuist";
  if (minuten < 60) return `${minuten} min geleden`;
  const uren = Math.floor(minuten / 60);
  if (uren < 24) return `${uren} uur geleden`;
  const dagen = Math.floor(uren / 24);
  if (dagen === 1) return "gisteren";
  if (dagen < 7) return `${dagen} dagen geleden`;
  return new Date(t).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
}
