/**
 * Van een reeks punten een vloeiend lijnpad maken voor een SVG-grafiek.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * Drie grafieken tekenen een lijn (`TrendChart`, `PagesTrafficChart`,
 * `Sparkline`) en ze deden dat alle drie met hun eigen stukje code. Een
 * rondingsregel die op drie plekken staat is een regel die op drie plekken
 * uit elkaar groeit. Conventie 2 van `CLAUDE.md`: rekenkunde staat in een pure
 * module zonder `server-only`, testbaar vanuit `scripts/test-unit.ts`.
 *
 * ── WAAROM MONOTONE INTERPOLATIE EN GEEN GEWONE SPLINE ──────────────────────
 *
 * Dit is het hele punt van dit bestand, en het is geen smaakkwestie.
 *
 * De voor de hand liggende manier om een hoekige lijn rond te maken is een
 * Catmull-Rom-spline: leg een soepele kromme door de punten heen. Die kromme
 * SCHIET DOOR. Tussen twee metingen van 40 en 95 zwiept hij boven de 100 uit,
 * en tussen twee gelijke metingen van 60 legt hij een kuiltje of een bultje
 * dat in de data niet bestaat. Op deze grafieken zou dat betekenen: een
 * zichtbaarheid van 104% tekenen, of een daling laten zien in een week waarin
 * niets daalde. Dat is regel 3 van `CLAUDE.md` op zijn kop: dan is de grafiek
 * geen onbekende waarde meer maar een verkeerde.
 *
 * De monotone variant (Fritsch en Carlson, 1980) lost precies dat op. Hij
 * knijpt de raaklijn in elk punt af zodat het pad tussen twee punten nooit
 * buiten die twee waarden komt, en zodat een stijgend stuk stijgend blijft en
 * een vlak stuk vlak. Je krijgt de ronding zonder de verzinsels.
 *
 * De prijs is er wel, en die staat hier zodat niemand hem hoeft te herontdekken:
 * ook een monotone kromme suggereert dat er tússen twee metingen iets bekend
 * is, en dat is niet zo. De grafiek toont de metingen; de bocht ertussen is
 * vormgeving. Vandaar dat de punten zelf zichtbaar blijven staan en dat er
 * onder `TrendChart` een tabel met de echte cijfers zit.
 */

export interface CurvePunt {
  x: number;
  y: number;
}

/** Op hoeveel decimalen de coördinaten in het pad terechtkomen. */
const DECIMALEN = 1;

function rond(n: number): string {
  return n.toFixed(DECIMALEN);
}

/**
 * De raaklijnen per punt, afgeknepen zodat de kromme niet doorschiet.
 *
 * `helling[i]` is de helling van het stuk tussen punt i en i+1. Het gemiddelde
 * van de twee hellingen naast een punt is de natuurlijke raaklijn daar; de
 * twee correcties eronder zijn wat deze interpolatie monotoon maakt.
 */
function raaklijnen(punten: CurvePunt[]): number[] {
  const n = punten.length;
  const helling: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = punten[i + 1].x - punten[i].x;
    // Twee punten op dezelfde x kunnen niet: dan is er geen helling en zou er
    // door nul gedeeld worden. Komt op deze grafieken niet voor (de x is een
    // meetmoment), maar een grafiek hoort niet stuk te gaan aan dubbele data.
    helling.push(dx === 0 ? 0 : (punten[i + 1].y - punten[i].y) / dx);
  }

  const m: number[] = new Array(n);
  m[0] = helling[0];
  m[n - 1] = helling[n - 2];
  for (let i = 1; i < n - 1; i++) {
    // Correctie 1: draait de lijn hier om (van stijgen naar dalen), dan is de
    // raaklijn vlak. Zonder deze regel schiet de kromme over de top heen.
    m[i] = helling[i - 1] * helling[i] <= 0 ? 0 : (helling[i - 1] + helling[i]) / 2;
  }

  // Correctie 2: de raaklijn mag nooit meer dan drie keer zo steil zijn als het
  // flauwste stuk ernaast. Dat is de voorwaarde van Fritsch en Carlson, en het
  // is wat garandeert dat het pad tussen twee punten binnen die twee waarden
  // blijft. Zonder deze regel blijft de richting kloppen maar bolt de bocht
  // alsnog boven de hoogste meting uit.
  for (let i = 0; i < n - 1; i++) {
    if (helling[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / helling[i];
    const b = m[i + 1] / helling[i];
    const s = Math.hypot(a, b);
    if (s > 3) {
      m[i] = ((3 / s) * a) * helling[i];
      m[i + 1] = ((3 / s) * b) * helling[i];
    }
  }
  return m;
}

/**
 * Het `d`-attribuut van een vloeiende lijn door deze punten.
 *
 * De punten moeten op oplopende x staan; dat is bij alle drie de grafieken zo,
 * want de x is de tijd. Nul punten geeft een leeg pad (een `<path>` met een
 * lege `d` tekent niets en geeft geen fout), één punt geeft alleen het
 * beginpunt, en twee punten geven een rechte lijn: door twee punten is de
 * vloeiende lijn per definitie recht.
 */
export function vloeiendPad(punten: CurvePunt[]): string {
  if (punten.length === 0) return "";
  const start = `M${rond(punten[0].x)},${rond(punten[0].y)}`;
  if (punten.length === 1) return start;
  if (punten.length === 2) {
    return `${start} L${rond(punten[1].x)},${rond(punten[1].y)}`;
  }

  const m = raaklijnen(punten);
  let d = start;
  for (let i = 0; i < punten.length - 1; i++) {
    const p = punten[i];
    const q = punten[i + 1];
    // Een derde van de horizontale afstand: dat is de standaardomzetting van
    // een raaklijn naar de twee stuurpunten van een Bézier-kromme.
    const dx = (q.x - p.x) / 3;
    d +=
      ` C${rond(p.x + dx)},${rond(p.y + m[i] * dx)}` +
      ` ${rond(q.x - dx)},${rond(q.y - m[i + 1] * dx)}` +
      ` ${rond(q.x)},${rond(q.y)}`;
  }
  return d;
}

/**
 * Hetzelfde pad, maar teruggelopen: voor de onderrand van een vlak.
 *
 * `TrendChart` tekent de onzekerheidsband als één gesloten vorm: de bovenrand
 * heen, de onderrand terug. Die terugweg moet dezelfde ronding krijgen, anders
 * krijgt de band een vloeiende bovenkant op een hoekige onderkant.
 *
 * Het pad begint hier met een `L` in plaats van een `M`, zodat het aan de
 * bovenrand vastzit in plaats van een tweede losse vorm te worden.
 */
export function vloeiendPadTerug(punten: CurvePunt[]): string {
  const pad = vloeiendPad([...punten].reverse());
  return pad.startsWith("M") ? `L${pad.slice(1)}` : pad;
}
