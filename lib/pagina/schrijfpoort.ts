/**
 * DE SCHRIJFPOORT: mag deze pagina nu geschreven worden?
 * (`docs/tasks/contentketen-opnieuw.md` §6.8, besluiten B5 en B6)
 *
 * Twee regels, en niet meer:
 *   1. De content brief is klaar en elke vraag van de pagina is beantwoord of
 *      overgeslagen. Er is geen uiterste datum waarna we toch schrijven: de
 *      eigenaar wil zeker weten dat de klant de vragen gezien heeft.
 *   2. De schrijfdatum is bereikt: op zijn vroegst 10 dagen vóór de
 *      publicatiedatum, zodat teksten niet weken te vroeg klaarliggen.
 *
 * De vorige poort woog ook of er "genoeg onderbouwd" was (40 en 70 procent).
 * Die regel is weg: de schrijver laat weg wat hij niet weet (§3 regel 4).
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { SCHRIJFVOORSPRONG_DAGEN } from "@/lib/plan-status";

export type SchrijfReden =
  /** De content brief van deze pagina is er nog niet. */
  | "voorbereiding_loopt"
  /** Er staan nog vragen open. */
  | "vragen_open"
  /** Alles is gedaan, maar de schrijfdatum is nog niet bereikt. */
  | "nog_niet_aan_de_beurt";

export interface SchrijfpoortInput {
  /** Bestaat de content brief (`content_pieces.brief_json`)? */
  briefKlaar: boolean;
  /** Het aantal open vragen van deze pagina (`openVragenVanPagina`). */
  openVragen: number;
  /** Publicatiedatum als `YYYY-MM-DD`, of null: dan geldt de datumregel niet. */
  publicatiedatum: string | null;
  /** Vandaag als `YYYY-MM-DD`. Een parameter, zodat de test de klok kiest. */
  vandaag: string;
}

export interface SchrijfpoortOordeel {
  mag: boolean;
  reden: SchrijfReden | null;
  /** Vanaf welke dag het schrijven begint, als dat de enige reden is. */
  schrijftVanaf: string | null;
  /** Wat de klant leest, in de tweede persoon. Altijd gevuld. */
  melding: string;
}

/** De dag waarop het schrijven van een pagina met deze datum op zijn vroegst begint. */
export function schrijfdatum(publicatiedatum: string): string {
  const d = new Date(`${publicatiedatum.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - SCHRIJFVOORSPRONG_DAGEN);
  return d.toISOString().slice(0, 10);
}

export function schrijfpoort(input: SchrijfpoortInput): SchrijfpoortOordeel {
  const { briefKlaar, openVragen, publicatiedatum, vandaag } = input;

  if (!briefKlaar) {
    return {
      mag: false,
      reden: "voorbereiding_loopt",
      schrijftVanaf: null,
      melding: "We zoeken uit wat er op deze pagina moet en welke vragen we je willen stellen.",
    };
  }

  // ⚠️ Een negatief of onbekend getal is geen nul. Alleen een echte nul opent
  // de poort (conventie 3).
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
