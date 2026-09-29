/**
 * Eén statusoverzicht van alles wat met de onboarding te maken heeft.
 *
 * ── WAAROM DIT ER IS (30 SEPTEMBER 2026) ────────────────────────────────────
 *
 * De consultant had er twee: het scherm Diagnose met "De onboarding taken (9 van
 * de 9)", en op het onboardinggesprek een blok Voorbereiding met "7 van de 7".
 * Ze telden anders en overlapten: zes van de negen taken zijn ook een regel van
 * de volledigheidscheck, de andere drie stonden maar op één van de twee.
 *
 * Erger was de teller in Voorbereiding. De balk en de tekst telden alleen de 7
 * regels die het dossier blokkeren (`nodig`), terwijl de lijst eronder er 10
 * toonde. Stond alles wat blokkeert op groen, dan zei het blok "7 van de 7" met
 * een volle balk en een groene rand, met eronder een regel zonder vinkje. Een
 * teller die niet telt wat eronder staat is een teller die je niet gelooft.
 *
 * Nu is er één lijst, in drie groepen, en dezelfde regels bepalen de balk, de
 * getallen per groep en de zin erboven: wat je ziet is wat er geteld wordt.
 *
 * Puur, dus testbaar vanuit `scripts/test-unit.ts` (conventie 2).
 */
import type { ResearchStep } from "@/lib/pipeline/research-steps";
import type { Readiness, ReadinessRow } from "@/lib/pipeline/profile-readiness";

export type StatusStand = "klaar" | "bezig" | "wacht" | "leeg" | "open";

export interface StatusRegel {
  label: string;
  stand: StatusStand;
  /** Wat er gevonden is, of waarom het openstaat. Null als er niets te melden is. */
  detail: string | null;
  /** Blokkeert dit het dossier? Alleen dan telt "leeg" als ontbreekt. */
  nodig: boolean;
  /** Waar dit op het scherm of in de app staat. Null als er geen plek is om heen te gaan. */
  anchor: string | null;
}

export interface StatusGroep {
  sleutel: "onderzoek" | "dossier" | "gesprek";
  titel: string;
  uitleg: string;
  regels: StatusRegel[];
  klaar: number;
  totaal: number;
}

export interface OnboardingStatus {
  groepen: StatusGroep[];
  klaar: number;
  totaal: number;
  /** Wat het dossier blokkeert, in leesvolgorde. Leeg als het dossier compleet is. */
  nodigOpen: StatusRegel[];
  /** Wat het gesprek en de overdracht nog vragen, maar niets blokkeert. */
  optioneelOpen: StatusRegel[];
  /** Draait er nog werk? */
  loopt: boolean;
  /** Alles klaar, zonder uitzondering. Pas dan hoort er iets groens te staan. */
  allesKlaar: boolean;
}

/**
 * Welke regel van de volledigheidscheck bij welke onderzoekstaak hoort. Een taak
 * die hier niet staat (de verkenning en het marktonderzoek) heeft geen eigen
 * check en blokkeert het dossier ook niet.
 */
const STAP_NAAR_REGEL: Partial<Record<string, string>> = {
  profile_discover: "Website uitgelezen",
  profile_synthesis: "Merkdossier",
  profile_offering: "Aanbod in kaart",
  profile_llm_baseline: "Wat AI-assistenten weten",
  propose_topics: "Onderwerpen voorgesteld",
  technical_audit: "Technische controle",
};

const GESPREK_REGELS = new Set([
  "Vragen aan de klant beantwoord",
  "Pakket gekozen",
  "Merk toegewezen aan de klant",
]);

function standVanRegel(r: ReadinessRow): StatusStand {
  if (r.state === "klaar") return "klaar";
  if (r.state === "loopt") return "bezig";
  return "leeg";
}

export function buildOnboardingStatus(
  steps: ResearchStep[],
  readiness: Readiness,
): OnboardingStatus {
  const perLabel = new Map(readiness.rows.map((r) => [r.label, r]));
  const gebruikt = new Set<string>();

  const onderzoek: StatusRegel[] = steps.map((s) => {
    const gekoppeld = perLabel.get(STAP_NAAR_REGEL[s.job] ?? "");
    if (gekoppeld) gebruikt.add(gekoppeld.label);

    let stand: StatusStand =
      s.state === "klaar" ? "klaar" : s.state === "bezig" ? "bezig" : s.state === "wacht" ? "wacht" : "leeg";
    // De check kijkt naar wat er echt staat, de taak naar wat hij meldde. Zeggen
    // ze iets anders, dan wint wat er echt staat: een taak die "klaar" meldde
    // zonder dat er iets uitkwam is niet klaar, en een taak die "niets gevonden"
    // meldde terwijl het dossier het wel heeft, is het wel.
    if (gekoppeld && stand !== "bezig" && stand !== "wacht") {
      stand = gekoppeld.state === "klaar" ? "klaar" : "leeg";
    }

    return {
      label: s.label,
      stand,
      detail: (gekoppeld?.state === "klaar" ? gekoppeld.detail : null) ?? s.result,
      nodig: gekoppeld?.nodig ?? false,
      anchor: gekoppeld?.anchor ?? null,
    };
  });

  const dossier: StatusRegel[] = [];
  const gesprek: StatusRegel[] = [];
  for (const r of readiness.rows) {
    if (gebruikt.has(r.label)) continue;
    const regel: StatusRegel = {
      label: r.label,
      stand: standVanRegel(r),
      detail: r.state === "klaar" ? r.detail : null,
      nodig: r.nodig,
      anchor: r.anchor,
    };
    if (GESPREK_REGELS.has(r.label)) {
      // Voor het gesprek en de overdracht is "leeg" geen ontbrekend onderdeel
      // maar iets dat nog moet gebeuren.
      gesprek.push({ ...regel, stand: regel.stand === "klaar" ? "klaar" : "open" });
    } else {
      dossier.push(regel);
    }
  }

  const maak = (
    sleutel: StatusGroep["sleutel"],
    titel: string,
    uitleg: string,
    regels: StatusRegel[],
  ): StatusGroep => ({
    sleutel,
    titel,
    uitleg,
    regels,
    klaar: regels.filter((r) => r.stand === "klaar").length,
    totaal: regels.length,
  });

  const groepen = [
    maak("onderzoek", "Onderzoek door ORBIT ENGINE", "Wat ORBIT ENGINE zelf uitzoekt na het invoeren van de website.", onderzoek),
    maak("dossier", "Wat het dossier nodig heeft", "Wat er moet staan voordat je het gesprek in gaat.", dossier),
    maak("gesprek", "Gesprek en overdracht", "Wat na het gesprek nog moet gebeuren. Dit blokkeert het dossier niet.", gesprek),
  ].filter((g) => g.totaal > 0);

  const alle = groepen.flatMap((g) => g.regels);
  const klaar = alle.filter((r) => r.stand === "klaar").length;

  return {
    groepen,
    klaar,
    totaal: alle.length,
    nodigOpen: alle.filter((r) => r.nodig && r.stand === "leeg"),
    optioneelOpen: gesprek.filter((r) => r.stand !== "klaar"),
    loopt: alle.some((r) => r.stand === "bezig" || r.stand === "wacht"),
    allesKlaar: klaar === alle.length,
  };
}

/**
 * De zin boven de lijst. Dezelfde getallen als de balk, zodat de zin nooit iets
 * anders zegt dan wat eronder staat.
 */
export function statusZin(s: OnboardingStatus, merk: string): string {
  const stand = `${s.klaar} van de ${s.totaal} onderdelen staan klaar`;
  if (s.loopt) return `ORBIT ENGINE is nog bezig met ${merk}. ${stand}.`;
  if (s.nodigOpen.length > 0) {
    const namen = s.nodigOpen.map((r) => r.label.toLowerCase()).join(", ");
    return `${stand}. Het dossier mist nog: ${namen}. Draai het onderzoek opnieuw als dit zo blijft.`;
  }
  if (s.optioneelOpen.length > 0) {
    const n = s.optioneelOpen.length;
    return `${stand}. Het onderzoek is af. Voor het gesprek en de overdracht ${n === 1 ? "staat nog 1 punt" : `staan nog ${n} punten`} open.`;
  }
  return `Alles staat klaar. Je kunt het scherm delen en het gesprek in.`;
}
