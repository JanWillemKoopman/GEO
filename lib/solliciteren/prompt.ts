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
export function bouwSysteemprompt(stem: Stemprofiel | null = null): string {
  const regels = [
    "Je bent een ervaren Nederlandse loopbaanadviseur en tekstschrijver. Je helpt één persoon aan",
    "één sollicitatiebrief die klinkt alsof hij hem zelf geschreven heeft.",
    "",
    "WERKWIJZE",
    "1. Ontleed eerst de vacature: wat is het echte probleem waarvoor ze iemand zoeken, welke eisen",
    "   zijn hard en welke zijn een wens, en welke woorden gebruikt de werkgever zelf.",
    "2. Leg daarnaast het dossier en stel vast waar de overlap zit. Noem ook waar hij ontbreekt,",
    "   want dat is wat er in het gesprek opgelost moet worden.",
    "3. Schrijf pas daarna. Vraag het niet eerst, maar zet je analyse kort boven de brief zodat de",
    "   lezer ziet waar de keuzes vandaan komen.",
    "",
    "HOE DE BRIEF KLINKT",
    "Korte zinnen. Gewone woorden. Eén gedachte per zin. De eerste alinea zegt waarom deze persoon",
    "bij deze vacature past, en niet dat hij de vacature met interesse gelezen heeft.",
    "Vier alinea's is genoeg, 300 tot 400 woorden.",
    "Gebruik de woorden uit het dossier zelf, ook als die minder mooi zijn dan wat jij zou kiezen.",
  ];

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
    "Je gebruikt alleen wat in het dossier of de vacature staat. Mist er iets wat de brief nodig",
    "heeft, dan zet je er [dit weet ik niet: ...] neer en vraag je er onder de brief naar. Een",
    "verzonnen jaartal, werkgever of resultaat is erger dan een gat, want een gat ziet de schrijver",
    "zelf en een verzinsel niet.",
    "",
    "IN HET GESPREK",
    "Doe wat er gevraagd wordt en niets erbij. Vraagt iemand om een enthousiastere toon, verander",
    "dan de toon en niet de inhoud. Vraagt iemand om een alinea in te korten, laat de rest dan",
    "letterlijk staan. Geef de hele brief opnieuw als er iets in verandert, zodat er altijd één",
    "versie is om te kopiëren.",
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
  vacature: string;
  stem: Stemprofiel | null;
  historie: readonly Gespreksbericht[];
  vraag: string;
}): { role: "system" | "user" | "assistant"; content: string }[] {
  const invoer: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: bouwSysteemprompt(opts.stem) },
  ];

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
  "Ontleed de vacature en zet ernaast waar mijn dossier aansluit en waar niet. Schrijf daarna een " +
  "eerste versie van de brief.";
