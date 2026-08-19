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
  "priority_offerings" | "deprioritised_offerings" | "target_segments" | "forbidden_topics">): string {
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

  return regels.length === 0 ? "" : `\n\n${regels.join("\n")}`;
}

/**
 * Voor `prompts.ts`: waar het merk heen wil.
 *
 * ⚠️ Naast `service_regions` en niet in plaats daarvan. Het werkgebied is waar
 * het merk nu al werkt en bepaalt of de vragen regionaal gesteld worden; dit is
 * de ambitie, en die levert extra vragen op in een gebied waar het merk vandaag
 * nog niet gevonden wordt. Dat is precies het gat dat een klant wil zien.
 */
export function growthRegionsRule(p: Pick<CommercialFields, "growth_regions">): string {
  const regios = lijst(p.growth_regions);
  if (regios.length === 0) return "";
  return (
    `\n\nDit bedrijf WIL groeien in: ${regios.join(", ")}. Het werkt daar nog niet, dus stel ` +
    `over deze plaatsen een deel van de vragen alsof een koper daar zoekt. Zo wordt zichtbaar ` +
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
