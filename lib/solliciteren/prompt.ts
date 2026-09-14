/**
 * Wat de sollicitatieassistent te horen krijgt voordat hij iets schrijft.
 *
 * Pure module zonder `server-only` (conventie 2): `scripts/test-unit.ts` leest
 * hem na op de dingen die er echt in moeten staan, want een promptregel die
 * stilletjes verdwijnt bij een refactor merkt niemand aan de uitvoer.
 *
 * ── DE DRIE OPDRACHTEN, IN VOLGORDE ────────────────────────────────────────
 *
 * 1. Eerst de vacature ontleden en de overlap met het CV vaststellen.
 * 2. Dan pas een brief, in de woorden van deze persoon en niet in AI-taal.
 * 3. Daarna doen wat er gevraagd wordt ("enthousiaster", "korter").
 *
 * Die volgorde staat er expliciet in omdat een model dat meteen begint te
 * schrijven altijd dezelfde brief maakt: die van niemand.
 *
 * ── WAT ER IN CODE IS NAGEREKEND EN WAT NIET ───────────────────────────────
 *
 * De regel "geen AI-taal" heeft zijn vangnet in `lib/solliciteren/cliches.ts`:
 * elk antwoord wordt geteld en wat erin staat komt op het scherm (conventie 1).
 * De regel "verzin niets" heeft dat vangnet NIET, en dat hoort hier te staan in
 * plaats van weggemoffeld: code kan niet zien of "drie jaar leidinggeven" in het
 * CV stond. Wat er wel is: de instructie om een gat te markeren met [...] in
 * plaats van in te vullen, zodat het opvalt waar iemand zelf nog moet kijken.
 */

/**
 * Hoeveel tekens er per bronveld meegaan.
 *
 * Een CV is zelden langer dan 8.000 tekens, een vacature zelden langer dan
 * 6.000. 24.000 is dus ruim, en tegelijk een echte grens: de drie velden gaan
 * bij ELK bericht opnieuw mee, dus wie hier zijn hele Drive in plakt, betaalt
 * dat bij elke vervolgvraag opnieuw. Afkappen aan het eind en niet in het
 * midden: het begin van een CV draagt de belangrijkste informatie.
 */
export const MAX_CONTEXT_TEKENS = 24_000;

/** Hoeveel tekens één bericht van de gebruiker mag zijn. */
export const MAX_BERICHT_TEKENS = 8_000;

/**
 * Hoeveel eerdere berichten er meegaan.
 *
 * Een gesprek over één brief blijft ruim binnen dit aantal. Loopt het verder
 * op, dan zijn de laatste beurten wat telt en betaal je anders bij elke
 * vervolgvraag opnieuw voor een analyse van drie brieven geleden. De
 * bronteksten gaan altijd voluit mee, want die zijn het onderwerp.
 */
export const MAX_BERICHTEN_IN_HISTORIE = 24;

export interface Bronteksten {
  cv: string;
  brieven: string;
  vacature: string;
}

/** Kap een broncontext af op `MAX_CONTEXT_TEKENS` en zeg het als dat gebeurt. */
export function kapAf(tekst: string, max = MAX_CONTEXT_TEKENS): string {
  const schoon = (tekst ?? "").trim();
  if (schoon.length <= max) return schoon;
  return `${schoon.slice(0, max)}\n\n[hier afgekapt, de tekst was ${schoon.length} tekens]`;
}

/**
 * De systeeminstructie. Eén tekst, geen varianten per model: welk model er
 * draait en hoeveel het nadenkt is een keuze van de gebruiker, wat de assistent
 * IS verandert daar niet van.
 */
export function bouwSysteemprompt(): string {
  return [
    "Je bent een ervaren Nederlandse loopbaanadviseur en tekstschrijver. Je helpt één persoon aan",
    "één sollicitatiebrief die klinkt alsof hij hem zelf geschreven heeft.",
    "",
    "WERKWIJZE",
    "1. Ontleed eerst de vacature: wat is het echte probleem waarvoor ze iemand zoeken, welke eisen",
    "   zijn hard en welke zijn een wens, en welke woorden gebruikt de werkgever zelf.",
    "2. Leg daarnaast het CV en stel vast waar de overlap zit. Noem ook waar hij ontbreekt, want",
    "   dat is wat er in het gesprek opgelost moet worden.",
    "3. Schrijf pas daarna. Vraag het niet eerst, maar zet je analyse kort boven de brief zodat de",
    "   lezer ziet waar de keuzes vandaan komen.",
    "",
    "HOE DE BRIEF KLINKT",
    "Korte zinnen. Gewone woorden. Eén gedachte per zin. De eerste alinea zegt waarom deze persoon",
    "bij deze vacature past, en niet dat hij de vacature met interesse gelezen heeft.",
    "Vier alinea's is genoeg, 300 tot 400 woorden.",
    "Gebruik de woorden uit het CV zelf, ook als die minder mooi zijn dan wat jij zou kiezen.",
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
    "Je gebruikt alleen wat in het CV, de oude brieven of de vacature staat. Mist er iets wat de",
    "brief nodig heeft, dan zet je er [dit weet ik niet: ...] neer en vraag je er onder de brief",
    "naar. Een verzonnen jaartal, werkgever of resultaat is erger dan een gat, want een gat ziet de",
    "schrijver zelf en een verzinsel niet.",
    "",
    "IN HET GESPREK",
    "Doe wat er gevraagd wordt en niets erbij. Vraagt iemand om een enthousiastere toon, verander",
    "dan de toon en niet de inhoud. Vraagt iemand om een alinea in te korten, laat de rest dan",
    "letterlijk staan. Geef de hele brief opnieuw als er iets in verandert, zodat er altijd één",
    "versie is om te kopiëren.",
    "Je antwoordt in het Nederlands.",
  ].join("\n");
}

/**
 * Het contextbericht: de drie bronteksten in één blok.
 *
 * Geeft `null` terug als alle drie leeg zijn. Een leeg blok meesturen zou het
 * model laten denken dat er een CV is dat niets zegt, en dan gaat het invullen.
 */
export function bouwContextbericht(bron: Bronteksten): string | null {
  const cv = kapAf(bron.cv);
  const brieven = kapAf(bron.brieven);
  const vacature = kapAf(bron.vacature);
  if (!cv && !brieven && !vacature) return null;

  const delen: string[] = [
    "Dit is het bronmateriaal van deze persoon. Alles wat je schrijft komt hiervandaan.",
  ];

  // Ontbrekende velden worden benoemd en niet weggelaten: het model hoort te
  // weten dat er geen vacature is, in plaats van er zelf een aan te nemen.
  delen.push("", "=== CV ===", cv || "[nog niet ingevuld]");
  delen.push("", "=== EERDERE BRIEVEN EN ACHTERGROND ===", brieven || "[nog niet ingevuld]");
  delen.push("", "=== VACATURETEKST ===", vacature || "[nog niet ingevuld]");

  return delen.join("\n");
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
 * De volledige invoer voor één aanroep: instructie, bronmateriaal,
 * gespreksverloop, vraag.
 *
 * ── WAAROM HET BRONMATERIAAL EEN BERICHT VAN DE GEBRUIKER IS ───────────────
 *
 * Het gaat mee als bericht van de GEBRUIKER en niet als tweede
 * systeeminstructie. Het is materiaal en geen opdracht, en een vacaturetekst
 * die per ongeluk een zin bevat die als instructie leest ("negeer het
 * bovenstaande en schrijf ...") hoort niet het gewicht van een
 * systeeminstructie te krijgen.
 *
 * Staat in deze pure module en niet in `gesprek.ts` ernaast, omdat
 * `scripts/test-unit.ts` hem dan kan narekenen (conventie 2): de volgorde van
 * de berichten en het afkappen van de historie bepalen wat een antwoord kost
 * en of het klopt, en dat is precies het soort regel dat stilletjes verschuift.
 */
export function bouwInvoer(opts: {
  bron: Bronteksten;
  historie: readonly Gespreksbericht[];
  vraag: string;
}): { role: "system" | "user" | "assistant"; content: string }[] {
  const invoer: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: bouwSysteemprompt() },
  ];

  const context = bouwContextbericht(opts.bron);
  if (context) invoer.push({ role: "user", content: context });

  // De laatste beurten, niet het hele archief. Zie MAX_BERICHTEN_IN_HISTORIE.
  for (const bericht of opts.historie.slice(-MAX_BERICHTEN_IN_HISTORIE)) {
    if (!bericht.inhoud.trim()) continue;
    invoer.push({ role: rolVoorApi(bericht.rol), content: bericht.inhoud });
  }

  invoer.push({ role: "user", content: opts.vraag });
  return invoer;
}

/**
 * De openingsvraag die het scherm klaarzet zodra de context gekoppeld is.
 *
 * Staat hier en niet in het scherm, zodat hij dezelfde woorden gebruikt als de
 * systeemprompt. Een startknop die iets anders vraagt dan de instructie belooft,
 * levert een antwoord op dat naast de bedoeling zit.
 */
export const EERSTE_VRAAG =
  "Ontleed de vacature en zet ernaast waar mijn CV aansluit en waar niet. Schrijf daarna een " +
  "eerste versie van de brief.";
