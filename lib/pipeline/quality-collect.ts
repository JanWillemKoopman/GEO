/**
 * Van NEGEN LOSSE UITKOMSTEN naar één gestructureerd oordeel
 * (docs/tasks/contentkwaliteit-framework.md §4.3)
 *
 * ── WAT HIER GEBEURT ────────────────────────────────────────────────────────
 *
 * Vier beoordelaars en tien deterministische controles leveren elk hun eigen
 * vorm: booleans, percentages, zinnen, lijsten van zinnen. Tot nu toe werden die
 * allemaal tot `string[]` platgeslagen en op één hoop in `review_notes` gegooid,
 * 45 tot 96 regels per pagina. Deze module doet het omgekeerde: hij tilt elke
 * uitkomst naar hetzelfde type (`QualityIssue`) en leidt er per dimensie een
 * cijfer uit af.
 *
 * ── WAAROM DIT PUUR IS ──────────────────────────────────────────────────────
 *
 * Er zit geen database en geen netwerk in: de aanroeper voert de controles uit,
 * deze module weegt ze. Dat maakt de hele vertaling van "vijf checks gefaald" naar
 * "structuur: 37" testbaar vanuit `scripts/test-unit.ts` (conventie 2), en dat is
 * nodig, want dit is de plek waar een verkeerd cijfer ontstaat zonder dat iemand
 * het merkt.
 *
 * ── DE VERDELING TUSSEN MODEL EN CODE ───────────────────────────────────────
 *
 * Elke deterministische bevinding krijgt zekerheid 1 (`ZEKER`): die telt, hij
 * oordeelt niet. Elke AI-bevinding krijgt 0,7 (`MODELOORDEEL`). Zonder dat
 * onderscheid weegt "het model vond de toon te formeel" even zwaar als "er staat
 * letterlijk een verboden woord in de tekst", en dan repareert de volgende ronde
 * het verkeerde probleem.
 */
import type { Critique } from "@/lib/schemas/critique";
import { GEO_CRITERIA_LABELS } from "@/lib/schemas/critique";
import type { CitabilityVerdict, FactualityVerdict } from "@/lib/schemas/content-panel";
import type { CraftVerdict } from "@/lib/schemas/content-craft";
import type { BewijspuntenResult } from "@/lib/pipeline/bewijspunten";
import type { OpdrachtResult } from "@/lib/schrijfopdracht";
import type { KlantcitatenResult } from "@/lib/pipeline/klantcitaten";
import type {
  MerkstemResult,
  OpeningResult,
  VraagkoppenResult,
} from "@/lib/pipeline/paginavorm";
import type { AdviestoonResult, ZelfondermijningResult } from "@/lib/pipeline/adviestoon";
import type { FaqResult } from "@/lib/pipeline/faqblokken";
import type { HerhalingResult } from "@/lib/pipeline/similarity";
import type {
  AanspreekvormResult,
  AdresResult,
  GateResult,
  QualityResult,
  SourceTalkResult,
  TabooCheckResult,
} from "@/lib/pipeline/content-gate";
import { GATE_LABELS, GATE_UITLEG } from "@/lib/pipeline/content-gate";
import type { CoverageResult } from "@/lib/pipeline/content-coverage";
import type { ClaimDekking, GewogenDekking } from "@/lib/pipeline/evidence-weight";
import type { ContentQualityProfile, TypeRegel } from "@/lib/pipeline/quality-profile";
import type { DimensionScores } from "@/lib/pipeline/quality-score";
import { faseVanIssue } from "@/lib/pipeline/root-cause";
import {
  MODELOORDEEL,
  ZEKER,
  type QualityIssue,
  type Severity,
} from "@/lib/pipeline/quality-issue";
import { bewijsDimensie } from "@/lib/pipeline/evidence-weight";

/** Alles wat er over één versie van één pagina bekend is. */
export interface KwaliteitsInvoer {
  profiel: ContentQualityProfile;

  /** De vier beoordelaars. `null` = deze beoordelaar is uitgevallen. */
  critique: Critique | null;
  factuality: FactualityVerdict | null;
  citability: CitabilityVerdict | null;
  craft: CraftVerdict | null;

  /** De deterministische controles. */
  gate: GateResult;
  coverage: CoverageResult;
  quality: QualityResult;
  bronpraat: SourceTalkResult;
  /** V2: spreekt de pagina de lezer overal hetzelfde aan? */
  aanspreekvorm?: AanspreekvormResult;
  /** V5: negeert de pagina een instructie die de klant zelf gaf? */
  adres?: AdresResult;
  /** V9: is een feit omgezet naar een argument voor de lezer? */
  bewijspunten?: BewijspuntenResult;
  /** Is de schrijfopdracht uitgevoerd? (optimalisatie 5 en 6, migratie 0094) */
  schrijfopdracht?: OpdrachtResult;
  /** V4: is er iets van de eigen woorden van de ondernemer blijven staan? */
  klantcitaten?: KlantcitatenResult;
  /** V8: begint de pagina bij de lezer of bij het bedrijf? */
  opening?: OpeningResult;
  /** V1: spreekt het bedrijf ergens zelf op zijn eigen pagina? */
  merkstem?: MerkstemResult;
  /** V10: is dit een verhaal of een vragenlijst? */
  vraagkoppen?: VraagkoppenResult;
  /** V6: geeft de pagina huiswerk in plaats van antwoord? */
  adviestoon?: AdviestoonResult;
  /** Herhaalt de FAQ onderaan de tekst erboven? (optimalisatie 9) */
  faqBlokken?: FaqResult;
  /** V6: stuurt de pagina de bezoeker weg om de klant te controleren? */
  zelfondermijning?: ZelfondermijningResult;
  /** V12: staat op elke pagina van deze ronde hetzelfde rijtje feiten? */
  herhaling?: HerhalingResult;
  taboo: TabooCheckResult;
  verbodenOnderwerpen: TabooCheckResult;
  typeOvertredingen: TypeRegel[];

  /** De bewijskant. */
  dekking: GewogenDekking;
  /**
   * De dekking van de BEWERINGEN uit de claim-audit (R1, 3 september 2026).
   *
   * `null` bij een pagina zonder claim-audit (een pagina van vóór R5.1, of een
   * pagina waarvan de briefing niet gedraaid heeft). Dan telt hij nergens in mee
   * en verandert er niets aan het oordeel (conventie 3).
   */
  claimDekking: ClaimDekking | null;
  /** Welk deel van de beweringen in de tekst herleidbaar is (`sourceCoverage`). */
  bronherleidbaarheid: number | null;
  /** Beweringen die het model deed en die geen bestaand feit dekt. */
  onbewezenBeweringen: { claim: string }[];
  /** Zinnen die iets over het bedrijf zeggen zonder dat het model ze aanmeldde. */
  ongetagdeZinnen: { sentence: string }[];
  /** Staat er een concurrent bij naam in de tekst? Deterministisch vastgesteld. */
  concurrentGenoemd: string | null;

  /** Context voor de root-cause-toewijzing. */
  contractAanwezig: boolean;
  /** Lag er bewijs voor deze pagina, of was de feitenkaart leeg? */
  bewijsAanwezig: boolean;
}

export interface KwaliteitsUitkomst {
  issues: QualityIssue[];
  dimensies: DimensionScores;
  /** Hoeveel beoordelaars er gevraagd zijn en hoeveel er antwoord gaven. */
  beoordelaars: { geslaagd: number; gevraagd: number };
}

/** Bouwt één bevinding, met de root-cause-toewijzing er meteen in. */
function maak(
  invoer: KwaliteitsInvoer,
  velden: Omit<QualityIssue, "phase">,
): QualityIssue {
  return {
    ...velden,
    phase: faseVanIssue(velden, {
      bewijsAanwezig: invoer.bewijsAanwezig,
      contractAanwezig: invoer.contractAanwezig,
    }),
  };
}

/** Percentage van de uitgevoerde controles dat slaagde. `null` = niets te toetsen. */
function deelGeslaagd(waarden: readonly (boolean | null)[]): number | null {
  const uitvoerbaar = waarden.filter((w) => w !== null) as boolean[];
  if (uitvoerbaar.length === 0) return null;
  return Math.round((uitvoerbaar.filter(Boolean).length / uitvoerbaar.length) * 1000) / 10;
}

/**
 * Twee cijfers samenvoegen tot één dimensie.
 *
 * Ontbreekt er één, dan telt de ander volledig: onbekend is geen nul
 * (conventie 3). Ontbreken ze allebei, dan is de dimensie `null` en verlaagt hij
 * de zekerheid in plaats van de score.
 */
function combineer(
  delen: readonly { waarde: number | null; gewicht: number }[],
): number | null {
  const bruikbaar = delen.filter((d) => d.waarde !== null && Number.isFinite(d.waarde));
  if (bruikbaar.length === 0) return null;
  const som = bruikbaar.reduce((t, d) => t + (d.waarde as number) * d.gewicht, 0);
  const gewicht = bruikbaar.reduce((t, d) => t + d.gewicht, 0);
  return Math.round((som / gewicht) * 10) / 10;
}

/**
 * Alle uitkomsten van één versie tot bevindingen en dimensiescores.
 *
 * De volgorde waarin de bronnen langskomen is de volgorde waarin ze in het
 * adviseursscherm staan: eerst wat blokkeert, dan wat het cijfer bepaalt, dan de
 * losse verbeterpunten.
 */
export function verzamelKwaliteit(invoer: KwaliteitsInvoer): KwaliteitsUitkomst {
  const issues: QualityIssue[] = [];

  // ══ 1. De harde regels: dit blokkeert ═════════════════════════════════════

  for (const woord of invoer.taboo.found) {
    issues.push(
      maak(invoer, {
        dimension: "feitelijkheid",
        severity: "blokkerend",
        section: null,
        finding: `De pagina bevat een woord dat je hebt uitgesloten: "${woord}".`,
        evidence: woord,
        expected: "Dit woord komt nergens in de tekst voor.",
        recommendation: `Verwijder "${woord}" of formuleer het anders.`,
        blocking: true,
        confidence: ZEKER,
        bron: "verboden_woord",
      }),
    );
  }

  for (const onderwerp of invoer.verbodenOnderwerpen.found) {
    issues.push(
      maak(invoer, {
        dimension: "feitelijkheid",
        severity: "blokkerend",
        section: null,
        finding: `De pagina gaat in op een onderwerp dat je hebt uitgesloten: "${onderwerp}".`,
        evidence: onderwerp,
        expected: "Dit onderwerp komt op deze pagina niet voor.",
        recommendation: "Haal dit deel eruit.",
        blocking: true,
        confidence: ZEKER,
        bron: "verboden_onderwerp",
      }),
    );
  }

  if (invoer.concurrentGenoemd) {
    issues.push(
      maak(invoer, {
        dimension: "feitelijkheid",
        severity: "blokkerend",
        section: null,
        finding: `Er staat een ander bedrijf bij naam in de tekst: "${invoer.concurrentGenoemd}".`,
        evidence: invoer.concurrentGenoemd,
        expected: "Op de eigen site van een ondernemer staat geen enkele concurrent bij naam.",
        recommendation: "Haal de naam weg en beschrijf het algemeen.",
        blocking: true,
        confidence: ZEKER,
        bron: "feitelijkheid",
      }),
    );
  }

  // De kernsecties zonder bewijs. Dit is de blokkade die de opdracht in §15
  // beschrijft: 91 punten en tóch niet publiceren.
  for (const sectie of invoer.dekking.ongedekteKern) {
    issues.push(
      maak(invoer, {
        dimension: "bewijs",
        severity: "blokkerend",
        section: sectie.heading,
        finding: `Deze sectie draagt de pagina en we kunnen hem niet onderbouwen.`,
        evidence: null,
        expected: sectie.subQuestion
          ? `Een antwoord op: "${sectie.subQuestion}", met een bevestigd feit erachter.`
          : null,
        recommendation:
          "Beantwoord de vraag hierover, of laat deze sectie vervallen. Herschrijven helpt hier niet.",
        blocking: true,
        confidence: ZEKER,
        bron: "bewijsdekking",
      }),
    );
  }

  // ── De KERNBEWERINGEN zonder bewijs (R1) ─────────────────────────────────
  //
  // Naast de kernSECTIE hierboven, en dat is geen dubbeling. Een sectie is een
  // stuk van de pagina; een bewering is wat die pagina waarmaakt. Een
  // kernbewering die aan géén enkele sectie hangt, glipte tot 3 september 2026
  // langs elke poort: de claim-audit wist dat hij onbewezen was, maar dat
  // gegeven bereikte de kwaliteitspoort nooit.
  //
  // ⚠️ Alleen `kern` én `bedrijfsspecifiek` komt hier terecht
  // (`berekenClaimDekking`). Algemene vakkennis blokkeert niets, want daar hoeft
  // de ondernemer niets voor aan te leveren.
  for (const claim of invoer.claimDekking?.kritiekOnbewezen ?? []) {
    issues.push(
      maak(invoer, {
        dimension: "bewijs",
        severity: "blokkerend",
        section: null,
        finding: `Deze pagina leunt op een bewering die we niet kunnen onderbouwen: "${claim.claim}".`,
        evidence: claim.neededFor ? `nodig voor: ${claim.neededFor}` : null,
        expected: "Een bevestigd feit dat deze bewering dekt, of de bewering weglaten.",
        recommendation:
          claim.questionIfMissing?.trim()
            ? `Beantwoord deze vraag: "${claim.questionIfMissing.trim()}"`
            : "Onderbouw hem, of haal hem uit de pagina.",
        blocking: true,
        confidence: ZEKER,
        bron: "bewijsdekking",
      }),
    );
  }

  // Een duplicaat blokkeert: twee pagina's die hetzelfde zeggen, kannibaliseren
  // elkaar, en de tweede voegt niets toe aan de zichtbaarheid.
  if (invoer.quality.checks.nietDubbel === false) {
    issues.push(
      maak(invoer, {
        dimension: "originaliteit",
        severity: "blokkerend",
        section: null,
        finding:
          invoer.quality.issues[0] ??
          "Deze tekst lijkt te veel op een pagina die je al hebt.",
        evidence:
          invoer.quality.gemeten.gelijkenisMet !== null
            ? `${Math.round((invoer.quality.gemeten.gelijkenis ?? 0) * 100)}% overlap met "${invoer.quality.gemeten.gelijkenisMet}"`
            : null,
        expected: "Deze pagina zegt iets wat de bestaande pagina niet zegt.",
        recommendation:
          "Scherp het onderwerp aan zodat deze pagina een andere vraag beantwoordt dan de bestaande.",
        blocking: true,
        confidence: ZEKER,
        bron: "kwaliteitspoort",
      }),
    );
  }

  // Een bewerende zin over het bedrijf zonder enige bron. Dit is de categorie
  // waarin beide fabricages van 31 juli aan élke controle ontsnapten.
  for (const zin of invoer.ongetagdeZinnen.slice(0, 5)) {
    issues.push(
      maak(invoer, {
        dimension: "feitelijkheid",
        severity: "blokkerend",
        section: null,
        finding: `Deze zin zegt iets over je bedrijf zonder bron: "${zin.sentence}".`,
        evidence: zin.sentence,
        expected: "Elke uitspraak over het bedrijf verwijst naar een bevestigd feit.",
        recommendation: "Onderbouw hem met een feit, of haal hem weg.",
        blocking: true,
        confidence: ZEKER,
        bron: "bronherleidbaarheid",
      }),
    );
  }

  // ══ 2. De vier beoordelaars ═══════════════════════════════════════════════

  let gevraagd = 0;
  let geslaagd = 0;

  gevraagd++;
  if (invoer.critique) {
    geslaagd++;
    if (!invoer.critique.followsRules) {
      issues.push(
        maak(invoer, {
          dimension: "feitelijkheid",
          severity: "hoog",
          section: null,
          finding: "De eindredacteur ziet dat de pagina een harde regel overtreedt.",
          evidence: null,
          expected: "Geen concurrenten bij naam, geen verzonnen feiten, begin met het directe antwoord.",
          recommendation: "Loop de tekst na op deze drie regels.",
          blocking: false,
          confidence: MODELOORDEEL,
          bron: "redactie",
        }),
      );
    }
    for (const regel of invoer.critique.issues) {
      if (!regel?.trim()) continue;
      issues.push(
        maak(invoer, {
          dimension: "leesbaarheid",
          severity: "midden",
          section: null,
          finding: regel.trim(),
          evidence: null,
          expected: null,
          recommendation: "",
          blocking: false,
          confidence: MODELOORDEEL,
          bron: "redactie",
        }),
      );
    }
  }

  gevraagd++;
  if (invoer.factuality) {
    geslaagd++;
    for (const zin of invoer.factuality.unsupportedSentences) {
      issues.push(
        maak(invoer, {
          dimension: "feitelijkheid",
          severity: "hoog",
          section: zin.section?.trim() || null,
          finding: `Deze bewering heeft geen bevestigd feit achter zich: "${zin.sentence}".`,
          evidence: zin.why,
          expected: "Elke bewering over het bedrijf verwijst naar een F-nummer van de feitenkaart.",
          recommendation: "Onderbouw hem met een F-nummer of haal hem weg.",
          blocking: false,
          confidence: MODELOORDEEL,
          bron: "feitelijkheid",
        }),
      );
    }
    for (const claim of invoer.factuality.overreachingClaims) {
      issues.push(
        maak(invoer, {
          dimension: "feitelijkheid",
          severity: "midden",
          section: null,
          finding: `Deze algemene uitleg leest als een belofte van dit bedrijf: "${claim}".`,
          evidence: claim,
          expected: "Algemene uitleg blijft algemeen geformuleerd.",
          recommendation: "Formuleer hem algemeen, of onderbouw hem als belofte.",
          blocking: false,
          confidence: MODELOORDEEL,
          bron: "feitelijkheid",
        }),
      );
    }
  }

  gevraagd++;
  if (invoer.citability) {
    geslaagd++;
    for (const antwoord of invoer.citability.subQuestionAnswers) {
      if (antwoord.answered) continue;
      issues.push(
        maak(invoer, {
          dimension: "volledigheid",
          severity: "hoog",
          section: null,
          finding: `Deze vraag wordt op de pagina niet beantwoord: "${antwoord.subQuestion}".`,
          evidence: null,
          expected: `Eén zin die "${antwoord.subQuestion}" losstaand beantwoordt.`,
          recommendation: "Beantwoord hem in de sectie die ervoor bedoeld is.",
          blocking: false,
          confidence: MODELOORDEEL,
          bron: "citeerbaarheid",
        }),
      );
    }
    for (const vraag of invoer.citability.remainingReaderQuestions) {
      issues.push(
        maak(invoer, {
          dimension: "volledigheid",
          severity: "midden",
          section: null,
          finding: `Een lezer houdt deze vraag over: "${vraag}".`,
          evidence: null,
          expected: "De pagina laat geen voor de hand liggende vraag open.",
          recommendation: "Behandel hem, of leg uit waarom hij niet speelt.",
          blocking: false,
          confidence: MODELOORDEEL,
          bron: "citeerbaarheid",
        }),
      );
    }
    for (const punt of invoer.citability.issues) {
      issues.push(
        maak(invoer, {
          dimension: "relevantie",
          severity: "midden",
          section: punt.section?.trim() || null,
          finding: punt.issue,
          evidence: null,
          expected: null,
          recommendation: "",
          blocking: false,
          confidence: MODELOORDEEL,
          bron: "citeerbaarheid",
        }),
      );
    }
  }

  gevraagd++;
  if (invoer.craft) {
    geslaagd++;
    const craft = invoer.craft;
    // Alleen de dimensies die dit profiel meeweegt leveren een bevinding op. Een
    // FAQ die laag scoort op overtuiging is geen slechte FAQ, en die bevinding
    // zou de reparatie de verkeerde kant op sturen.
    const zwak: [keyof typeof craft, string][] = [];
    if ((invoer.profiel.gewichten.specificiteit ?? 0) > 0 && craft.specificiteit.score < 60)
      zwak.push(["specificiteit", "de pagina gaat te weinig over dit bedrijf"]);
    if ((invoer.profiel.gewichten.expertise ?? 0) > 0 && craft.expertise.score < 60)
      zwak.push(["expertise", "de tekst laat te weinig vakkennis zien"]);
    if ((invoer.profiel.gewichten.diepgang ?? 0) > 0 && craft.diepgang.score < 60)
      zwak.push(["diepgang", "de pagina blijft aan de oppervlakte"]);
    if ((invoer.profiel.gewichten.originaliteit ?? 0) > 0 && craft.originaliteit.score < 60)
      zwak.push(["originaliteit", "de pagina zegt het bekende verhaal"]);
    if ((invoer.profiel.gewichten.toon ?? 0) > 0 && craft.toon.score < 60)
      zwak.push(["toon", "de toon past niet bij dit bedrijf"]);
    if ((invoer.profiel.gewichten.overtuiging ?? 0) > 0 && craft.overtuiging.score < 60)
      zwak.push(["overtuiging", "de pagina zet niet aan tot een vervolgstap"]);

    for (const [sleutel, wat] of zwak) {
      const oordeel = craft[sleutel] as { score: number; evidence: string; why: string };
      issues.push(
        maak(invoer, {
          dimension: sleutel as never,
          severity: oordeel.score < 40 ? "hoog" : "midden",
          section: null,
          finding: `${wat.charAt(0).toUpperCase()}${wat.slice(1)}: ${oordeel.why}`,
          evidence: oordeel.evidence || null,
          expected: null,
          recommendation: "",
          blocking: false,
          confidence: MODELOORDEEL,
          bron: "vakmanschap",
        }),
      );
    }

    if (craft.firstThingToChange?.trim()) {
      issues.push(
        maak(invoer, {
          dimension: "specificiteit",
          severity: "hoog",
          section: craft.firstThingSection?.trim() || null,
          finding: `Een copywriter zou dit als eerste veranderen: ${craft.firstThingToChange.trim()}`,
          evidence: null,
          expected: null,
          recommendation: "",
          blocking: false,
          confidence: MODELOORDEEL,
          bron: "vakmanschap",
        }),
      );
    }
  }

  // ══ 3. De deterministische controles ══════════════════════════════════════

  for (const [sleutel, uitkomst] of Object.entries(invoer.gate.checks)) {
    if (uitkomst !== false) continue;
    const naam = sleutel as keyof typeof GATE_LABELS;
    issues.push(
      maak(invoer, {
        dimension:
          naam === "concreteFeiten" || naam === "onderscheidGebruikt"
            ? "specificiteit"
            : naam === "geenRapportageOverZichzelf"
              ? "feitelijkheid"
              : naam === "citeerbareZin" || naam === "merknaamExpliciet"
                ? "structuur"
                : "relevantie",
        severity: "hoog",
        section: null,
        finding: `De pagina ${GATE_LABELS[naam]} nog niet.`,
        evidence: null,
        expected: GATE_UITLEG[naam],
        recommendation: "",
        blocking: false,
        confidence: ZEKER,
        bron: "geo_poort",
      }),
    );
  }

  for (const sectie of invoer.coverage.secties) {
    if (sectie.aanwezig && sectie.beantwoordt && sectie.uitgewerkt) continue;
    const wat = !sectie.aanwezig
      ? "staat niet op de pagina"
      : !sectie.beantwoordt
        ? "beantwoordt zijn eigen vraag niet"
        : "is te kort om iets te zeggen";
    issues.push(
      maak(invoer, {
        dimension: "volledigheid",
        severity: !sectie.aanwezig ? "hoog" : "midden",
        section: sectie.heading,
        finding: `Deze sectie ${wat}.`,
        evidence: null,
        expected: null,
        recommendation: "",
        blocking: false,
        confidence: ZEKER,
        bron: "contractdekking",
      }),
    );
  }

  for (const zin of invoer.bronpraat.sentences.slice(0, 5)) {
    issues.push(
      maak(invoer, {
        dimension: "feitelijkheid",
        severity: "hoog",
        section: null,
        finding: `Deze zin gaat over onze eigen bronnen in plaats van over het onderwerp: "${zin}".`,
        evidence: zin,
        expected: "De pagina schrijft namens het bedrijf, niet over onze feitenkaart.",
        recommendation: "Herschrijf hem als gewone zin op de site van de klant.",
        blocking: false,
        confidence: ZEKER,
        bron: "bronpraat",
      }),
    );
  }

  // ── V2: één aanspreekvorm per pagina ──────────────────────────────────────
  //
  // Blokkerend, en dat is zwaarder dan de meeste redactionele bevindingen. Reden:
  // dit is geen smaak maar een fout, hij is in tien seconden te zien, en hij
  // stond op de contactpagina van 3 september binnen twee zinnen ("kun je
  // rechtstreeks contact opnemen" gevolgd door "Wilt u meteen boeken"). Een
  // pagina die de lezer half tutoyeert gaat niet naar een klant.
  if (invoer.aanspreekvorm?.gemengd) {
    const a = invoer.aanspreekvorm;
    issues.push(
      maak(invoer, {
        dimension: "toon",
        severity: "hoog",
        section: null,
        finding: a.issues[0] ?? "Deze pagina spreekt de lezer op twee manieren aan.",
        evidence: a.zinnen[0] ?? `${a.je} keer "je", ${a.u} keer "u"`,
        expected: "Eén aanspreekvorm op de hele pagina.",
        recommendation:
          "Kies de vorm die bij dit merk hoort en trek hem overal gelijk, ook in de " +
          "vraag-en-antwoordblokken.",
        blocking: true,
        confidence: ZEKER,
        bron: "aanspreekvorm",
      }),
    );
  }

  // ── V5: een instructie van de klant is genegeerd ──────────────────────────
  //
  // Blokkerend, en zonder aarzeling: dit stond woordelijk in de invoer. Een
  // klant die ziet dat zijn eigen antwoord genegeerd is, vertrouwt de volgende
  // vraag niet meer.
  if (invoer.adres && invoer.adres.issues.length > 0) {
    issues.push(
      maak(invoer, {
        dimension: "feitelijkheid",
        severity: "hoog",
        section: null,
        finding: invoer.adres.issues[0],
        evidence: invoer.adres.adressen[0] ?? null,
        expected: "Geen adres op deze pagina, met een verwijzing naar de contactpagina.",
        recommendation: "Haal het adres weg en verwijs naar de contactpagina.",
        blocking: true,
        confidence: ZEKER,
        bron: "klantinstructie",
      }),
    );
  }

  // ── V9: feiten die geen argument geworden zijn ────────────────────────────
  //
  // Op de dimensie OVERTUIGING en niet op bewijs: de feiten stáán er, ze zijn
  // alleen niet omgezet. Dat is precies wat de externe copywriter aanwees als
  // het verschil tussen informatie en copy, en het is de laagste van zijn vijf
  // cijfers (2,6 van 5). Niet blokkerend: een pagina met te weinig
  // bewijspunten is niet onwaar, hij is alleen minder overtuigend, en een
  // blokkade hier zou elke pagina tegenhouden zolang het model dit nog leert.
  for (const zin of (invoer.bewijspunten?.issues ?? []).slice(0, 3)) {
    issues.push(
      maak(invoer, {
        dimension: "overtuiging",
        severity: "midden",
        section: null,
        finding: zin,
        evidence: invoer.bewijspunten?.nietGeschreven[0]?.betekenis ?? null,
        expected: "Elk gekozen feit staat er met wat het voor deze lezer betekent.",
        recommendation:
          "Schrijf per gekozen feit één zin die zegt wat de lezer eraan heeft, en zet die zin op " +
          "de plek waar hij dat argument nodig heeft.",
        blocking: false,
        confidence: ZEKER,
        bron: "bewijspunt",
      }),
    );
  }

  // ── De schrijfopdracht is niet uitgevoerd (optimalisatie 5 en 6) ─────────
  //
  // Op de dimensie OVERTUIGING, net als de bewijspunten en om dezelfde reden:
  // het materiaal ligt er en de keuze is gemaakt, alleen niet opgeschreven. De
  // reden om juist dit bedrijf te kiezen is de vraag waarmee de externe
  // copywriter zijn hele beoordeling samenvatte, dus die weegt zwaarder dan de
  // andere twee.
  //
  // Niet blokkerend: een pagina die zijn opdracht half uitvoert is niet onwaar,
  // en een blokkade hier zou elke pagina tegenhouden zolang het model dit nog
  // leert. Zelfde afweging als bij V9 hierboven.
  for (const zin of invoer.schrijfopdracht?.issues ?? []) {
    const isKeuzereden = invoer.schrijfopdracht?.keuzeredenVroeg === false && zin.includes("juist dit bedrijf");
    issues.push(
      maak(invoer, {
        dimension: "overtuiging",
        severity: isKeuzereden ? "hoog" : "midden",
        section: null,
        finding: zin,
        evidence: null,
        expected:
          "De pagina voert de schrijfopdracht uit: het kernantwoord in de opening, de gekozen " +
          "feiten in de tekst, en vroeg de reden om juist dit bedrijf te kiezen.",
        recommendation:
          "Zet het ontbrekende deel op de plek die de opdracht noemt, zonder de rest van de " +
          "pagina aan te raken.",
        blocking: false,
        confidence: ZEKER,
        bron: "schrijfopdracht",
      }),
    );
  }

  // ── V4: de eigen woorden van de ondernemer zijn weggeparafraseerd ─────────
  for (const zin of invoer.klantcitaten?.issues ?? []) {
    issues.push(
      maak(invoer, {
        dimension: "originaliteit",
        severity: "midden",
        section: null,
        finding: zin,
        evidence: null,
        expected: "Minstens één antwoord van de ondernemer staat er vrijwel letterlijk in.",
        recommendation:
          "Neem één van zijn antwoorden over inclusief de reden erachter, in plaats van er een " +
          "procedurezin van te maken.",
        blocking: false,
        confidence: ZEKER,
        bron: "klantcitaat",
      }),
    );
  }

  // ── V8: de opening begint bij het bedrijf in plaats van bij de lezer ──────
  //
  // Op de dimensie OVERTUIGING: dit is de zin die bepaalt of iemand doorleest.
  // Elf van de twaalf pagina's van 3 september deden het verkeerd om.
  for (const zin of invoer.opening?.issues ?? []) {
    issues.push(
      maak(invoer, {
        dimension: "overtuiging",
        severity: "hoog",
        section: null,
        finding: zin,
        evidence: invoer.opening?.eersteZin ?? null,
        expected: "De eerste zin gaat over de lezer, de eerste alinea noemt het merk.",
        recommendation:
          "Herschrijf de opening: begin bij wat de lezer meemaakt en noem het bedrijf in de " +
          "tweede of derde zin als de oplossing.",
        blocking: false,
        confidence: ZEKER,
        bron: "paginavorm",
      }),
    );
  }

  // ── V1: het bedrijf spreekt nergens zelf ──────────────────────────────────
  for (const zin of invoer.merkstem?.issues ?? []) {
    issues.push(
      maak(invoer, {
        dimension: "toon",
        severity: "midden",
        section: null,
        finding: zin,
        evidence: `${invoer.merkstem?.merkvermeldingen ?? 0} merkvermeldingen, ${invoer.merkstem?.wijZinnen ?? 0} zinnen in de wij-vorm`,
        expected: "Het bedrijf praat zelf, met de merknaam in de citeerbare zinnen.",
        recommendation:
          "Zet de zinnen die over het werk gaan in de wij-vorm en houd de merknaam in het " +
          "openingsantwoord en de eerste zin van elke sectie.",
        blocking: false,
        confidence: ZEKER,
        bron: "paginavorm",
      }),
    );
  }

  // ── V10: een vragenlijst in plaats van een verhaal ────────────────────────
  for (const zin of invoer.vraagkoppen?.issues ?? []) {
    issues.push(
      maak(invoer, {
        dimension: "structuur",
        severity: "midden",
        section: null,
        finding: zin,
        evidence: `${invoer.vraagkoppen?.vragen ?? 0} van ${invoer.vraagkoppen?.koppen ?? 0} koppen`,
        expected: "Hooguit de helft van de koppen is een vraag.",
        recommendation:
          "Maak van de meeste koppen een mededeling die zegt wat er in die sectie staat.",
        blocking: false,
        confidence: ZEKER,
        bron: "paginavorm",
      }),
    );
  }

  // ── De FAQ herhaalt de tekst erboven (optimalisatie 9) ───────────────────
  //
  // Op de dimensie STRUCTUUR: de informatie klopt en staat er, hij staat er
  // alleen twee keer. Niet blokkerend, want een dubbele vraag maakt een pagina
  // niet onwaar.
  for (const zin of invoer.faqBlokken?.issues ?? []) {
    issues.push(
      maak(invoer, {
        dimension: "structuur",
        severity: "midden",
        section: null,
        finding: zin,
        evidence: invoer.faqBlokken?.herhalingen.slice(0, 3).join(" | ") || null,
        expected: "Elk vraag-en-antwoordblok voegt iets toe dat nog niet in de tekst staat.",
        recommendation:
          "Haal de herhalende vragen weg, of vervang ze door vragen die de lezer na het lezen nog " +
          "overhoudt.",
        blocking: false,
        confidence: ZEKER,
        bron: "faq",
      }),
    );
  }

  // ── V6: de pagina geeft huiswerk in plaats van antwoord ───────────────────
  for (const zin of invoer.adviestoon?.issues ?? []) {
    // Optimalisatie 16: de sectie waar het huiswerk zich ophoopt, zodat de
    // reparatie daar begint en niet de hele pagina aanraakt.
    issues.push(
      maak(invoer, {
        dimension: "overtuiging",
        severity: "midden",
        section: invoer.adviestoon?.zwaarsteSectie ?? null,
        finding: zin,
        evidence: invoer.adviestoon?.voorbeelden.join(", ") || null,
        expected: "De pagina zegt wat dit bedrijf doet, niet wat de lezer moet navragen.",
        recommendation: "Draai de gebiedende zinnen om naar wat het bedrijf zelf regelt.",
        blocking: false,
        confidence: ZEKER,
        bron: "adviestoon",
      }),
    );
  }

  // ── V6: de pagina stuurt de bezoeker weg ──────────────────────────────────
  //
  // Blokkerend, als enige in deze familie. Eén zin is er al één te veel: een
  // checklist om de eigen aanbieder mee te beoordelen hoort op een
  // vergelijkingssite en niet op de site van die aanbieder.
  for (const zin of invoer.zelfondermijning?.issues ?? []) {
    issues.push(
      maak(invoer, {
        dimension: "overtuiging",
        severity: "hoog",
        section: null,
        finding: zin,
        evidence: invoer.zelfondermijning?.zinnen[0] ?? null,
        expected: "Geen vergelijkingsadvies en geen twijfel over de eigen deskundigheid.",
        recommendation:
          "Haal de zin weg en zet er de reden voor in de plaats waarom de lezer verder niet hoeft " +
          "te kijken.",
        blocking: true,
        confidence: ZEKER,
        bron: "adviestoon",
      }),
    );
  }

  // ── V12: elke pagina hetzelfde rijtje feiten ──────────────────────────────
  for (const zin of invoer.herhaling?.issues ?? []) {
    issues.push(
      maak(invoer, {
        dimension: "originaliteit",
        severity: "laag",
        section: null,
        finding: zin,
        evidence: invoer.herhaling?.overal.slice(0, 3).join(" | ") || null,
        expected: "Elke pagina heeft één eigen reden om te bestaan.",
        recommendation:
          "Kies per pagina de feiten die voor die ene lezer het meeste betekenen, en laat de rest " +
          "aan de pagina waar ze thuishoren.",
        blocking: false,
        confidence: ZEKER,
        bron: "herhaling",
      }),
    );
  }

  if (invoer.quality.checks.leesbaar === false) {
    issues.push(
      maak(invoer, {
        dimension: "leesbaarheid",
        severity: "midden",
        section: null,
        finding:
          invoer.quality.issues.find((i) => i.toLowerCase().includes("zin")) ??
          "De tekst leest zwaar.",
        evidence: `gemiddeld ${invoer.quality.gemeten.gemiddeldeZinslengte} woorden per zin`,
        expected: "Korte zinnen, ook in een uitleg.",
        recommendation: "Splits de langste zinnen.",
        blocking: false,
        confidence: ZEKER,
        bron: "kwaliteitspoort",
      }),
    );
  }

  for (const regel of invoer.typeOvertredingen) {
    issues.push(
      maak(invoer, {
        dimension: regel.dimension,
        severity: regel.blokkeert ? "blokkerend" : "midden",
        section: null,
        finding: regel.omschrijving,
        evidence: null,
        expected: null,
        recommendation: "",
        blocking: regel.blokkeert,
        confidence: ZEKER,
        bron: "typeregel",
      }),
    );
  }

  for (const bewering of invoer.onbewezenBeweringen.slice(0, 5)) {
    issues.push(
      maak(invoer, {
        dimension: "bewijs",
        severity: "hoog",
        section: null,
        finding: `Deze bewering konden we niet herleiden tot een bevestigd feit: "${bewering.claim}".`,
        evidence: null,
        expected: "Elke bewering wijst naar een feit dat op de kaart staat.",
        recommendation: "Controleer of hij klopt voordat je publiceert.",
        blocking: false,
        confidence: ZEKER,
        bron: "bronherleidbaarheid",
      }),
    );
  }

  // ══ 4. De dimensiescores ══════════════════════════════════════════════════

  const g = invoer.gate.checks;
  const relevantie = combineer([
    { waarde: deelGeslaagd([g.doelvraagInOpening, g.directAntwoord, g.geenOntwijking]), gewicht: 2 },
    {
      waarde: invoer.citability
        ? deelGeslaagd(invoer.citability.subQuestionAnswers.map((a) => a.answered))
        : null,
      gewicht: 1,
    },
  ]);

  const structuur = combineer([
    { waarde: deelGeslaagd([g.citeerbareZin, g.merknaamExpliciet]), gewicht: 2 },
    { waarde: invoer.coverage.openingKlopt ? 100 : invoer.contractAanwezig ? 40 : null, gewicht: 1 },
  ]);

  // Feitelijkheid: elke onbewezen bewering en elke bronpraatzin is een aftrek.
  // Bewust een aftrekmodel en geen model-cijfer: het model gaf zichzelf op tien
  // van de tien pagina's 100, ook op de pagina met vijf verzonnen feiten.
  const feitelijkheidBasis = 100;
  const aftrek =
    (invoer.factuality?.unsupportedSentences.length ?? 0) * 12 +
    (invoer.factuality?.overreachingClaims.length ?? 0) * 6 +
    invoer.bronpraat.sentences.length * 8 +
    invoer.ongetagdeZinnen.length * 15 +
    (g.geenRapportageOverZichzelf === false ? 10 : 0);
  const feitelijkheid = combineer([
    { waarde: Math.max(0, feitelijkheidBasis - aftrek), gewicht: 2 },
    { waarde: invoer.bronherleidbaarheid, gewicht: 1 },
  ]);

  const volledigheid = combineer([
    { waarde: invoer.coverage.score, gewicht: 2 },
    {
      waarde: invoer.citability
        ? Math.max(0, 100 - invoer.citability.remainingReaderQuestions.length * 15)
        : null,
      gewicht: 1,
    },
  ]);

  const leesbaarheid = combineer([
    { waarde: invoer.quality.checks.leesbaar === null ? null : invoer.quality.checks.leesbaar ? 100 : 45, gewicht: 2 },
    // De redactionele score van het model telt hier mee en nergens anders: hij
    // gaat over hoe de tekst leest, en dat is precies deze dimensie. Zijn
    // bijdrage aan de andere dimensies is bewust weggehaald, want daar
    // overstemde hij de deterministische controles.
    { waarde: invoer.critique?.qualityScore ?? null, gewicht: 1 },
  ]);

  const dimensies: DimensionScores = {
    feitelijkheid,
    bewijs: bewijsDimensie(invoer.dekking, invoer.claimDekking),
    relevantie,
    volledigheid,
    structuur,
    leesbaarheid,
    specificiteit: combineer([
      { waarde: invoer.craft?.specificiteit.score ?? null, gewicht: 2 },
      { waarde: deelGeslaagd([g.concreteFeiten, g.onderscheidGebruikt]), gewicht: 1 },
    ]),
    expertise: invoer.craft?.expertise.score ?? null,
    diepgang: invoer.craft?.diepgang.score ?? null,
    originaliteit: combineer([
      { waarde: invoer.craft?.originaliteit.score ?? null, gewicht: 2 },
      {
        waarde:
          invoer.quality.gemeten.gelijkenis === null
            ? null
            : Math.round(Math.max(0, 100 - invoer.quality.gemeten.gelijkenis * 100)),
        gewicht: 1,
      },
    ]),
    toon: invoer.craft?.toon.score ?? null,
    // ── V11 telt eindelijk mee (optimalisatie 13) ─────────────────────────
    //
    // `herkenning` werd sinds 3 september 2026 wel gescoord en woog nergens in
    // mee, want conventie 1 verbiedt sturen op een cijfer zonder deterministisch
    // vangnet ernaast. Dat vangnet is er nu: `checkOpening()` telt of de eerste
    // zin bij het bedrijf begint in plaats van bij de lezer, en dat is precies
    // wat deze dimensie beoordeelt. Het cijfer weegt half zo zwaar als
    // overtuiging zelf, want het meet één alinea en niet de hele pagina.
    overtuiging: combineer([
      { waarde: invoer.craft?.overtuiging.score ?? null, gewicht: 2 },
      { waarde: invoer.craft?.herkenning?.score ?? null, gewicht: 1 },
      // De deterministische tegenhanger, met hetzelfde gewicht als het
      // menselijke oordeel over herkenning: een opening die bij het bedrijf
      // begint, is geteld en niet beoordeeld.
      {
        waarde:
          invoer.opening === undefined ? null : invoer.opening.begintBijMerk ? 45 : 100,
        gewicht: 1,
      },
    ]),
  };

  return { issues, dimensies, beoordelaars: { geslaagd, gevraagd } };
}

/** Alle ernstgraden op een rij, voor het scherm. */
export const SEVERITY_LABELS: Record<Severity, string> = {
  blokkerend: "houdt publicatie tegen",
  hoog: "belangrijk",
  midden: "verbeterpunt",
  laag: "detail",
};

/** De GEO-criteria van het model, als losse verbeterpunten. Zelfde tekst als voorheen. */
export function geoModelIssues(critique: Critique | null): string[] {
  if (!critique) return [];
  return (Object.keys(GEO_CRITERIA_LABELS) as (keyof typeof GEO_CRITERIA_LABELS)[])
    .filter((key) => !critique.geo[key])
    .map((key) => `GEO: de pagina ${GEO_CRITERIA_LABELS[key]} nog niet.`);
}
