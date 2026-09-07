/**
 * De rangorde van voorgestelde onderwerpen: van wat het model teruggaf naar de
 * kolom `profile_topics.priority`.
 *
 * ── WAAROM DIT EEN EIGEN, PURE MODULE IS (conventie 2) ──────────────────────
 *
 * Dit stond als één regel in de insert van `propose-topics.ts`, en die regel
 * was fout:
 *
 *     priority: Math.max(0, MAX_TOPICS - (Number.isFinite(t.priority) ? t.priority : i + 1))
 *
 * `MAX_TOPICS` is 8, dus elke waarde van 8 of hoger valt terug op 0. Bij Van
 * den Udenhout (7 september 2026) kwamen alle zeven onderwerpen binnen op 0, en
 * omdat de clusterlijst op `priority desc` sorteert stond het scherm in
 * willekeurige volgorde. Precies op het moment dat de consultant moet kiezen
 * welk cluster als eerste draait, en dat is een betaalde meetronde.
 *
 * De oorzaak zit niet in de rekenregel maar in de aanname eronder: nergens
 * kreeg het model te horen wat het bereik van `priority` was. De regel "1 is
 * het belangrijkste" stond als TypeScript-commentaar boven het veld en gaat dus
 * niet mee in het schema dat naar de API gaat. `Number.isFinite()` ving alleen
 * een niet-getal af, niet een getal buiten het bereik: dat is een halve
 * controle, en een halve controle is hier erger dan geen, want hij levert stil
 * een geldig ogende 0 op.
 *
 * Conventie 1: de prompt zegt het nu (rangorderegel in `propose-topics.ts`,
 * plus een `.describe()` op het veld zelf), en dit is het vangnet erachter.
 *
 * ── WAT DE UITKOMST GARANDEERT ──────────────────────────────────────────────
 *
 * Voor n onderwerpen komen er precies de getallen n tot en met 1 uit, elk één
 * keer, hoogste eerst. Dus: nooit twee onderwerpen op dezelfde plek, en nooit
 * een 0. Die laatste garantie is meer waard dan hij lijkt, want zo blijft 0
 * betekenen "hier heeft nooit iemand een rangorde gezet".
 *
 * Dezelfde vorm als `propose-more-topics.ts`, dat de rangorde al puur op de
 * volgorde van het model baseerde (`voorstellen.length - i`). Het verschil is
 * dat een eerste ronde de rangorde van het model wél gebruikt als die bruikbaar
 * is; een vervolgronde vult alleen aan en heeft niets te herordenen.
 */

/**
 * Een onbruikbare rang moet achteraan sorteren, maar `Infinity - Infinity` is
 * `NaN` en dan valt de vergelijkfunctie stil om. Vandaar een groot eindig
 * getal: twee onbruikbare rangen leveren 0 op, en dan beslist de volgorde
 * waarin het model ze teruggaf.
 */
const ACHTERAAN = Number.MAX_SAFE_INTEGER;

/** Telt deze waarde als rangorde? Een heel getal van 1 tot en met `max`. */
function bruikbareRang(waarde: unknown, max: number): number | null {
  return typeof waarde === "number" && Number.isInteger(waarde) && waarde >= 1 && waarde <= max
    ? waarde
    : null;
}

/**
 * Van de rangorde die het model gaf naar de op te slaan prioriteiten, op
 * dezelfde volgorde als de invoer.
 *
 * @param rangen  Wat het model per onderwerp als `priority` teruggaf, in de
 *                volgorde waarin de onderwerpen binnenkwamen.
 * @param max     Het hoogste rangnummer dat nog telt, gelijk aan het maximum
 *                aantal onderwerpen.
 */
export function topicPriorities(rangen: unknown[], max: number): number[] {
  const genummerd = rangen.map((waarde, index) => ({
    index,
    rang: bruikbareRang(waarde, max) ?? ACHTERAAN,
  }));

  // Stabiel sorteren: bij een gelijke rang (het model gaf twee keer dezelfde)
  // of bij twee onbruikbare rangen beslist de volgorde van het model zelf.
  const gesorteerd = [...genummerd].sort((a, b) => a.rang - b.rang || a.index - b.index);

  const uitkomst = new Array<number>(rangen.length);
  gesorteerd.forEach((item, plek) => {
    uitkomst[item.index] = rangen.length - plek;
  });
  return uitkomst;
}
