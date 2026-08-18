/**
 * Het Admin-scherm: welke acht taken de onboarding doet, en hoe lang ze duurden.
 *
 * ── WAAROM DIT EEN PURE MODULE IS ───────────────────────────────────────────
 *
 * De doorlooptijd is rekenwerk (conventie 2), en de lijst met onboardingtaken
 * bepaalt of het scherm "6 van de 8" of "6 van de 7" zegt. Zo'n noemer die
 * stilletjes verschuift als er een taaksoort bijkomt, is precies het soort fout
 * dat niemand ziet.
 *
 * ── DE NEGEN SECTIES ZIJN DIE VAN DE KLANT ──────────────────────────────────
 *
 * Nova toont zijn klant het onboardingprofiel in negen secties, in deze
 * volgorde. Ons merkdossier volgt dezelfde volgorde. Op het Admin-scherm staat
 * hij als inhoudsopgave, zodat je tijdens een demo weet welk scherm de klant
 * voor zich heeft terwijl jij naar de ruwe laag kijkt.
 */
import { type JobType } from "@/lib/jobs/types";

/** De negen secties die de klant ziet, in zijn eigen volgorde. */
export const ADMIN_SECTIES = [
  { naam: "Bedrijf", waar: "Merkprofiel, stap 1" },
  { naam: "Contact", waar: "Merkprofiel, stap 1" },
  { naam: "Talen", waar: "Merkprofiel, stap 1" },
  { naam: "Positionering", waar: "Merkprofiel, stap 2" },
  { naam: "Doelgroep", waar: "Merkprofiel, stap 3" },
  { naam: "Stem", waar: "Merkprofiel, stap 4" },
  { naam: "Woorden", waar: "Merkprofiel, stap 5" },
  { naam: "Auteur", waar: "Merkprofiel, stap 6" },
  { naam: "Onderwerpen", waar: "Strategie, Clusters" },
] as const;

/**
 * De acht taken van de onboardingketen, op uitvoervolgorde.
 *
 * ⚠️ Dit is de keten die aan één `enqueue` hangt vanuit `POST /api/profiles`
 * (`docs/architecture.md` §4). `technical_audit` hoort erbij ook al levert hij
 * geen AI-aanroep: hij wordt door `profile_discover` ingepland en de klant
 * wacht erop. Andere taaksoorten (meten, schrijven, hermeten) horen bij een
 * cluster en niet bij de onboarding, en staan hier dus niet in.
 */
export const ONBOARDING_TAKEN: JobType[] = [
  "profile_discover",
  "technical_audit",
  "profile_research",
  "profile_offering",
  "profile_market",
  "propose_topics",
  "profile_llm_baseline",
  "profile_synthesis",
];

export interface TaakRij {
  type: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  attempts: number;
  last_error: string | null;
}

export interface TaakTijd {
  type: string;
  status: string;
  pogingen: number;
  /** Doorlooptijd in hele seconden. `null` als de taak niet begon of niet eindigde. */
  secondenr: number | null;
  fout: string | null;
}

/**
 * Per onboardingtaak de uitkomst en de doorlooptijd, op ketenvolgorde.
 *
 * ⚠️ **Op ketenvolgorde en niet op tijd.** De keten is vast en de volgorde
 * ervan is de uitleg: wie ziet dat `profile_synthesis` ontbreekt weet meteen dat
 * de staart is blijven hangen. Op tijd sorteren verbergt dat, want een taak die
 * nooit draaide heeft geen tijd.
 *
 * Een taak die er meerdere keren staat (opnieuw ingepland na een storing) telt
 * één keer, met de laatste poging: dat is de stand van nu.
 */
export function doorlooptijden(taken: TaakRij[]): TaakTijd[] {
  const laatste = new Map<string, TaakRij>();
  for (const t of taken) {
    const bestaand = laatste.get(t.type);
    if (!bestaand || (t.finished_at ?? "") >= (bestaand.finished_at ?? "")) {
      laatste.set(t.type, t);
    }
  }

  return ONBOARDING_TAKEN.filter((type) => laatste.has(type)).map((type) => {
    const t = laatste.get(type)!;
    return {
      type,
      status: t.status,
      pogingen: t.attempts,
      secondenr: duurSeconden(t.started_at, t.finished_at),
      fout: t.last_error,
    };
  });
}

/** Hele seconden tussen start en eind. `null` als een van beide ontbreekt (conventie 3). */
export function duurSeconden(start: string | null, eind: string | null): number | null {
  if (!start || !eind) return null;
  const ms = new Date(eind).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 1000);
}
