/**
 * EÉN STAND PER PAGINA (`docs/tasks/contentflow-een-lijn.md` §3 en §4.5).
 *
 * ── WAAROM DEZE MODULE ─────────────────────────────────────────────────────
 *
 * Een pagina had tot 23 september 2026 twee statussen die elkaar niet
 * bijhielden: `planned_pages.status` in het contentplan (`lib/plan-status.ts`)
 * en `content_pieces.status` in de bibliotheek (`lib/content-status.ts`). Bij
 * Van den Udenhout zei de bibliotheek "Klaar om te publiceren" over een tekst
 * die nog goedgekeurd moest worden, en "Wacht op jouw input" over een pagina
 * waarvan alle vragen al beantwoord waren. Het contentplan zei over dezelfde
 * pagina weer iets anders.
 *
 * Deze module leidt uit die twee rijen, plus het aantal open vragen, precies
 * één stand af, met één label, één zin over wat er nu gebeurt en hooguit één
 * handeling voor de klant. Elk scherm leest hier; geen scherm vertaalt zelf.
 *
 * ── WAAROM AFGELEID EN NIET OPGESLAGEN ─────────────────────────────────────
 *
 * Het plan stelde nieuwe waarden voor in `planned_pages.status`. Die kolom
 * heeft een check-constraint (migratie 0049), en die verruimen kan alleen door
 * hem eerst weg te halen: dat verbiedt conventie 4. Alles wat de nieuwe
 * standen nodig hebben staat er bovendien al: de voorbereiding is klaar zodra
 * `content_pieces.briefing_snapshot_json` gevuld is (`runBriefing()`), en de
 * vragen tellen we per pagina. Een opgeslagen stand zou daarnaast een derde
 * waarheid zijn die uit de pas kan lopen.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import type { PlannedPageStatus } from "@/lib/types/database";
import { schrijfpoort } from "@/lib/content-write-gate";
import type { InputStand, WriteMode } from "@/lib/content-input-gate";

export type PaginaStandSleutel =
  | "gepland"
  | "voorbereiden"
  | "vragen"
  | "keuze"
  | "wacht_op_datum"
  | "niet_ingepland"
  | "schrijven"
  | "goedkeuren"
  | "live_zetten"
  | "effect_meten"
  | "effect_bekend"
  | "mislukt"
  | "vervallen";

/** De vijf stappen van de standbalk. Acht op een telefoon leest niemand. */
export const FASEN = ["Vragen", "Schrijven", "Goedkeuren", "Live", "Effect"] as const;
export type Fase = (typeof FASEN)[number];

export type AanZet = "klant" | "orbit_engine" | null;
export type StandToon = "wacht" | "loopt" | "klaar" | "fout" | "neutraal";

export interface PaginaStand {
  sleutel: PaginaStandSleutel;
  /** Het label op de chip. */
  label: string;
  aanZet: AanZet;
  toon: StandToon;
  /** Index in `FASEN`. `null` bij vervallen. */
  fase: number | null;
  /** Eén zin: wat er nu gebeurt en wat de volgende stap is. */
  zin: string;
  /** De handeling van de klant, als hij aan zet is. Hooguit één. */
  handeling: string | null;
  /** Streefdatum voor de antwoorden gepasseerd terwijl er nog iets openstaat. */
  looptAchter: boolean;
  /** Streefdatum voor de antwoorden (`YYYY-MM-DD`), als die er is. */
  streefdatum: string | null;
}

export interface PaginaStandInput {
  plan: {
    status: PlannedPageStatus;
    scheduled_for: string | null;
    /** Is de maand van deze pagina vrijgegeven? */
    maandVrij: boolean;
  } | null;
  tekst: {
    status: string;
    needs_review: boolean;
    /** Is de voorbereiding klaar (`briefing_snapshot_json` gevuld)? */
    voorbereid: boolean;
    write_mode?: WriteMode;
  } | null;
  /** Open vragen van deze pagina (`openVragenVanPagina`). */
  openVragen: number;
  /** Het oordeel van de inputpoort, als dat bekend is. */
  inputStand?: InputStand | null;
  /** Staat er een eindoordeel van de nameting? */
  effectBekend?: boolean;
  /** Vandaag als `YYYY-MM-DD`. */
  vandaag: string;
}

/**
 * Tot wanneer de klant zijn antwoorden hoort te geven: 12 dagen vóór de datum,
 * de tien dagen schrijfvoorsprong plus twee dagen marge (§3.1). Een streefdatum
 * en geen uiterste datum: er wordt nooit geschreven met een open vraag.
 */
export const STREEF_MARGE_DAGEN = 12;

export function streefdatum(publicatiedatum: string | null): string | null {
  if (!publicatiedatum) return null;
  const d = new Date(`${publicatiedatum.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - STREEF_MARGE_DAGEN);
  return d.toISOString().slice(0, 10);
}

export function formatDag(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", timeZone: "UTC" });
}

function stand(
  sleutel: PaginaStandSleutel,
  velden: Omit<PaginaStand, "sleutel" | "looptAchter" | "streefdatum">,
  extra: { looptAchter?: boolean; streefdatum?: string | null } = {},
): PaginaStand {
  return {
    sleutel,
    ...velden,
    looptAchter: extra.looptAchter ?? false,
    streefdatum: extra.streefdatum ?? null,
  };
}

export function paginaStand(input: PaginaStandInput): PaginaStand {
  const { plan, tekst, vandaag } = input;
  const datum = plan?.scheduled_for?.slice(0, 10) ?? null;
  const streef = streefdatum(datum);

  // ── Eindstanden en uitzonderingen eerst ──────────────────────────────────
  if (plan?.status === "afgewezen") {
    return stand("vervallen", {
      label: "Vervallen",
      aanZet: null,
      toon: "neutraal",
      fase: null,
      zin: "Deze pagina wordt niet geschreven.",
      handeling: null,
    });
  }
  if (tekst?.status === "published" || plan?.status === "geplaatst") {
    return input.effectBekend
      ? stand("effect_bekend", {
          label: "Effect bekend",
          aanZet: null,
          toon: "klaar",
          fase: 4,
          zin: "De nameting is klaar. Hieronder zie je wat deze pagina deed.",
          handeling: null,
        })
      : stand("effect_meten", {
          label: "Staat live",
          aanZet: "orbit_engine",
          toon: "klaar",
          fase: 4,
          zin: "We controleren of de pagina goed op je site staat en meten het effect na 14 en 28 dagen.",
          handeling: null,
        });
  }
  if (plan?.status === "mislukt") {
    return stand("mislukt", {
      label: "Schrijven mislukt",
      aanZet: "orbit_engine",
      toon: "fout",
      fase: 1,
      zin: "Het schrijven lukte niet. We proberen het opnieuw; je hoeft niets te doen.",
      handeling: null,
    });
  }

  // ── Er is tekst ──────────────────────────────────────────────────────────
  const heeftTekst = tekst !== null && (tekst.status === "ready" || tekst.status === "draft");
  if (plan?.status === "schrijven" && !(tekst?.status === "ready")) {
    return schrijvend();
  }
  if (plan?.status === "goedgekeurd" || (tekst?.status === "ready" && !tekst.needs_review)) {
    return stand("live_zetten", {
      label: "Zet hem live",
      aanZet: "klant",
      toon: "wacht",
      fase: 3,
      zin: "De tekst is goedgekeurd. Plaats hem op je site en vul daarna het adres in.",
      handeling: "Zet live",
    });
  }
  if (heeftTekst || plan?.status === "ter_goedkeuring") {
    return stand("goedkeuren", {
      label: "Lees en keur goed",
      aanZet: "klant",
      toon: "wacht",
      fase: 2,
      zin: "De tekst is klaar. Lees hem, pas aan wat je wilt en keur hem goed.",
      handeling: "Keur goed",
    });
  }

  // ── Nog geen tekst: gepland, voorbereiden, vragen ────────────────────────
  if (!tekst || tekst.status !== "briefing") {
    if (plan && !plan.maandVrij) {
      return stand(
        "gepland",
        {
          label: "Gepland",
          aanZet: null,
          toon: "neutraal",
          fase: 0,
          zin: "Zodra je deze maand vrijgeeft, zetten we de vragen voor deze pagina klaar.",
          handeling: null,
        },
        { streefdatum: streef },
      );
    }
    // Nog geen rij in `content_pieces`: er draait dan nog niets. Tot
    // 23 september 2026 stond hier "Dat duurt een paar minuten", terwijl bij
    // Van den Udenhout vijf pagina's van een vrijgegeven maand geen enkele taak
    // hadden (de maand ging vrij om 08:29, de code die voorbereidt stond pas om
    // 09:56 live). De plan-cron van 04:00 UTC pakt ze op; dat zegt deze zin.
    return voorbereidend(streef, false);
  }
  if (!tekst.voorbereid) return voorbereidend(streef, true);

  const poort = schrijfpoort({
    openVragen: input.openVragen,
    voorbereidingKlaar: true,
    inputStand: input.inputStand ?? null,
    writeMode: tekst.write_mode ?? null,
    publicatiedatum: datum,
    vandaag,
  });
  const achter = streef !== null && vandaag > streef;

  if (poort.reden === "vragen_open") {
    const n = Number.isFinite(input.openVragen) && input.openVragen > 0 ? input.openVragen : null;
    return stand(
      "vragen",
      {
        label: "Jouw antwoorden nodig",
        aanZet: "klant",
        toon: "wacht",
        fase: 0,
        zin:
          poort.melding +
          (streef && !achter ? ` Graag vóór ${formatDag(streef)}.` : "") +
          (achter ? " Deze pagina loopt achter op zijn datum." : ""),
        handeling: n === 1 ? "Beantwoord 1 vraag" : n ? `Beantwoord ${n} vragen` : "Bekijk de vragen",
      },
      { looptAchter: achter, streefdatum: streef },
    );
  }
  if (poort.reden === "te_weinig_onderbouwd") {
    return stand(
      "keuze",
      {
        label: "Jouw keuze nodig",
        aanZet: "klant",
        toon: "wacht",
        fase: 0,
        zin: poort.melding,
        handeling: "Kies hoe verder",
      },
      { looptAchter: achter, streefdatum: streef },
    );
  }
  // Een pagina uit de oude route vanuit een cluster, zonder plek in het plan:
  // die wordt nooit vanzelf geschreven (`probeerTeSchrijven()` doet alleen
  // plan-pagina's). "Wordt geschreven" zou hier een belofte zijn die niemand
  // nakomt; dit zegt wat er echt nodig is.
  if (!plan && poort.mag) {
    return stand("niet_ingepland", {
      label: "Nog niet ingepland",
      aanZet: null,
      toon: "neutraal",
      fase: 1,
      zin: "Alle vragen zijn gedaan. Deze pagina staat nog niet in het contentplan; zodra hij daar een datum heeft, schrijven we hem.",
      handeling: null,
    });
  }
  if (poort.reden === "nog_niet_aan_de_beurt") {
    return stand(
      "wacht_op_datum",
      {
        label: "Alle vragen gedaan",
        aanZet: null,
        toon: "neutraal",
        fase: 1,
        zin: poort.melding,
        handeling: null,
      },
      { streefdatum: streef },
    );
  }
  return schrijvend();
}

function schrijvend(): PaginaStand {
  return stand("schrijven", {
    label: "Wordt geschreven",
    aanZet: "orbit_engine",
    toon: "loopt",
    fase: 1,
    zin: "We schrijven en keuren de tekst. Dat duurt meestal een kwartier; je hoeft niets te doen.",
    handeling: null,
  });
}

function voorbereidend(streef: string | null, gestart: boolean): PaginaStand {
  return stand(
    "voorbereiden",
    gestart
      ? {
          label: "Wordt voorbereid",
          aanZet: "orbit_engine",
          toon: "loopt",
          fase: 0,
          zin: "We zoeken uit wat er op deze pagina moet en welke vragen we je moeten stellen. Dat duurt een paar minuten.",
          handeling: null,
        }
      : {
          label: "Voorbereiding volgt",
          aanZet: "orbit_engine",
          toon: "neutraal",
          fase: 0,
          zin: "We beginnen uiterlijk morgenochtend met de voorbereiding. Hebben we vragen, dan staan die daarna bij Openstaande vragen.",
          handeling: null,
        },
    { streefdatum: streef },
  );
}

/**
 * Heeft deze pagina een eigen scherm dat iets toevoegt?
 *
 * Op 23 september 2026 vond de eigenaar dat het paginascherm bij "Wordt
 * voorbereid" en "Nog niet ingepland" niets toevoegde: een laadbalk of een zin,
 * en daaronder de opdracht die ook in het contentplan staat. Een eigen scherm
 * heeft een pagina alleen als de klant er iets moet doen (vragen, een keuze) of
 * als er tekst is om te lezen. De rest staat in het contentplan, met zijn stand.
 */
export function heeftEigenScherm(sleutel: PaginaStandSleutel): boolean {
  return (
    sleutel === "vragen" ||
    sleutel === "keuze" ||
    sleutel === "goedkeuren" ||
    sleutel === "live_zetten" ||
    sleutel === "effect_meten" ||
    sleutel === "effect_bekend"
  );
}

/**
 * Hoort deze pagina in de bibliotheek? Alleen als er tekst is.
 *
 * Tot 23 september 2026 stond daar elke pagina van een vrijgegeven maand, ook
 * de vijf van Van den Udenhout die nog niet eens voorbereid waren. Wat nog geen
 * tekst heeft, hoort in het contentplan (wanneer) of bij Openstaande vragen
 * (wat we van je nodig hebben). Zo is de bibliotheek wat het woord belooft:
 * de teksten.
 */
export function inBibliotheek(stand: PaginaStand): boolean {
  return stand.fase !== null && stand.fase >= 2;
}

/** De chipklasse bij een toon (`docs/designsystem.md` §2.5, vier betekenissen). */
export const STAND_CHIP: Record<StandToon, string> = {
  wacht: "chip chip-warning",
  loopt: "chip chip-info",
  klaar: "chip chip-success",
  fout: "chip chip-danger",
  neutraal: "chip chip-neutral",
};

/** Sorteervolgorde in lijsten: eerst wat op de klant wacht. */
export function standVolgorde(s: PaginaStand): number {
  if (s.aanZet === "klant") return s.looptAchter ? 0 : 1;
  if (s.aanZet === "orbit_engine") return 2;
  if (s.sleutel === "gepland" || s.sleutel === "wacht_op_datum" || s.sleutel === "niet_ingepland") return 3;
  return 4;
}
