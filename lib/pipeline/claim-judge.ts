import "server-only";

/**
 * De ZINNENBEOORDELAAR: één gerichte modelaanroep over de zinnen die de
 * woordvergelijking niet rond kreeg (punt 59 van de kwaliteitsdoorlichting,
 * 25 september 2026, blok G van het reparatieplan).
 *
 * ── WAAROM ──────────────────────────────────────────────────────────────────
 *
 * `detectClaimSentences()` wijst een zin aan op zijn vorm: een merknaam, een
 * getal of een toezeggingswoord. Bij de herhaling van 24/25 september hield dat
 * 20 van de 21 nieuwe pagina's tegen, en van de 67 aangewezen zinnen was het
 * overgrote deel advies aan de lezer ("Daarna kunt u een offerte beoordelen",
 * "Sommige zichtbare resten kun je mogelijk zelf weghalen"). "Kunt u" en
 * "mogelijk" staan op de toezeggingslijst, en of er iets TOEGEZEGD wordt, zie
 * je niet aan het woord maar aan de zin. Dat is begrip, en daar is een model
 * voor nodig.
 *
 * ── WAT HET MODEL MAG, EN WAT NIET ──────────────────────────────────────────
 *
 * Het model beantwoordt per zin twee vragen. De code controleert beide
 * antwoorden (`verwerkZinOordelen()`, conventie 1):
 *
 *   • "geen bewering" geldt niet voor een zin met de merknaam, in de wij-vorm of
 *     met een bedrag (`magGeenBeweringZijn()`);
 *   • "dit feit onderbouwt hem" geldt alleen als de getallen van de zin in dat
 *     feit staan, zin en feit een kernwoord delen, en een keurmerk letterlijk
 *     terugkomt (`feitOnderbouwtZin()`).
 *
 * Een mislukte aanroep geeft `null`, en dan blijft de keuring zoals hij zonder
 * deze stap was: strenger, nooit milder.
 *
 * ── KOSTEN ──────────────────────────────────────────────────────────────────
 *
 * Eén aanroep per keuring, en alleen als er na de woordvergelijking nog zinnen
 * over zijn (bij de herhaling op 20 van de 21 pagina's). Goedkope tier met
 * redeneertijd, net als de vier beoordelaars ernaast; die kosten nagemeten
 * $0,0013 tot $0,0040 per stuk (`content-panel.ts`), en deze aanroep is kleiner
 * dan de feitelijkheidsbeoordeling omdat hij alleen de losse zinnen ziet en
 * niet de hele pagina. Hij draait parallel met het panel, dus kost geen tijd.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ClaimJudgeVerdict } from "@/lib/schemas/claim-judge";
import { formatFactCard, type FactItem } from "@/lib/pipeline/factcard";
import type { ZinOordeel } from "@/lib/pipeline/claim-extract";

/**
 * Hooguit zoveel zinnen per aanroep. Het meeste bij de herhaling was 12 op één
 * pagina; de rest blijft gewoon staan als ongedekt, strenger dus.
 */
const MAX_ZINNEN = 30;

const SYSTEM =
  "Je controleert zinnen uit een webpagina die een ondernemer op zijn EIGEN site zet. Je herschrijft " +
  "niets en je beoordeelt de stijl niet. Per zin beantwoord je twee vragen. " +
  "VRAAG 1, overBedrijf: beweert deze zin iets controleerbaars over DIT bedrijf? Denk aan wat het " +
  "bedrijf doet, levert, kost, belooft, heeft of is: prijzen, termijnen, werkgebied, aantallen, " +
  "keurmerken, wat er wel of niet bij zit. " +
  "GEEN bewering over het bedrijf zijn: advies of een instructie aan de lezer ('Daarna kunt u een " +
  "offerte beoordelen'), algemene uitleg over het onderwerp ('Vermogen geeft aan hoeveel warmte een " +
  "toestel kan leveren'), een definitie, een datum waarop de pagina is bijgewerkt, een " +
  "veiligheidsinstructie ('bel 112'), een verwijzing naar een andere instantie zoals het CBR, en een " +
  "retorisch antwoord ('Nee, dat kun je niet in het algemeen zeggen'). " +
  "Bij twijfel is het WEL een bewering over het bedrijf. " +
  "VRAAG 2, feit: alleen als het een bewering over het bedrijf is. Geef het F-nummer van het ene " +
  "feit op de FEITENKAART dat precies zegt wat de zin beweert. Een feit dat over iets anders gaat, of " +
  "maar een deel dekt, telt niet. Een wens of groeidoel onderbouwt geen bewering dat het al zo is. " +
  "Een keurmerk, certificering of erkenning telt alleen als precies dat keurmerk op de kaart staat. " +
  "Is er zo'n feit niet, geef dan null. " +
  "Geef bij elke zin in één korte zin de reden. Antwoord in het Nederlands.";

/**
 * Laat het model oordelen over de zinnen die de woordvergelijking niet rond
 * kreeg. `null` bij een mislukte aanroep; een lege lijst als er niets te
 * vragen was.
 */
export async function beoordeelZinnen(args: {
  zinnen: string[];
  facts: FactItem[];
  brandName: string;
  analysisId: string;
  profileId: string | null;
}): Promise<{ oordelen: ZinOordeel[]; raw: unknown } | null> {
  const zinnen = args.zinnen.slice(0, MAX_ZINNEN);
  if (zinnen.length === 0) return { oordelen: [], raw: null };

  // Alles binnen de try: deze belofte draait parallel met het panel, en een
  // fout mag daar nooit als onafgehandelde weigering naast blijven hangen.
  try {
    const user = [
      formatFactCard(args.facts),
      "",
      `Bedrijfsnaam: ${args.brandName}`,
      "",
      "ZINNEN om te beoordelen:",
      ...zinnen.map((z, i) => `${i + 1}. ${z}`),
    ].join("\n");
    const res = await callStructured({
      model: MODELS.quality,
      system: SYSTEM,
      user,
      schema: ClaimJudgeVerdict,
      schemaName: "content_claim_judge",
      webSearch: false,
      work: "judging",
      meta: { kind: "content_claim_judge", analysisId: args.analysisId, profileId: args.profileId ?? undefined },
    });
    const oordelen: ZinOordeel[] = [];
    for (const o of res.parsed.oordelen) {
      const zin = zinnen[o.nummer - 1];
      if (!zin) continue; // een nummer dat niet bestaat, telt niet
      oordelen.push({ sentence: zin, overBedrijf: o.overBedrijf, feit: o.feit?.trim() || null });
    }
    return { oordelen, raw: res.raw };
  } catch (err) {
    console.warn(`Zinnenbeoordeling mislukt, de keuring blijft zo streng als hij was: ${String(err)}`);
    return null;
  }
}
