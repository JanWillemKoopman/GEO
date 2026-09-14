/**
 * Wat de sollicitatieassistent te horen krijgt voordat hij iets schrijft.
 *
 * Pure module zonder `server-only` (conventie 2): `scripts/test-unit.ts` leest
 * hem na op de dingen die er echt in moeten staan, want een promptregel die
 * stilletjes verdwijnt bij een refactor merkt niemand aan de uitvoer.
 *
 * ── DE DRIE OPDRACHTEN, IN VOLGORDE ────────────────────────────────────────
 *
 * 1. Eerst de vacature ontleden en de overlap met het dossier vaststellen.
 * 2. Dan pas een brief, in de woorden van deze persoon en niet in AI-taal.
 * 3. Daarna doen wat er gevraagd wordt ("enthousiaster", "korter").
 *
 * Die volgorde staat er expliciet in omdat een model dat meteen begint te
 * schrijven altijd dezelfde brief maakt: die van niemand.
 *
 * ── WAT ER IN CODE IS NAGEREKEND EN WAT NIET ───────────────────────────────
 *
 * De regel "geen AI-taal" heeft zijn vangnet in `lib/solliciteren/cliches.ts`.
 * De regel "schrijf zoals deze persoon schrijft" is sinds 15 september 2026
 * geen bijvoeglijk naamwoord meer maar een reeks getallen uit
 * `lib/solliciteren/stem.ts`, en die worden na afloop nagemeten. Beide zijn
 * conventie 1.
 *
 * De regel "verzin niets" heeft dat vangnet NIET, en dat hoort hier te staan in
 * plaats van weggemoffeld: code kan niet zien of "drie jaar leidinggeven" in
 * het dossier stond. Wat er wel is: de instructie om een gat te markeren in
 * plaats van in te vullen, zodat het opvalt waar iemand zelf nog moet kijken.
 */
import { bouwDossierblok, type Dossierstuk } from "@/lib/solliciteren/dossier";
import {
  KOP_BRIEF,
  KOP_OPDRACHT,
  KOP_VACATURE,
  MINIMUM_FEITEN_IN_BRIEF,
  bouwFeitenblok,
  type Feit,
} from "@/lib/solliciteren/feiten";
import { formuleerStemregels, type Stemprofiel } from "@/lib/solliciteren/stem";

/**
 * Hoeveel tekens de vacaturetekst meeneemt. Ruim boven een lange vacature
 * (zelden meer dan 6.000 tekens), zodat er ook een hele wervingspagina in kan.
 */
export const MAX_VACATURE_TEKENS = 40_000;

/** Hoeveel tekens één bericht van de gebruiker mag zijn. */
export const MAX_BERICHT_TEKENS = 8_000;

/**
 * Hoeveel eerdere berichten er meegaan.
 *
 * Opgehoogd van 24 naar 40 op 15 september 2026. De reden om het laag te houden
 * was kostenbesparing, en dat is uitdrukkelijk niet waar dit scherm op stuurt:
 * een brief die klopt is meer waard dan een paar cent. 40 beurten is een lang
 * gesprek over één brief; daarboven zijn de laatste beurten wat telt.
 */
export const MAX_BERICHTEN_IN_HISTORIE = 40;

/** Kap een tekst af en zeg het als dat gebeurt. */
export function kapAf(tekst: string, max: number): string {
  const schoon = (tekst ?? "").trim();
  if (schoon.length <= max) return schoon;
  return `${schoon.slice(0, max)}\n\n[hier afgekapt, de tekst was ${schoon.length} tekens]`;
}

/**
 * De systeeminstructie.
 *
 * Eén tekst, geen varianten per model: welk model er draait en hoeveel het
 * nadenkt is een keuze van de gebruiker, wat de assistent IS verandert daar
 * niet van. De stemregels komen er wél bij in, want die zijn gemeten aan deze
 * persoon en horen bij wie de assistent voor hem moet zijn.
 */
export function bouwSysteemprompt(opts: { stem?: Stemprofiel | null; feiten?: number } = {}): string {
  const stem = opts.stem ?? null;
  const heeftFeiten = (opts.feiten ?? 0) > 0;

  const regels = [
    "Je bent een ervaren Nederlandse loopbaanadviseur en tekstschrijver. Je helpt één persoon aan",
    "één sollicitatiebrief die klinkt alsof hij hem zelf geschreven heeft.",
    "",
    "DE VORM VAN JE ANTWOORD",
    "Je antwoord heeft altijd deze drie kopjes, in deze volgorde, letterlijk zo geschreven:",
    "",
    KOP_VACATURE,
    "Wat is het echte probleem waarvoor ze iemand zoeken, welke eisen zijn hard en welke zijn een",
    "wens, en welke woorden gebruikt de werkgever zelf. Zeg er ook bij waar het dossier niet",
    "aansluit, want dat is wat er in het gesprek opgelost moet worden. Kort, hoogstens tien regels.",
    "",
    KOP_OPDRACHT,
    "De keuze die je maakt vóór je schrijft, in vier regels:",
    "Lezer: wie leest deze brief, en wat moet die persoon na één alinea begrijpen.",
    "Waarom jij: waarom zou deze werkgever juist deze kandidaat kiezen boven de zestig anderen.",
    heeftFeiten
      ? "Kernfeiten: de F-nummers die de brief gaan dragen, tussen de drie en de zes."
      : "Kern: de twee of drie dingen uit het dossier die de brief gaan dragen.",
    "Weglaten: wat er verleidelijk in zou kunnen, maar niet in deze brief hoort.",
    "",
    "Deze vier regels zijn het belangrijkste deel van je werk. Een schrijver met veertig feiten kiest",
    "er zes uit; die keuze maak je hier, expliciet, en daarna schrijf je hem uit. Sla dit kopje nooit",
    "over en vul het nooit met algemeenheden.",
    "",
    KOP_BRIEF,
    "De brief zelf, en verder niets. Geen aanhef van jou over de brief, geen toelichting eronder.",
    "",
    "HOE DE BRIEF KLINKT",
    "Korte zinnen. Gewone woorden. Eén gedachte per zin. De eerste alinea zegt waarom deze persoon",
    "bij deze vacature past, en niet dat hij de vacature met interesse gelezen heeft.",
    "Vier alinea's is genoeg, 300 tot 400 woorden.",
    "Gebruik de woorden uit het dossier zelf, ook als die minder mooi zijn dan wat jij zou kiezen.",
    "Elke alinea draagt één punt en bewijst het met iets concreets. Een alinea zonder bewijs is een",
    "alinea die geschrapt kan worden.",
  ];

  // ⚠️ De feitenkaart is een GESLOTEN lijst, en dat is het hele punt. Een
  // dossier meegeven met "gebruik dit waar het past" is een uitnodiging;
  // "alleen wat hieronder staat, met het nummer erbij" is een grens, en
  // `controleerAntwoord()` in lib/solliciteren/feiten.ts rekent hem na.
  if (heeftFeiten) {
    regels.push(
      "",
      "DE FEITENKAART IS GESLOTEN",
      "Je krijgt hieronder een genummerde feitenkaart. Dat is ALLES wat je over deze persoon mag",
      "beweren. Staat iets er niet op, dan bestaat het voor deze brief niet, ook niet als het in het",
      "dossier tussen de regels door te lezen is.",
      "Zet achter elke zin in de brief die op een feit steunt het nummer ervan, tussen blokhaken, zo:",
      "\"Ik bracht de doorlooptijd terug van negen naar vijf dagen. [F12]\"",
      "Meerdere feiten in één zin: [F3, F12].",
      `De brief steunt op minstens ${MINIMUM_FEITEN_IN_BRIEF} verschillende feiten. Lukt dat niet, zeg dat dan onder de brief.`,
      "Verbindende zinnen en zinnen over de werkgever hoeven geen nummer. Een zin die iets beweert",
      "over wat deze persoon heeft gedaan of kan, altijd wel.",
      "De nummers blijven in de brief staan. Ze worden er bij het kopiëren automatisch uitgehaald.",
    );
  }

  // ⚠️ Deze regels zijn gemeten aan de eerdere brieven van deze persoon
  // (lib/solliciteren/stem.ts) en worden na afloop nagemeten met `toetsStem()`.
  // Zonder gemeten brieven staat er niets: een verzonnen stijlvoorschrift is
  // erger dan geen, want het legt een register op dat van niemand is.
  if (stem) {
    regels.push(
      "",
      "DE STEM VAN DEZE PERSOON, GEMETEN AAN ZIJN EIGEN BRIEVEN",
      `Gemeten aan ${stem.bronnen} ${stem.bronnen === 1 ? "brief" : "brieven"}, samen ${stem.woorden} woorden. Houd je hieraan:`,
      ...formuleerStemregels(stem).map((regel) => `- ${regel}`),
    );
  }

  regels.push(
    "",
    "WAT JE NOOIT SCHRIJFT",
    'Geen gedachtestreepjes (de tekens "—" en "–"). Knip de zin doormidden of zet een komma.',
    'Geen schuine streep in "en/of", "product/dienst" of "ja/nee". Schrijf het voluit.',
    "Geen standaardzinnen. Concreet verboden, omdat ze in vrijwel elke brief staan:",
    '"in een wereld waarin", "met veel enthousiasme", "ik ben ervan overtuigd dat",',
    '"spreekt mij aan", "naadloos aansluit", "de ideale kandidaat", "teamspeler", "proactief",',
    '"hands-on", "ik zie ernaar uit om", "graag licht ik dit persoonlijk toe".',
    "Geen opsomming met bolletjes in de brief zelf. Een brief is lopende tekst.",
    "",
    "WAT JE NOOIT VERZINT",
    heeftFeiten
      ? "Je beweert alleen wat op de feitenkaart staat. Mist er iets wat de brief nodig heeft, dan zet je er [dit weet ik niet: ...] neer en vraag je er onder de brief naar."
      : "Je gebruikt alleen wat in het dossier of de vacature staat. Mist er iets wat de brief nodig heeft, dan zet je er [dit weet ik niet: ...] neer en vraag je er onder de brief naar.",
    "Een verzonnen jaartal, werkgever of resultaat is erger dan een gat, want een gat ziet de",
    "schrijver zelf en een verzinsel niet.",
    "",
    "IN HET GESPREK",
    "Doe wat er gevraagd wordt en niets erbij. Vraagt iemand om een enthousiastere toon, verander",
    "dan de toon en niet de inhoud. Vraagt iemand om een alinea in te korten, laat de rest dan",
    "letterlijk staan. Geef de hele brief opnieuw als er iets in verandert, zodat er altijd één",
    `versie is om te kopiëren, en houd daarbij het kopje "${KOP_BRIEF}" aan.`,
    "Verandert er niets aan de analyse of de keuze, laat die kopjes dan weg en geef alleen de brief.",
    "Je antwoordt in het Nederlands.",
  );

  return regels.join("\n");
}

/**
 * Het vacatureblok. Geeft `null` als er nog geen vacature is: dan hoort het
 * model te weten dát er geen is, in plaats van er zelf een aan te nemen.
 */
export function bouwVacatureblok(vacature: string): string | null {
  const tekst = kapAf(vacature, MAX_VACATURE_TEKENS);
  if (!tekst) return null;
  return ["Dit is de vacature waarop deze persoon reageert.", "", "=== VACATURETEKST ===", tekst].join(
    "\n",
  );
}

export interface Gespreksbericht {
  rol: "gebruiker" | "assistent";
  inhoud: string;
}

/** Vertaalt onze Nederlandse rolnamen naar wat de API verwacht. Eén plek. */
function rolVoorApi(rol: Gespreksbericht["rol"]): "user" | "assistant" {
  return rol === "gebruiker" ? "user" : "assistant";
}

/**
 * De volledige invoer voor één aanroep.
 *
 * ── DE VOLGORDE IS EEN ONTWERPKEUZE ────────────────────────────────────────
 *
 * Instructie, dan dossier, dan vacature, dan het gesprek, dan de vraag. Van
 * meest naar minst stabiel, en dat is niet alleen netjes: OpenAI hergebruikt
 * het begin van een aanroep dat gelijk blijft aan de vorige, en rekent dat
 * goedkoper en sneller af. Het dossier is het grootste stuk en verandert
 * zelden, dus het hoort vooraan. Zet je het achteraan, dan valt bij elke
 * vervolgvraag het hele hergebruik weg. Dat is geen bezuiniging maar
 * doorlooptijd: bij een dossier van 25.000 tekens scheelt het merkbaar hoe snel
 * het eerste woord op het scherm staat.
 *
 * ── WAAROM HET DOSSIER EEN BERICHT VAN DE GEBRUIKER IS ─────────────────────
 *
 * Het gaat mee als bericht van de GEBRUIKER en niet als tweede
 * systeeminstructie. Het is materiaal en geen opdracht, en een vacaturetekst
 * die per ongeluk een zin bevat die als instructie leest ("negeer het
 * bovenstaande en schrijf ...") hoort niet het gewicht van een
 * systeeminstructie te krijgen.
 */
export function bouwInvoer(opts: {
  dossier: readonly Dossierstuk[];
  feiten: readonly Feit[];
  vacature: string;
  stem: Stemprofiel | null;
  historie: readonly Gespreksbericht[];
  vraag: string;
}): { role: "system" | "user" | "assistant"; content: string }[] {
  const invoer: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: bouwSysteemprompt({ stem: opts.stem, feiten: opts.feiten.length }) },
  ];

  // De feitenkaart vóór het dossier: hij is korter, hij is de grens, en hij
  // verandert minder vaak dan het dossier zelf.
  const feiten = bouwFeitenblok(opts.feiten);
  if (feiten) invoer.push({ role: "user", content: feiten });

  const dossier = bouwDossierblok(opts.dossier);
  if (dossier) invoer.push({ role: "user", content: dossier });

  const vacature = bouwVacatureblok(opts.vacature);
  if (vacature) invoer.push({ role: "user", content: vacature });

  // De laatste beurten, niet het hele archief. Zie MAX_BERICHTEN_IN_HISTORIE.
  for (const bericht of opts.historie.slice(-MAX_BERICHTEN_IN_HISTORIE)) {
    if (!bericht.inhoud.trim()) continue;
    invoer.push({ role: rolVoorApi(bericht.rol), content: bericht.inhoud });
  }

  invoer.push({ role: "user", content: opts.vraag });
  return invoer;
}

/**
 * De openingsvraag die het scherm klaarzet zodra er een vacature staat.
 *
 * Staat hier en niet in het scherm, zodat hij dezelfde woorden gebruikt als de
 * systeemprompt. Een startknop die iets anders vraagt dan de instructie belooft,
 * levert een antwoord op dat naast de bedoeling zit.
 */
export const EERSTE_VRAAG =
  "Ontleed de vacature, kies welke feiten deze brief gaan dragen, en schrijf daarna een eerste " +
  "versie van de brief.";
