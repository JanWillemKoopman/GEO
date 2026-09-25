import "server-only";

/**
 * L5: de PAGINASTRATEGIE (docs/tasks/contentpijplijn-publicatiewaardig.md §5 L5, WP3).
 *
 * ── WAAROM DEZE STAP ─────────────────────────────────────────────────────────
 *
 * De beslissingen die een pagina bepalen (welke onderwerpen, welke feiten, wat
 * de hoofdboodschap is) vielen tot 25 september 2026 in twee stappen van samen
 * een halve cent op het goedkoopste model: het contract en de schrijfopdracht.
 * Het contract was een verplichte checklist uit onderzoek dat niets van het
 * bedrijf weet, en de schrijfopdracht kwam erna en kon er niets uit schrappen.
 * De dure schrijver voerde alleen uit. Gevolg: de kostenpagina van de
 * installateur had twaalf secties, waarvan het contract er acht markeerde als
 * "geen uitspraak over dit bedrijf nodig" (§1.2, O1 en O5).
 *
 * Deze stap draait op Sol met denktijd hoog (werksoort `redactioneel`) en kiest
 * vooral wat er NIET op komt. Het contract komt erin als lijst van mogelijke
 * onderwerpen, niet als opdracht. De code controleert de keuzes
 * (`strategie-check.ts`) en de conflictpoort (`houdtPaginaTegen()`).
 *
 * ── TIJD ─────────────────────────────────────────────────────────────────────
 *
 * Elke aanroep legt zijn duur vast (`ai_calls.duration_ms`). Komt een
 * strategieaanroep boven de 120 seconden, dan gaan de volgende in de
 * achtergrondmodus (`lib/openai/achtergrond.ts`); de taak regelt dat.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { MODELS } from "@/lib/openai/models";
import type { StructuredCallOptions } from "@/lib/openai/structured";
import { PageStrategy } from "@/lib/schemas/page-strategy";
import type { ContentContract } from "@/lib/schemas/content-contract";
import type { ItemDossier } from "@/lib/schemas/item-dossier";
import type { VerifiedExplainer } from "@/lib/pipeline/explainer-verify";
import { laadStrategiecontext, type RecommendationInput } from "@/lib/pipeline/content";
import { redactCompetitors, containsCompetitor } from "@/lib/pipeline/redact";
import {
  controleerStrategie,
  type BetwistVoorStrategie,
  type StrategieInvoer,
} from "@/lib/pipeline/strategie-check";
import { conflictpoort } from "@/lib/pipeline/conflict-detect";
import type { FeitSoort } from "@/lib/pipeline/conflict-detect";
import { strategieUitRij, type StrategieRecord } from "@/lib/pipeline/strategie-opdracht";
export { strategieUitRij, type StrategieRecord };
import { budgetgrenzen, paginadoelVan, titelOverPlaats, VERTREKPUNT, PER_BESLISVRAAG, PER_UITLEG } from "@/lib/lengtebudget";

type Admin = SupabaseClient;

/** De soort aanroep in `ai_calls`, en de sleutel voor het achtergrondbesluit. */
export const STRATEGIE_KIND = "content_strategy";

/** Hoeveel tekst van de bestaande pagina en van de winnende antwoorden mee gaat. */
const MAX_BESTAAND = 4000;
const MAX_ANTWOORD = 1500;

const SYSTEM =
  "Je bent de eindverantwoordelijke redacteur van de website van een lokale ondernemer. Je schrijft " +
  "zelf niets; je beslist wat er op één pagina komt en vooral wat er NIET op komt, zodat een schrijver " +
  "daarna een korte, stellige pagina kan maken die de ondernemer zonder aanpassing op zijn eigen site " +
  "zet. Denk als een copywriter: het meeste werk zit in weglaten. " +
  "UITGANGSPUNTEN. " +
  "(1) Dit is de site van het bedrijf zelf, geen consumentengids. Een onderwerp dat de lezer leert " +
  "aanbieders te vergelijken, offertes na te lopen, of het bedrijf na te trekken ('vergelijk offertes', " +
  "'controleer vooraf', 'laat bevestigen') komt er niet op, tenzij het bedrijf er zelf iets concreets " +
  "over te zeggen heeft. " +
  "(2) De ONDERWERPEN hieronder uit het onderzoek zijn een lijst van mogelijkheden, geen opdracht. Het " +
  "onderzoek wist niets van dit bedrijf. Kies per onderwerp: opnemen, weglaten, of eerst vragen aan de " +
  "ondernemer. Een onderwerp komt erop als het een beslisvraag van deze lezer beantwoordt (prijs, " +
  "termijn, werkgebied, of dit bedrijf het doet), als het bewijs is dat voor deze lezer telt, of als het " +
  "een bezwaar uit het verkoopgesprek wegneemt. Algemene uitleg alleen als de lezer hem nodig heeft om " +
  "een feit te begrijpen. " +
  "(3) Een onderwerp dat op opnemen staat, rust op een feit van de FEITENKAART (F-nummer) of op vaste " +
  "vakkennis die niemand betwist. Een kernonderwerp waarover wij niets weten wordt 'eerst vragen', met " +
  "de vraag aan de ondernemer; het wordt nooit een sectie die zegt dat iets niet bekend is. " +
  "(4) ONZEKERHEID heeft drie bestemmingen. A: wij weten het niet, de ondernemer wel; dat wordt een vraag " +
  "en de pagina zwijgt erover. Dit is de standaard voor alles wat over het bedrijf gaat. B: uitleggen " +
  "aan de lezer, alleen bij een van deze redenen: geld (een prijs is een bandbreedte, één korte reden " +
  "van de spreiding), veiligheid (gas, elektra, bouwkundig), wet (vergunning, subsidievoorwaarden), " +
  "zorg, of omdat de klant het zelf zo wil; één keer, in de formulering die jij vastlegt. C: weglaten, " +
  "niet relevant genoeg. NOOIT een voorbehoud direct na een bewijsstuk ('35 jaar ervaring, maar dat " +
  "zegt op zichzelf niets'), nooit een zin over wat wij niet weten ('is niet vastgelegd', 'de " +
  "beschikbare informatie'), nooit een voorbehoud dat een belofte van de site omdraait. " +
  "(5) PRIORITEITSFEITEN: drie tot zes F-nummers die deze pagina dragen, elk met wat het voor deze lezer " +
  "betekent. Bewijs wordt stellig gebracht. Een feit dat vooral op een andere pagina thuishoort, zet je " +
  "bij de uitgesloten feiten met reden 'elders gedekt'. " +
  "(6) BETWISTE FEITEN (B-nummers) mag je niet kiezen. Kan een onderwerp echt niet zonder zo'n feit, " +
  "noem het B-nummer dan bij dat onderwerp onder wachtOpConflict. " +
  "(7) LENGTE volgt uit de inhoud. Je krijgt het vertrekpunt en het plafond; reken met ongeveer " +
  `${PER_BESLISVRAAG} woorden per extra beslisvraag met een feit en ${PER_UITLEG} per nodige uitleg, ` +
  "en trek af wat de bestaande site al goed zegt. Boven het plafond alleen met een reden. Korter is " +
  "geen verlies: een AI-assistent citeert een korte, stellige zin. " +
  "(8) Het OPENINGSANTWOORD beantwoordt de hoofdvraag in hoogstens twee zinnen, met een concreet feit. " +
  "De OPROEP is wat de lezer moet doen, in de woorden van dit bedrijf. " +
  "Gebruik geen gedachtestreepjes en geen schuine streep tussen twee woorden. Antwoord in het Nederlands.";

export interface StrategieVoorbereiding {
  system: string;
  user: string;
  controle: StrategieInvoer;
  overPlaats: boolean;
  overDienst: boolean;
  invoerSleutel: string;
  pieceId: string | null;
  analysisId: string;
  profileId: string;
  /** F-nummer naar feit-id van de kaart die de strategie kreeg. */
  feitIds: Record<string, string | null>;
  /** De bruikbare feiten met tekst, voor de FAQ-selectie (WP7). */
  kaart: { ref: string; text: string }[];
  /** De kandidaatvragen voor de FAQ, per bron (WP7, §11). */
  faqBronnen: { bezwaar: string[]; gemeten: string[]; vervolgvraag: string[]; dossier: string[] };
  /** Een al opgeslagen strategie op precies deze invoer (conventie 9). */
  bestaand: StrategieRecord | null;
}

/** Een korte, stabiele vingerafdruk (FNV-1a), genoeg om "zelfde invoer" te herkennen. */
export function vingerafdruk(tekst: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Alles klaarzetten: de context van de schrijver, het register, de open
 * conflicten, de grenzen, en de twee opdrachten. Doet zelf geen zware aanroep.
 */
export async function bereidStrategieVoor(
  admin: Admin,
  args: {
    analysisId: string;
    userId: string;
    recommendation: RecommendationInput;
    voorbereid: {
      contract: ContentContract | null;
      dossier: ItemDossier | null;
      explainers: VerifiedExplainer[];
      existingText?: string | null;
      existingFetchedAt?: string | null;
    } | null;
  },
): Promise<StrategieVoorbereiding> {
  const { analysisId, userId, recommendation } = args;
  const ctx = await laadStrategiecontext(admin, analysisId, userId, recommendation, args.voorbereid);
  const profileId = ctx.analysis.profile_id;

  const { data: pieceRow } = await admin
    .from("content_pieces")
    .select("id, strategy_json, quality_json")
    .eq("analysis_id", analysisId)
    .eq("title", recommendation.title)
    .eq("is_current", true)
    .maybeSingle();

  // ── Het register: soort en bewijskracht per feit op de kaart ──────────────
  const bruikbaar = ctx.facts.filter((f) => f.allowed && f.citable);
  const ids = bruikbaar.map((f) => f.id).filter((id): id is string => Boolean(id));
  const { data: registerRijen } = ids.length
    ? await admin.from("brand_facts").select("id, soort, bewijskracht, geldt_voor").in("id", ids)
    : { data: [] };
  const register = new Map(
    ((registerRijen ?? []) as { id: string; soort: string | null; bewijskracht: string | null; geldt_voor: string | null }[]).map(
      (r) => [r.id, r],
    ),
  );

  // ── De open conflicten, met B-nummers ──────────────────────────────────────
  const { data: conflictRijen } = await admin
    .from("fact_conflicts")
    .select("id, feit_ids, soort")
    .eq("profile_id", profileId)
    .eq("echt_conflict", true)
    .in("status", ["open", "gevraagd"]);
  const conflicten = (conflictRijen ?? []) as { id: string; feit_ids: string[]; soort: string }[];
  const conflictFeitIds = Array.from(new Set(conflicten.flatMap((c) => c.feit_ids)));
  const { data: conflictFeiten } = conflictFeitIds.length
    ? await admin.from("brand_facts").select("id, text").in("id", conflictFeitIds)
    : { data: [] };
  const tekstVan = new Map(((conflictFeiten ?? []) as { id: string; text: string }[]).map((f) => [f.id, f.text]));
  const betwist: BetwistVoorStrategie[] = conflicten.map((c, i) => ({
    ref: `B${i + 1}`,
    conflictId: c.id,
    feitIds: c.feit_ids,
    soort: c.soort,
  }));

  // ── Grenzen voor de lengte ─────────────────────────────────────────────────
  const plaatsen = ctx.profile?.service_regions ?? [];
  const overPlaats = titelOverPlaats(recommendation.title, plaatsen);
  const overDienst = recommendation.type === "landing" && !overPlaats;
  const doel = paginadoelVan(recommendation.type, overPlaats);
  const grenzen = budgetgrenzen(doel);

  const kaartRegels = bruikbaar.map((f) => {
    const r = f.id ? register.get(f.id) : undefined;
    const kenmerken = [
      r?.soort ? `soort: ${r.soort}` : null,
      r?.bewijskracht === "sterk" ? "STERK BEWIJS" : null,
      r?.geldt_voor ? `geldt voor: ${r.geldt_voor}` : null,
      f.source.startsWith("klant") || f.source.includes("gesprek") ? "van de ondernemer zelf" : null,
    ].filter(Boolean);
    return `${f.ref}  ${f.text}${kenmerken.length ? `   (${kenmerken.join("; ")})` : ""}`;
  });

  const contract = ctx.contract;
  const dossier = ctx.dossier;
  const antwoorden = ctx.winningAnswers
    .map((a) => redactCompetitors(a, ctx.competitors).slice(0, MAX_ANTWOORD))
    .filter((a) => a.trim() && !containsCompetitor(a, ctx.competitors))
    .slice(0, 2);
  const bestaandeTekst = (ctx.existing.text ?? ctx.existing.page?.text_excerpt ?? "").slice(0, MAX_BESTAAND);

  const user = [
    `BEDRIJF: ${ctx.brandName}`,
    `Branche: ${ctx.profile?.industry ?? "onbekend"}`,
    `Toon van het bedrijf: ${ctx.profile?.tone_of_voice ?? "onbekend"}. Aanspreekvorm: ${ctx.profile?.pronoun_preference ?? "onbekend"}.`,
    ctx.profile?.sales_objections?.length
      ? `BEZWAREN UIT HET VERKOOPGESPREK:\n- ${ctx.profile.sales_objections.join("\n- ")}`
      : "",
    ctx.strategyNote?.trim() ? `ACTUELE SITUATIE VAN HET BEDRIJF: ${ctx.strategyNote.trim()}` : "",
    "",
    `DE PAGINA: "${recommendation.title}" (type: ${recommendation.type})`,
    `Doel volgens het rapport: ${recommendation.targetIntent}`,
    `Waarom deze pagina: ${recommendation.why}`,
    recommendation.revisionNote?.trim()
      ? `WAT DE KLANT VOOR DEZE VERSIE VRAAGT (weegt het zwaarst): ${recommendation.revisionNote.trim()}`
      : "",
    ctx.targets.length
      ? `DOELVRAGEN waarop een AI-assistent dit bedrijf nu niet noemt:\n- ${ctx.targets.map((t) => t.text).join("\n- ")}`
      : "",
    antwoorden.length
      ? `WAT DE AI NU ANTWOORDT (bedrijfsnamen weggehaald):\n${antwoorden.map((a, i) => `--- ${i + 1} ---\n${a}`).join("\n")}`
      : "",
    "",
    "FEITENKAART (de enige feiten over dit bedrijf die op de pagina mogen):",
    ...(kaartRegels.length ? kaartRegels : ["(leeg)"]),
    betwist.length
      ? "\nBETWISTE FEITEN (twee versies die niet allebei waar kunnen zijn; niet kiezen):\n" +
        betwist
          .map((b) => `${b.ref} (${b.soort}): ${b.feitIds.map((id) => `"${tekstVan.get(id) ?? "?"}"`).join(" tegenover ")}`)
          .join("\n")
      : "",
    "",
    contract
      ? "MOGELIJKE ONDERWERPEN uit het onderzoek (geen opdracht; het onderzoek wist niets van dit bedrijf):\n" +
        contract.sections
          .map(
            (s) =>
              `- ${s.heading}: ${s.subQuestion} [${s.importance}${s.needsBrandFact ? ", vraagt een uitspraak over dit bedrijf" : ", algemene uitleg"}]`,
          )
          .join("\n") +
        (contract.faqQuestions.length ? `\nMogelijke vragen voor een FAQ: ${contract.faqQuestions.join(" | ")}` : "")
      : "",
    dossier
      ? `\nWAT EEN LEZER VRAAGT (onderzoek):\n- ${dossier.subQuestions.map((q) => q.question).join("\n- ")}` +
        (dossier.followUps.length ? `\nVervolgvragen: ${dossier.followUps.join(" | ")}` : "") +
        (dossier.concerns.length ? `\nTwijfels: ${dossier.concerns.join(" | ")}` : "")
      : "",
    bestaandeTekst
      ? `\nDE HUIDIGE PAGINA OP DE SITE (materiaal; wat hier al goed staat hoeft niet opnieuw uitgelegd):\n"""\n${bestaandeTekst}\n"""`
      : "",
    "",
    `LENGTE: vertrekpunt voor een ${doel === "lokaal" ? "lokale landingspagina" : doel === "dienst" ? "dienstpagina" : doel === "uitleg" ? "uitlegartikel" : doel === "vergelijking" ? "vergelijking" : "FAQ-pagina"} ` +
      `is ${VERTREKPUNT[doel].min} tot ${VERTREKPUNT[doel].max} woorden; het plafond zonder reden is ${grenzen.plafond}.`,
  ]
    .filter((r) => r !== "")
    .join("\n");

  const invoerSleutel = vingerafdruk(
    JSON.stringify({
      t: recommendation.title,
      y: recommendation.type,
      n: recommendation.revisionNote ?? null,
      k: kaartRegels,
      b: betwist.map((b) => b.feitIds),
      c: contract?.sections.map((s) => s.heading) ?? [],
    }),
  );

  return {
    system: SYSTEM,
    user,
    controle: { kaartRefs: bruikbaar.map((f) => f.ref), betwist, grenzen },
    overPlaats,
    overDienst,
    invoerSleutel,
    pieceId: (pieceRow as { id: string } | null)?.id ?? null,
    analysisId,
    profileId,
    feitIds: feitIdsVan(bruikbaar),
    kaart: bruikbaar.map((f) => ({ ref: f.ref, text: f.text })),
    faqBronnen: {
      bezwaar: ctx.profile?.sales_objections ?? [],
      gemeten: ctx.targets.map((t) => t.text),
      // Wat een lezer volgens de vorige keuring nog overhield (§11): een vraag
      // die de vorige versie open liet, is de beste kandidaat na een bezwaar.
      vervolgvraag:
        ((pieceRow as { quality_json?: { panel?: { citability?: { remainingReaderQuestions?: string[] } } } } | null)
          ?.quality_json?.panel?.citability?.remainingReaderQuestions ?? []),
      dossier: [...(dossier?.followUps ?? []), ...(contract?.faqQuestions ?? [])],
    },
    bestaand: (() => {
      const r = strategieUitRij((pieceRow as { strategy_json: unknown } | null)?.strategy_json);
      return r && r.invoerSleutel === invoerSleutel ? r : null;
    })(),
  };
}

/** De opties voor de aanroep, gedeeld door de directe en de achtergrondroute. */
export function strategieOpties(v: Omit<StrategieVoorbereiding, "bestaand">): StructuredCallOptions<PageStrategy> {
  return {
    model: MODELS.content,
    system: v.system,
    user: v.user,
    schema: PageStrategy,
    schemaName: "page_strategy",
    webSearch: false,
    work: "redactioneel",
    meta: {
      kind: STRATEGIE_KIND,
      analysisId: v.analysisId,
      profileId: v.profileId,
      contentPieceId: v.pieceId,
    },
  };
}

/**
 * De uitkomst van het model narekenen, de conflictpoort toepassen en het
 * record opbouwen. Schrijft zelf niets weg.
 */
export function verwerkStrategie(
  v: Pick<StrategieVoorbereiding, "controle" | "overPlaats" | "overDienst" | "invoerSleutel">,
  ruw: PageStrategy,
  extra: { duurMs: number | null; achtergrond: boolean; feitIds: Record<string, string | null> },
): StrategieRecord {
  const gecontroleerd = controleerStrategie(ruw, v.controle);
  const perRef = new Map(v.controle.betwist.map((b) => [b.ref, b]));
  const idsVan = (refs: string[]) => new Set(refs.flatMap((r) => perRef.get(r)?.feitIds ?? []));

  const tegen = conflictpoort(
    v.controle.betwist.map((b) => ({ ...b, soort: b.soort as FeitSoort })),
    {
      prioriteitsFeitIds: idsVan(gecontroleerd.prioriteitBetwist),
      benodigdeFeitIds: idsVan(gecontroleerd.benodigdBetwist),
      overPlaats: v.overPlaats,
      overDienst: v.overDienst,
      isProductpagina: false,
    },
  );

  return {
    versie: 1,
    invoerSleutel: v.invoerSleutel,
    strategie: gecontroleerd.strategie,
    ruw,
    correcties: gecontroleerd.correcties,
    waarschuwingen: gecontroleerd.waarschuwingen,
    vragenAanOndernemer: gecontroleerd.vragenAanOndernemer,
    feitIds: extra.feitIds,
    model: MODELS.content,
    duurMs: extra.duurMs,
    achtergrond: extra.achtergrond,
    gemaaktOp: new Date().toISOString(),
    tegengehouden: tegen.map((c) => ({ conflictId: c.conflictId, soort: c.soort, ref: c.ref })),
  };
}

/** F-nummer naar feit-id, uit de kaart die de strategie kreeg. */
export function feitIdsVan(facts: { ref: string; id?: string | null }[]): Record<string, string | null> {
  return Object.fromEntries(facts.map((f) => [f.ref, f.id ?? null]));
}
