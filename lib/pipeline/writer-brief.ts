import "server-only";

/**
 * DE SCHRIJFOPDRACHT MAKEN: de redactionele keuze vóór het schrijven
 * (optimalisatie 5 en 6 uit docs/tasks/optimalisaties-expertronde-4-september-2026.md,
 * migratie 0094).
 *
 * ── WAAROM DEZE STAP BESTAAT ────────────────────────────────────────────────
 *
 * Twee externe experts kwamen op 4 september 2026 los van elkaar op dezelfde
 * zin uit: de pijplijn is goed in het voorkomen van slechte tekst en nog niet
 * goed in het veroorzaken van uitstekende tekst. Negentien controles bewaken
 * wat er niet mag; niets besliste wat er per se wél gezegd moest worden.
 *
 * De schrijver krijgt achttien blokken die allemaal dezelfde status hebben.
 * Een copywriter doet iets anders: hij weet zevenenveertig dingen over een
 * bedrijf en kiest er zes uit. Die keuze staat nu in deze stap.
 *
 * ── WAT DEZE STAP NADRUKKELIJK NIET DOET ────────────────────────────────────
 *
 * Hij doet geen onderzoek en voegt geen informatie toe. Hij vat ook niet samen:
 * een samenvatting is een negentiende blok en dus precies het probleem. Hij
 * KIEST, uit materiaal dat er al ligt.
 *
 * ── KOSTEN ──────────────────────────────────────────────────────────────────
 *
 * De goedkope tier met redeneertijd, zonder web-zoekactie. Naar verwachting
 * ongeveer een cent per pagina, in dezelfde orde als het itemdossier ($0,0161)
 * en het contract ($0,0064). Daar staat tegenover dat één vermeden
 * reparatieronde $0,083 kost, en dat vier van de twaalf pagina's van
 * 3 september een tweede of derde ronde nodig hadden. ⚠️ Dat de opdracht die
 * rondes ook echt vermijdt, is een verwachting en geen meting (conventie 10).
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { WriterBrief } from "@/lib/schemas/writer-brief";
import { formatFactCard, type FactItem } from "@/lib/pipeline/factcard";
import { vindCiteerbareAntwoorden } from "@/lib/pipeline/klantcitaten";
import { bruikbareOpdracht, MIN_KERNFEITEN, MAX_KERNFEITEN } from "@/lib/schrijfopdracht";
import type { ContentContract } from "@/lib/schemas/content-contract";
import type { RecommendationTarget } from "@/lib/pipeline/recommendation";
import type { ContentType } from "@/lib/types/database";

const SYSTEM =
  "Je bent de eindredacteur die vlak vóór het schrijven de knoop doorhakt. Je schrijft de pagina " +
  "NIET en je vat niets samen: je KIEST. " +
  "Je krijgt alles wat de voorbereiding heeft opgeleverd, en je maakt daar één opdracht van waar " +
  "een schrijver mee vooruit kan. " +
  "OPDRACHT: " +
  "(1) DE LEZER. Eén concrete persoon in één concrete situatie. Niet 'mensen die dakisolatie " +
  "zoeken', maar 'een huiseigenaar die merkt dat zijn huis in de winter moeilijk warm blijft en " +
  "wil weten of isoleren kan zonder de dakbedekking te vervangen'. Een onderwerp is geen lezer. " +
  "(2) DE HOOFDVRAAG. De ENE vraag die deze pagina beantwoordt. " +
  "(3) HET KERNANTWOORD. Wat moet deze persoon begrijpen als hij alleen de eerste alinea leest? " +
  "Concreet, en te begrijpen zonder de rest van de pagina. " +
  "(4) WAAROM DEZE PAGINA BESTAAT. Bij welke vraag noemt een AI-assistent dit bedrijf nu niet? " +
  `(5) DE KERNFEITEN. Kies ${MIN_KERNFEITEN} tot ${MAX_KERNFEITEN} F-nummers van de feitenkaart ` +
  "waar deze pagina op staat of valt. Niet de eerste van de kaart en niet de sterkste in het " +
  "algemeen: die welke voor DEZE lezer bij DEZE vraag tellen. Zet er ALLEEN het nummer neer, dus " +
  "\"F7\" en niet de hele zin die erbij hoort. " +
  "(6) WAAROM DEZE LEZER JUIST DIT BEDRIJF ZOU KIEZEN. Eén tot drie redenen, elk met ÉÉN F-nummer " +
  "erbij (dus \"F9\" en niet \"F9 en F10\"), en elk geschreven VANUIT DE LEZER. Het verschil: 'deze lezer heeft haast, dus dat wij " +
  "binnen 24 uur ter plaatse zijn telt voor hem' is een reden; 'het bedrijf heeft vier dakdekkers' " +
  "is een feit. Een bedrijf kan twintig sterke eigenschappen hebben en er voor deze pagina maar " +
  "drie relevante. Zoek de eigenschap die deze lezer bij deze vraag nodig heeft. " +
  "(7) DE EIGEN WOORDEN. Wat kan deze ondernemer zeggen wat een concurrent niet kan kopiëren: zijn " +
  "motivering, zijn werkwijze, een keuze die hij bewust niet maakt? Neem dat vrijwel letterlijk " +
  "over uit zijn eigen antwoorden. Staat er niets bruikbaars bij, laat het veld dan leeg: verzinnen " +
  "is hier erger dan overslaan. " +
  "(8) WAT ER ABSOLUUT IN MOET. Hooguit een handvol prioriteiten. " +
  "(9) WAT ER OP DEZE PAGINA JUIST NIET MAG. De valkuilen van dit onderwerp, niet de algemene " +
  "regels die de schrijver toch al krijgt. " +
  "(10) WAT ER BLIJFT HANGEN. Niet 'ik weet nu alles', maar bijvoorbeeld 'dit bedrijf begrijpt " +
  "precies mijn situatie en heeft een aanpak die daarbij past'. " +
  "HARDE REGELS: " +
  "(a) Je verzint NIETS. Elk F-nummer dat je noemt staat op de kaart, en elke reden rust op een " +
  "feit dat er staat. Kun je een reden niet aan een F-nummer hangen, laat hem dan weg. " +
  "(b) Kies. Vijf kernfeiten is het maximum: van twintig feiten er twintig noemen is geen keuze. " +
  "(c) Alles wat je opschrijft gaat over DEZE pagina. Een opdracht die op elke pagina van dit " +
  "bedrijf zou passen, is geen opdracht. " +
  "(d) Noem GEEN concurrenten en geen andere bedrijven. " +
  "(e) Nederlands, gewone taal, korte zinnen. Gebruik GEEN gedachtestreepjes en GEEN schuine " +
  "streep tussen twee woorden.";

export interface OpdrachtInput {
  title: string;
  type: ContentType;
  /** De lezer zoals de aanbeveling hem beschrijft, als vertrekpunt. */
  targetIntent: string;
  why: string;
  targets: RecommendationTarget[];
  facts: FactItem[];
  contract: ContentContract | null;
  /** Waardeproposities en bezwaren uit het merkprofiel, als ruw materiaal. */
  valueProps: string[];
  objections: string[];
  analysisId: string;
  profileId: string | null;
}

/**
 * Maakt de schrijfopdracht.
 *
 * Levert `null` zodra de opdracht niet compleet is. Dat is geen fout maar de
 * afspraak: een halve opdracht die tóch de schrijfprompt in gaat, stuurt de
 * pagina op een half argument, en dan is niet schrijven met de oude opdracht
 * beter dan schrijven met een verkeerde (conventie 3). De pijplijn schrijft in
 * dat geval precies zoals hij het vóór deze stap deed.
 */
export async function maakSchrijfopdracht(input: OpdrachtInput): Promise<WriterBrief | null> {
  const vragen = input.targets.map((t) => t.text).filter(Boolean);
  const citaten = vindCiteerbareAntwoorden(input.facts.map((f) => f.text));

  const user = [
    `Type pagina: ${input.type}`,
    `Titel van de pagina: "${input.title}"`,
    `Wie de lezer volgens de aanbeveling is: ${input.targetIntent || "niet opgegeven"}`,
    `Waarom deze pagina er komt: ${input.why}`,
    vragen.length
      ? `DE GEMETEN VRAGEN waarop een AI-assistent dit bedrijf nu niet noemt:\n- ${vragen.join("\n- ")}`
      : "",
    formatFactCard(input.facts),
    citaten.length
      ? `IN DE WOORDEN VAN DE ONDERNEMER (hieruit kies je punt 7):\n- ${citaten
          .map((c) => c.tekst)
          .join("\n- ")}`
      : "",
    input.valueProps.length ? `Waardeproposities uit het merkprofiel: ${input.valueProps.join(", ")}` : "",
    input.objections.length
      ? `Bezwaren die klanten in het verkoopgesprek noemen: ${input.objections.join(" | ")}`
      : "",
    input.contract
      ? `DE INHOUDSOPGAVE die al ligt (dit is de structuur, jij levert de richting):\n` +
        (input.contract.pageObjective ? `Doel: ${input.contract.pageObjective}\n` : "") +
        input.contract.sections.map((s) => `- "${s.heading}": ${s.subQuestion}`).join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await callStructured({
    model: MODELS.quality,
    system: SYSTEM,
    user,
    schema: WriterBrief,
    schemaName: "writer_brief",
    webSearch: false,
    work: "analytical",
    meta: {
      kind: "writer_brief",
      analysisId: input.analysisId,
      profileId: input.profileId ?? undefined,
    },
  });

  // ── Het eerste vangnet: de F-nummers moeten bestaan ──────────────────────
  //
  // Een kernfeit dat nergens naar wijst, is een opdracht om iets te schrijven
  // dat niet onderbouwd kan worden. Hetzelfde vangnet als bij `claims` en bij
  // de bewijspunten: een nummer noemen is niet genoeg.
  //
  // De vergelijking zelf staat in `bruikbareOpdracht()`, samen met het
  // opschonen van het formaat. ⚠️ Dat stond hier, met een LETTERLIJKE
  // vergelijking, en dat wierp op 4 september 2026 alle zes de opdrachten van
  // de eerste echte ronde weg: het model geeft "F7: het hele feit" terug waar
  // de code "F7" verwachtte. Eén plek, één definitie.
  return bruikbareOpdracht(
    result.parsed,
    input.facts.map((f) => f.ref).filter(Boolean),
  );
}
