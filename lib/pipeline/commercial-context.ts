/**
 * De commerciële laag als leesbare context voor de pijplijn.
 * (onboarding 3.0, fase 4)
 *
 * ── WAAROM ÉÉN MODULE EN GEEN TWAALF LOSSE REGELS ───────────────────────────
 *
 * Migratie 0060 voegde twaalf velden toe die alleen uit het gesprek komen. Elk
 * veld heeft precies één lezer in de pijplijn, en die staat in het commentaar
 * van de migratie. Wat die lezers gemeen hebben is de vorm: een blok tekst dat
 * een promptinstructie in gaat, of een deterministische controle achteraf.
 *
 * Die blokken staan hier bij elkaar, puur en zonder `server-only`, om drie
 * redenen:
 *
 *   1. Ze zijn te testen zonder database of API-sleutel (conventie 2).
 *   2. De formulering is de instructie. Staat "schrijf hier niet over" op vier
 *      plekken net anders, dan gedraagt het model zich op vier plekken anders.
 *   3. Een veld dat nergens gelezen wordt valt hier op, want dan heeft het geen
 *      functie in dit bestand.
 *
 * ⚠️ Een leeg veld levert een LEGE string op, geen regel met niets erachter.
 * "Verboden onderwerpen: " in een prompt is erger dan niets: het model gaat er
 * betekenis aan geven.
 *
 * ── ELF VAN DE TWAALF, EN WAAROM ────────────────────────────────────────────
 *
 * `deal_value_band` staat hier bewust NIET in. De migratie noemt de
 * potentiescore als zijn lezer, en dat blijkt bij het bouwen niet te kloppen:
 * die score is per onderwerp en de waardeklasse is per merk, dus een factor zou
 * élk onderwerp van een merk even hard verschuiven. De onderlinge volgorde,
 * het enige waar die score voor gebruikt wordt, verandert daar niet van, terwijl
 * de schaal van 0 tot 100 en de drie banden eronder wél kapotgaan. Het veld
 * wordt vastgelegd en getoond; een lezer krijgt het pas als er een beslissing
 * is die merken onderling vergelijkt.
 *
 * ── WAAROM DE CLUSTERKEUZE (`topicSteering`) NIET ALLE TWAALF LEEST ─────────
 *
 * Werkpakket A §4 van docs/optimalisatielab-orbit-engine.md vraagt "alle
 * strategische velden" in de instructie die clusters genereert. Dat is geen
 * automatisme: een veld hoort daar alleen bij als het antwoord geeft op de
 * vraag die `topicSteering` stelt, namelijk WELK ONDERWERP. `goal_12m` doet dat
 * ("groeien naar meer trouwhulp" duwt een onderwerp als "trouwhulp huren" naar
 * boven) en staat er daarom nu bij. `growth_regions`, `seasonality`,
 * `sales_objections` en `offline_proof` geven geen antwoord op WELK onderwerp,
 * ze bepalen HOE er binnen een al gekozen onderwerp gevraagd en geschreven
 * wordt (een plaatsnaam is geen onderwerp, een seizoenspiek evenmin), en hebben
 * daarom hun eigen lezer verderop in dit bestand: `growthRegionsRule` in
 * `prompts.ts`, `goalRule`'s seizoensdeel en `objectionsRule` in `briefing.ts`
 * en `content.ts`, `offlineProofFacts` in `factbase.ts`. Ze daar wegplukken en
 * ook in de clusterkeuze douwen zou dezelfde fout maken die `deal_value_band`
 * hierboven al voorkwam: een veld met de verkeerde vorm in een instructie
 * proppen waar het geen zinnig antwoord op geeft.
 */
import type { Profile } from "@/lib/types/database";

/** Wat deze module minimaal nodig heeft. Bewust smal, zodat de test niet een heel profiel hoeft na te bouwen. */
export type CommercialFields = Pick<
  Profile,
  | "priority_offerings"
  | "deprioritised_offerings"
  | "growth_regions"
  | "target_segments"
  | "seasonality"
  | "sales_objections"
  | "forbidden_topics"
  | "offline_proof"
  | "respect_site_structure"
  | "goal_12m"
>;

function lijst(v: string[] | null | undefined): string[] {
  return (v ?? []).map((s) => s.trim()).filter(Boolean);
}

/**
 * Voor `propose-topics.ts`: waar de onderwerpen wél en niet over mogen gaan.
 *
 * Vier velden bij elkaar, want ze beantwoorden één vraag van het model: welke
 * onderwerpen zijn commercieel de moeite waard? Zonder dit stelt het model
 * onderwerpen voor op grond van wat er toevallig op de site staat, en dat is
 * precies het aanbod waar de klant vanaf wil.
 */
export function topicSteering(p: Pick<CommercialFields,
  "priority_offerings" | "deprioritised_offerings" | "target_segments" | "forbidden_topics" | "goal_12m">): string {
  const regels: string[] = [];
  const voorop = lijst(p.priority_offerings);
  const achteraan = lijst(p.deprioritised_offerings);
  const segmenten = lijst(p.target_segments);
  const verboden = lijst(p.forbidden_topics);

  if (voorop.length > 0) {
    regels.push(
      `COMMERCIEEL VOOROP (het bedrijf wil hier groeien, geef deze voorrang): ${voorop.join(", ")}.`,
    );
  }
  if (achteraan.length > 0) {
    regels.push(
      `NIET VOORSTELLEN (te weinig marge of wordt uitgefaseerd): ${achteraan.join(", ")}. ` +
        `Stel hier geen onderwerp over voor, ook niet als de site er veel over zegt.`,
    );
  }
  if (segmenten.length > 0) {
    regels.push(
      `DE KLANTGROEPEN WAAR DE GROEI ZIT: ${segmenten.join(", ")}. ` +
        `Kies onderwerpen waar juist deze groepen naar zoeken.`,
    );
  }
  if (verboden.length > 0) {
    regels.push(
      `VERBODEN ONDERWERPEN (juridisch of concurrentiegevoelig, nooit voorstellen): ${verboden.join(", ")}.`,
    );
  }
  // Het doel is geen segment en geen dienst, maar wel de reden waarom het ene
  // onderwerp meer waard is dan het andere op dit moment (0075).
  if (p.goal_12m?.trim()) {
    regels.push(
      `HET DOEL OVER TWAALF MAANDEN: ${p.goal_12m.trim()}. Geef onderwerpen die hieraan bijdragen ` +
        `voorrang boven onderwerpen die dat niet doen.`,
    );
  }

  return regels.length === 0 ? "" : `\n\n${regels.join("\n")}`;
}

/**
 * Voor `report.ts`: waar de klant naartoe wil, als weegfactor bij de adviezen.
 *
 * ⚠️ Kwaliteitsdoorlichting 24 september 2026, punt 27. Het rapport kreeg alleen
 * de meting en de site mee. Drie blinde lezers kwamen onafhankelijk op hetzelfde
 * uit: het advies stuurt op wat gemeten is, niet op wat de ondernemer wil. De
 * rijschool kreeg pagina's voor Helmond en Waalre (geen groeiplaatsen) en niets
 * over autisme en ADHD (het eerste groeidoel). In de invoer van het
 * installateursrapport kwamen "Mierlo" en "1.800" nul keer voor.
 *
 * De eigenaar besliste dezelfde dag: groeidoelen tellen zwaar. De instructie
 * staat hier, de weging zelf in `rangschikAanbevelingen()` (recommendation.ts),
 * want een instructie is een intentie (conventie 1).
 */
export function reportSteering(
  p: Pick<
    CommercialFields,
    | "priority_offerings"
    | "deprioritised_offerings"
    | "growth_regions"
    | "target_segments"
    | "forbidden_topics"
    | "offline_proof"
  >,
): string {
  const regels: string[] = [];
  const voorop = lijst(p.priority_offerings);
  const achteraan = lijst(p.deprioritised_offerings);
  const regios = lijst(p.growth_regions);
  const segmenten = lijst(p.target_segments);
  const verboden = lijst(p.forbidden_topics);
  const bewijs = lijst(p.offline_proof);

  if (voorop.length > 0 || regios.length > 0) {
    regels.push(
      `DE GROEIDOELEN VAN DE KLANT WEGEN ZWAAR. ` +
        (voorop.length > 0 ? `Het aanbod waarin hij wil groeien: ${voorop.join(", ")}. ` : "") +
        (regios.length > 0 ? `De plaatsen waar hij wil groeien: ${regios.join(", ")}. ` : "") +
        `Een aanbeveling die hierop aansluit gaat vóór een even zware gemiste vraag die dat niet ` +
        `doet. Is er een gemeten gemis over een groeidoel of groeiplaats, laat het dan niet liggen.`,
    );
  }
  if (segmenten.length > 0) {
    regels.push(`DE KLANTGROEPEN WAAR DE GROEI ZIT: ${segmenten.join(" · ")}.`);
  }
  if (achteraan.length > 0) {
    regels.push(
      `NIET ADVISEREN (te weinig marge of wordt uitgefaseerd): ${achteraan.join(", ")}.`,
    );
  }
  if (verboden.length > 0) {
    regels.push(
      `VERBODEN ONDERWERPEN (nooit adviseren, ook niet als de meting erom vraagt): ${verboden.join(", ")}.`,
    );
  }
  // Punt 35 en 36: de rapportvragen vroegen de klant naar wat hij net vertelde.
  if (bewijs.length > 0) {
    regels.push(
      `WAT DE KLANT AL VERTELDE (bevestigd, gebruik het en vraag er NIET opnieuw naar in ` +
        `factRequests): ${bewijs.join(" · ")}.`,
    );
  }
  return regels.length === 0 ? "" : `\n${regels.join("\n")}`;
}

/**
 * De woorden waaraan een aanbeveling als "groeidoel" herkend wordt.
 *
 * Groeiplaatsen letterlijk; het aanbod op zijn kernwoorden, want "Rijles bij
 * faalangst, autisme en ADHD" staat nooit letterlijk in een titel, "faalangst"
 * wel. Woorden die in elke aanbeveling van de branche staan ("rijles",
 * "complete") vallen af, anders telt alles als groeidoel en weegt niets zwaar.
 */
const GEEN_KERNWOORD = new Set([
  "complete", "compleet", "particulieren", "particuliere", "zakelijke", "losse", "opdracht",
  "rijles", "rijlessen", "service", "diensten", "advies", "klanten", "woning", "woningen",
]);

function stam(w: string): string {
  if (w.length > 7 && w.endsWith("en")) return w.slice(0, -2);
  if (w.length > 6 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

export function groeiKernwoorden(p: {
  priority_offerings: string[] | null | undefined;
  growth_regions: string[] | null | undefined;
}): { plaatsen: string[]; woorden: string[] } {
  const woorden = new Set<string>();
  for (const aanbod of lijst(p.priority_offerings)) {
    for (const ruw of aanbod.split(/[^\p{L}\p{N}]+/u)) {
      const acroniem = ruw.length >= 3 && ruw === ruw.toUpperCase() && /\p{L}/u.test(ruw);
      const w = ruw.toLowerCase();
      if (!acroniem && w.length < 6) continue;
      if (GEEN_KERNWOORD.has(w)) continue;
      woorden.add(stam(w));
    }
  }
  return { plaatsen: lijst(p.growth_regions), woorden: [...woorden] };
}

/** Raakt deze tekst een groeidoel? Plaats op woordgrens, aanbod als deel van een woord. */
export function raaktGroeidoel(
  tekst: string,
  doel: { plaatsen: string[]; woorden: string[] },
): boolean {
  const lower = tekst.toLowerCase();
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const pl of doel.plaatsen) {
    if (new RegExp(`(^|[^\\p{L}\\p{N}])${esc(pl.toLowerCase())}([^\\p{L}\\p{N}]|$)`, "u").test(lower)) return true;
  }
  for (const w of doel.woorden) {
    // Ook midden in een woord: "warmtepomp" raakt "hybridewarmtepomp" en
    // "warmtepompen", "ketelvervanging" raakt "cv-ketelvervanging". De woorden
    // zijn minstens zes letters, dus toevallige treffers zijn zeldzaam.
    if (lower.includes(w)) return true;
  }
  return false;
}

/**
 * Voor `prompts.ts`: waar het merk heen wil.
 *
 * ⚠️ Naast `service_regions` en niet in plaats daarvan. Het werkgebied is waar
 * het merk nu al werkt en bepaalt of de vragen regionaal gesteld worden; dit is
 * de ambitie, en die levert extra vragen op in een gebied waar het merk vandaag
 * nog niet gevonden wordt. Dat is precies het gat dat een klant wil zien.
 */
export function growthRegionsRule(
  p: Pick<CommercialFields, "growth_regions">,
  aantal?: { nodig: number; van: number },
): string {
  const regios = lijst(p.growth_regions);
  if (regios.length === 0) return "";
  // ⚠️ "Een deel" leverde 0 van de 30 op (kwaliteitsdoorlichting, punt 5): naast
  // een harde regel in hoofdletters verliest een zachte altijd. Nu een aantal,
  // met een telling in code erachter (`groeiBalans` in geo-share.ts).
  const hoeveel = aantal
    ? `MINSTENS ${aantal.nodig} van de ${aantal.van} vragen`
    : "een deel van de vragen";
  return (
    `\n\nDit bedrijf WIL groeien in: ${regios.join(", ")}. Het werkt daar nog niet, dus laat ` +
    `${hoeveel} over een van deze plaatsen gaan, alsof een koper daar zoekt. Zo wordt zichtbaar ` +
    `of het merk daar al genoemd wordt.`
  );
}

/**
 * Voor `briefing.ts` en `content.ts`: de bezwaren die in elk verkoopgesprek
 * terugkomen.
 *
 * Het meest ondergewaardeerde veld van de twaalf. Een AI-antwoord heeft vaak
 * precies de vorm van een bezwaar ("is dat niet duur?", "kan dat wel bij een
 * klein bedrijf?"), en een pagina die het bezwaar benoemt en weerlegt, is de
 * pagina die geciteerd wordt.
 */
export function objectionsRule(p: Pick<CommercialFields, "sales_objections">): string {
  const bezwaren = lijst(p.sales_objections);
  if (bezwaren.length === 0) return "";
  return (
    `\n\nDE BEZWAREN DIE DEZE KLANT IN ELK VERKOOPGESPREK HOORT: ${bezwaren.join(" · ")}\n` +
    `Behandel er minstens één expliciet en weerleg hem met een feit, niet met een belofte. ` +
    `Een AI-assistent krijgt deze bezwaren als vraag voorgelegd.`
  );
}

/**
 * Voor `factbase.ts`: bewijs dat nergens op de site staat.
 *
 * ⚠️ Staat naast `proof_points` en vervangt hem niet. Die tweede is per
 * definitie letterlijk uit de site geëxtraheerd, en dat is de grondslag onder
 * contentkwaliteit A2: elk proof point staat op een bronpagina. Dit is de
 * tegenhanger, met de klant als bron, en dat hoort er ook bij te staan.
 */
export function offlineProofFacts(
  p: Pick<CommercialFields, "offline_proof">,
): { text: string; source: string }[] {
  return lijst(p.offline_proof).map((f) => ({
    text: f,
    source: "opgegeven in het gesprek",
  }));
}

/**
 * Voor `content-gate.ts`: staat er een verboden onderwerp in de tekst?
 *
 * Deterministisch en niet gevraagd aan het model (conventie 1). Een
 * promptinstructie is een intentie; dit is de garantie. Zelfde patroon als
 * `checkTabooWords()`, dat hetzelfde doet voor verboden wóórden.
 */
export function forbiddenTopicHits(
  text: string,
  p: Pick<CommercialFields, "forbidden_topics">,
): string[] {
  const lower = text.toLowerCase();
  return lijst(p.forbidden_topics).filter((t) => lower.includes(t.toLowerCase()));
}

/**
 * Voor `structure-gap.ts` en `plan-build.ts`: mogen er nieuwe pagina's bij?
 *
 * `null` betekent niet vastgesteld, en dan blijft het gedrag zoals het altijd
 * was: het advies mag nieuwe pagina's voorstellen. Alleen een expliciete "nee"
 * verandert er iets, en dat is de bedoeling van conventie 3.
 */
export function siteStructureRule(
  p: Pick<CommercialFields, "respect_site_structure">,
): string {
  if (p.respect_site_structure !== false) return "";
  return (
    `\n\nDe klant wil BINNEN de bestaande sitestructuur blijven. Stel geen nieuwe pagina's voor; ` +
    `geef in plaats daarvan aan welke bestaande pagina uitgebreid of herschreven moet worden.`
  );
}

/**
 * Voor `plan-build.ts` en de duiding in het rapport: waar het merk over twaalf
 * maanden wil staan, plus wanneer zijn drukte valt.
 */
export function goalRule(
  p: Pick<CommercialFields, "goal_12m" | "seasonality">,
): string {
  const regels: string[] = [];
  if (p.goal_12m?.trim()) {
    regels.push(`HET DOEL OVER TWAALF MAANDEN: ${p.goal_12m.trim()}`);
  }
  if (p.seasonality?.trim()) {
    regels.push(
      `PIEKEN EN DALEN IN HET JAAR: ${p.seasonality.trim()} ` +
        `Zet werk dat op een piek mikt ruim vóór die piek in de planning.`,
    );
  }
  return regels.length === 0 ? "" : `\n\n${regels.join("\n")}`;
}
