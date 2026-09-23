/**
 * De SCHRIJFPOORT: mag ORBIT ENGINE deze pagina nu gaan schrijven?
 * (`docs/tasks/contentflow-een-lijn.md` §1 en §4.2)
 *
 * ── HET BESLUIT WAAR DEZE MODULE VOOR BESTAAT (23 september 2026) ───────────
 *
 * Er wordt pas geschreven als élke vraag van de pagina beantwoord of
 * overgeslagen is. Geen uiterste datum waarna het toch gebeurt: de eigenaar wil
 * de kwaliteit garanderen en zeker weten dat de klant de vragen gezien heeft.
 *
 * Tot die dag schreef het contentplan tien dagen voor de publicatiedatum
 * zonder één vraag te stellen, en de route vanuit een cluster stelde de vragen
 * wel maar wachtte daarna op een knop die niemand vond: bij Van den Udenhout
 * stond een pagina drie dagen op "Wacht op jouw input" met alle vijf de vragen
 * beantwoord.
 *
 * ── DRIE POORTEN, DRIE VRAGEN ──────────────────────────────────────────────
 *
 *   schrijfpoort (hier)       heeft de klant alles gezien?          vóór schrijven
 *   inputpoort                is er genoeg om op te schrijven?      vóór schrijven
 *   eindpoort                 staat er na het schrijven nog iets?   vóór goedkeuren
 *
 * Deze poort neemt het oordeel van de inputpoort mee (regel 3), zodat er één
 * antwoord is op "wordt hij geschreven" en het scherm geen twee meldingen hoeft
 * te combineren.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import type { InputStand, WriteMode } from "@/lib/content-input-gate";

/** Hoeveel dagen vóór de publicatiedatum het schrijven op zijn vroegst begint. */
export { SCHRIJFVOORSPRONG_DAGEN } from "@/lib/plan-status";
import { SCHRIJFVOORSPRONG_DAGEN } from "@/lib/plan-status";

export type SchrijfReden =
  /** De vragen van deze pagina worden nog opgesteld. */
  | "voorbereiding_loopt"
  /** Er staan nog vragen open. */
  | "vragen_open"
  /** Alles is gedaan, maar er is te weinig om op te schrijven: de klant kiest. */
  | "te_weinig_onderbouwd"
  /** Alles is gedaan, en de schrijfdatum is nog niet bereikt. */
  | "nog_niet_aan_de_beurt";

export interface SchrijfpoortInput {
  /** Het aantal open vragen van deze pagina (`openVragenVanPagina`). */
  openVragen: number;
  /** Is de voorbereiding van deze pagina klaar (contract plus vragen)? */
  voorbereidingKlaar: boolean;
  /**
   * Het oordeel van de inputpoort, na het snoeien van overgeslagen secties.
   * `null` = onbekend (pagina van vóór het contract): dan geldt de inputpoort
   * niet, zoals hij ook elders wegvalt zonder contract (conventie 3).
   */
  inputStand: InputStand | null;
  /** Koos de klant al voor "schrijf hem algemeen"? */
  writeMode: WriteMode;
  /** Publicatiedatum als `YYYY-MM-DD`, of null als die er niet is. */
  publicatiedatum: string | null;
  /** Vandaag als `YYYY-MM-DD`. Een parameter, zodat de test de klok kiest. */
  vandaag: string;
}

export interface SchrijfpoortOordeel {
  mag: boolean;
  reden: SchrijfReden | null;
  /** Vanaf welke dag het schrijven begint, als dat nu de enige reden is. */
  schrijftVanaf: string | null;
  /** Wat de klant leest, in de tweede persoon. Altijd gevuld. */
  melding: string;
}

/** De dag waarop het schrijven van een pagina met deze datum op zijn vroegst begint. */
export function schrijfdatum(publicatiedatum: string): string {
  const d = new Date(`${publicatiedatum}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - SCHRIJFVOORSPRONG_DAGEN);
  return d.toISOString().slice(0, 10);
}

export function schrijfpoort(input: SchrijfpoortInput): SchrijfpoortOordeel {
  const { openVragen, voorbereidingKlaar, inputStand, writeMode, publicatiedatum, vandaag } = input;

  if (!voorbereidingKlaar) {
    return {
      mag: false,
      reden: "voorbereiding_loopt",
      schrijftVanaf: null,
      melding: "We zoeken uit wat er op deze pagina moet en welke vragen we je moeten stellen.",
    };
  }

  // ⚠️ Een negatief of onbekend getal is geen nul. Alleen een echte nul opent
  // de poort; alles daarbuiten houdt hem dicht (conventie 3).
  if (!(Number.isFinite(openVragen) && openVragen === 0)) {
    const n = Number.isFinite(openVragen) && openVragen > 0 ? openVragen : null;
    return {
      mag: false,
      reden: "vragen_open",
      schrijftVanaf: null,
      melding:
        n === null
          ? "We weten niet zeker of alle vragen gedaan zijn, dus we schrijven nog niet."
          : n === 1
            ? "Nog 1 vraag. Beantwoord of sla hem over, daarna schrijven we deze pagina."
            : `Nog ${n} vragen. Beantwoord of sla ze over, daarna schrijven we deze pagina.`,
    };
  }

  // ── Genoeg om op te schrijven? ────────────────────────────────────────────
  //
  // Alleen bij "tegenhouden" en alleen zolang de klant niet koos voor een
  // algemene pagina. De inputpoort zelf laat `algemeen` al door, maar we kijken
  // hier ook naar `writeMode`, zodat een verouderd oordeel dat nog van vóór
  // die keuze stamt deze pagina niet onterecht vasthoudt.
  if (inputStand === "tegenhouden" && writeMode !== "algemeen") {
    return {
      mag: false,
      reden: "te_weinig_onderbouwd",
      schrijftVanaf: null,
      melding:
        "Alle vragen zijn gedaan, maar er is te weinig over je bedrijf bekend om deze pagina goed te " +
        "schrijven. Kies of we hem algemeen schrijven, zonder jouw cijfers, of dat hij vervalt.",
    };
  }

  // ── Niet weken te vroeg (contentflow-een-lijn.md §3.1) ────────────────────
  if (publicatiedatum) {
    const vanaf = schrijfdatum(publicatiedatum);
    if (vandaag < vanaf) {
      return {
        mag: false,
        reden: "nog_niet_aan_de_beurt",
        schrijftVanaf: vanaf,
        melding: `Alle vragen zijn gedaan. We schrijven deze pagina vanaf ${formatDag(vanaf)}.`,
      };
    }
  }

  return {
    mag: true,
    reden: null,
    schrijftVanaf: null,
    melding: "Alle vragen zijn gedaan. We schrijven deze pagina nu.",
  };
}

function formatDag(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", timeZone: "UTC" });
}
