/**
 * Wat moet er opnieuw draaien na het gesprek? (onboarding 3.0, fase 4)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Zonder deze stap is de onboardingsessie een archief. De consultant legt vast
 * dat het merk landelijk werkt in plaats van lokaal, en de vragen die de meting
 * straks stelt zijn nog steeds gegenereerd op de gok van het model. Het gesprek
 * verandert dan wel het dossier maar niet de uitkomst.
 *
 * ── WAAROM NIET GEWOON ALLES OPNIEUW ────────────────────────────────────────
 *
 * Een volledige onboarding kost ongeveer $0,25 en duurt ruim zeven minuten, en
 * de meting daarna is met ~$0,86 de duurste stap van het hele product. "Draai
 * alles opnieuw" na elk gesprek is dus een knop die geld kost voor werk dat
 * niets nieuws oplevert: van de vijftien velden uit migratie 0060 veranderen er
 * acht helemaal niets aan wat er te onderzoeken valt.
 *
 * Deze module rekent per gewijzigd veld uit welke stappen er écht anders van
 * worden. Puur, dus testbaar zonder database (conventie 2), en het is de
 * rekenkern onder het afrondblok van de sessie.
 */
import { formatUsd } from "@/lib/format";

/** De stappen die een gesprek opnieuw kan laten draaien. */
export type RefreshTask =
  /** De vragen die de meting stelt. Per analyse, per funnelfase. */
  | "prompts"
  /** Wat AI-assistenten al over dit merk weten. */
  | "kennistest"
  /** De onderwerpen waarop dit merk zichtbaar moet zijn. */
  | "onderwerpen"
  /** Het marktonderzoek: waarom winnen die concurrenten? */
  | "markt";

/**
 * Welk veld raakt welke stap.
 *
 * ⚠️ Elk veld staat hier, óók de velden waar nul stappen uit volgen. Dat is geen
 * volledigheidsdwang maar het punt van de tabel: een veld dat er niet in staat
 * is een veld waarvan niemand heeft nagedacht of hij iets moet triggeren, en dat
 * merk je pas als er een dure stap onnodig draait, of juist niet draait.
 */
export const FIELD_TASKS: Record<string, RefreshTask[]> = {
  // ── Het bereik stuurt de vraagstelling zelf ──────────────────────────────
  // `prompts.ts` zet de regel "dit is een lokaal bedrijf, verwerk de plaatsnaam
  // in een deel van de vragen" alleen neer als bereik én regio gevuld zijn, en
  // `llm-baseline.ts` plakt `service_regions[0]` letterlijk in zes vragen.
  // Verandert dit, dan meet de volgende ronde iets anders dan bedoeld.
  service_scope: ["prompts", "kennistest"],
  service_regions: ["prompts", "kennistest"],
  growth_regions: ["prompts", "kennistest"],

  // ── Wat commercieel voorop staat, stuurt de onderwerpen ──────────────────
  priority_offerings: ["onderwerpen"],
  deprioritised_offerings: ["onderwerpen"],
  target_segments: ["onderwerpen"],
  forbidden_topics: ["onderwerpen"],

  // ── De concurrenten sturen het marktonderzoek ────────────────────────────
  competitors: ["markt"],

  // ── En deze veranderen niets aan wat er te ONDERZOEKEN valt ──────────────
  //
  // Ze worden pas gelezen bij de volgende meting, briefing of contentronde, en
  // een herdraai van de onboarding levert er niets voor op. Ze staan hier
  // expliciet op nul in plaats van te ontbreken, zodat de test kan vaststellen
  // dat dat een keuze was.
  name_exclusions: [], // gelezen door de vermeldingsclassificatie, bij de meting
  offline_proof: [], // gelezen door de feitenbank, bij het schrijven
  sales_objections: [], // gelezen door de briefing en de schrijfprompt
  goal_12m: [], // gelezen door het contentplan en het rapport
  deal_value_band: [], // weegt mee in de potentiescore, bij het plannen
  seasonality: [], // bepaalt de volgorde van het plan, niet het onderzoek
  respect_site_structure: [], // gelezen door de structuuranalyse, bij het advies
  contact_name: [],
  contact_email: [],
  contact_phone: [],
};

/**
 * Wat elke stap ongeveer kost, in dollars.
 *
 * Nagerekend op de drie onboardings van 3 en 4 augustus 2026 (`logbook.md` §14)
 * en de meetrondes in `ai_calls` (`architecture.md` §6). Bewust een ruwe
 * bovengrens: een raming die te laag uitvalt is erger dan een die te hoog
 * uitvalt, want de eerste maakt van een bevestiging een verrassing.
 */
const KOSTEN: Record<RefreshTask, number> = {
  // Drie funnelfases, elk een eigen aanroep zonder zoekfunctie. Per analyse.
  prompts: 0.02,
  // De duurste stap van de onboarding: acht korte aanroepen, waarvan vijf met
  // zoekfunctie.
  kennistest: 0.05,
  onderwerpen: 0.01,
  markt: 0.03,
};

/** In welke volgorde de stappen getoond en ingepland worden. */
const VOLGORDE: RefreshTask[] = ["onderwerpen", "markt", "prompts", "kennistest"];

/** Wat de consultant leest als hij de knop indrukt. Geen taaknamen. */
export const TASK_LABELS: Record<RefreshTask, string> = {
  prompts: "de vragen die ORBIT ENGINE aan de AI-assistenten stelt",
  kennistest: "de test wat AI-assistenten al over dit merk weten",
  onderwerpen: "de onderwerpen waarop dit merk zichtbaar moet zijn",
  markt: "het onderzoek naar de concurrenten",
};

export interface RefreshPlan {
  tasks: RefreshTask[];
  /** Ruwe bovengrens in dollars. Hoort in het bevestigvenster, niet op het scherm. */
  estimateUsd: number;
  /** Per stap welke gewijzigde velden hem veroorzaken. */
  because: Record<string, string[]>;
}

/**
 * Welke stappen volgen uit deze wijzigingen?
 *
 * `analyses` is het aantal analyses waarvan de vragen opnieuw gegenereerd
 * kunnen worden. Nul betekent dat er niets te hergenereren valt, en dan hoort de
 * promptstap er ook niet in te staan: een knop die een stap inplant die nergens
 * op slaat, is erger dan geen knop.
 */
export function planRefresh(
  changedFields: string[],
  options: { analyses?: number } = {},
): RefreshPlan {
  const analyses = options.analyses ?? 0;
  const because: Record<string, string[]> = {};

  for (const veld of changedFields) {
    for (const taak of FIELD_TASKS[veld] ?? []) {
      (because[taak] ??= []).push(veld);
    }
  }

  let tasks = VOLGORDE.filter((t) => because[t]);
  if (analyses === 0) {
    tasks = tasks.filter((t) => t !== "prompts");
    delete because.prompts;
  }

  const estimateUsd = tasks.reduce(
    (som, t) => som + KOSTEN[t] * (t === "prompts" ? Math.max(analyses, 1) : 1),
    0,
  );

  return { tasks, estimateUsd, because };
}

/**
 * De twee zinnen voor het bevestigvenster: wat er opnieuw draait, en wat dat
 * kost. Twee velden en niet één samengestelde zin, sinds 24 augustus 2026: het
 * venster was een kaal `window.confirm()` met alles op één regel, "Doorgaan?"
 * incluis. `ConfirmDialog` draagt zelf al een apart blokje voor wat je niet
 * terug kunt draaien (`irreversible`, zie `components/confirm-dialog.tsx`);
 * `body` gaat naar de lopende tekst van het venster, `cost` naar dat blokje.
 *
 * ⚠️ Staat hier en niet in het scherm zelf, en dat is de reden dat deze functie
 * bestaat: de sessiepagina wordt met de klant gedeeld en er mag geen bedrag in
 * beeld staan. Het bedrag hoort in het venster dat pas verschijnt als de
 * consultant op de knop drukt.
 */
export function refreshConfirmation(plan: RefreshPlan): { body: string; cost: string | null } {
  if (plan.tasks.length === 0) {
    return { body: "Er is niets veranderd waar het onderzoek anders van wordt.", cost: null };
  }
  const lijst = plan.tasks.map((t) => TASK_LABELS[t]).join(", ");
  return {
    body: `ORBIT ENGINE werkt dit opnieuw uit: ${lijst}.`,
    cost: `Geschatte kosten: hooguit ${formatUsd(plan.estimateUsd)}. Zodra je bevestigt, gaat ORBIT ENGINE direct aan de slag.`,
  };
}
