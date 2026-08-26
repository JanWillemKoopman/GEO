import { tonePercent } from "@/lib/reputation/screen";

/**
 * De toon als plek op een schaal, met de marge eromheen zichtbaar.
 *
 * ── WAAROM DIT VIJF CHIPS VERVANGT ──────────────────────────────────────────
 *
 * Bovenaan het scherm stonden er vijf naast elkaar: "neutraal 0", "marge ±6",
 * "bewijs 99", "1.7e van 4 · indicatief" en "eenduidigheid 71". Vier schalen die
 * de klant niet deelt, in dezelfde vorm en hetzelfde gewicht, waarvan er precies
 * één het hoofdgetal van dit scherm was. `ux-design.md` §1 kent er één.
 *
 * De meter doet drie dingen die de chip niet kon:
 *
 *   1. Hij toont de schaal zelf. Nul betekent niets zonder te weten dat de
 *      schaal van -100 tot 100 loopt, en dat stond alleen in een tooltip.
 *   2. Hij toont de marge als band en niet als tweede getal. Een marge van ±6
 *      punten is op deze breedte een streepje van drie procent, en dat is
 *      precies de juiste indruk: dit cijfer beweegt niet snel.
 *   3. Hij zegt in woorden wat de uitslag is, met het cijfer klein erachter.
 *
 * ── ⚠️ DE KLEUR IS SECUNDAIR ────────────────────────────────────────────────
 *
 * Het woord staat er altijd bij (`designsystem.md` §C, principe 5). De baan is
 * neutraal grijs over de volle breedte; alleen de markering krijgt de tint van
 * het oordeel. Een baan die van rood naar groen verloopt zou van elke stand een
 * waardeoordeel maken, ook van "geen beeld", en dat is nu juist de stand waarbij
 * er niets te oordelen valt.
 */
export function ToneMeter({
  index,
  stderr,
  woord,
}: {
  /** De toonindex, -100 tot 100. `null` betekent: ChatGPT heeft geen beeld. */
  index: number | null;
  /** De standaardfout in punten. `null` bij te weinig antwoorden. */
  stderr: number | null;
  /** Het woord bij deze stand, uit `reputationHeadline()`. */
  woord: string;
}) {
  if (index === null) {
    return (
      <div className="flex flex-col gap-2">
        <span className="type-body-emphasis">Geen beeld</span>
        <div className="h-2 w-full rounded-[var(--radius-pill)] bg-[var(--bg-elevated)]" />
        <p className="type-caption text-muted">
          ChatGPT weet te weinig over je om er iets over te zeggen. Dat is geen neutraal oordeel,
          het is geen oordeel.
        </p>
      </div>
    );
  }

  const plek = tonePercent(index);
  // De marge is een band van 95%, dus 1,96 keer de standaardfout, precies zoals
  // de chip hem eerder toonde. Zonder marge geen band: een streep zonder band
  // suggereert een precisie die er niet is, maar een verzonnen band ook.
  const marge = stderr === null ? null : Math.round(stderr * 1.96);
  const bandLinks = marge === null ? null : tonePercent(index - marge);
  const bandRechts = marge === null ? null : tonePercent(index + marge);

  const tint =
    index >= 20
      ? "var(--intent-growth-solid)"
      : index > -20
        ? "var(--text-secondary)"
        : "var(--intent-danger-solid)";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="type-body-emphasis">{woord[0].toUpperCase() + woord.slice(1)}</span>
        <span className="type-caption text-muted">
          {index > 0 ? `+${index}` : index} op een schaal van -100 tot 100
          {marge !== null && `, marge ${marge > 0 ? `±${marge}` : "kleiner dan 1"}`}
        </span>
      </div>

      <div
        className="relative h-2 w-full rounded-[var(--radius-pill)] bg-[var(--bg-elevated)]"
        role="img"
        aria-label={`Toon ${woord}, ${index} op een schaal van -100 tot 100`}
      >
        {/* Het midden van de schaal. Zonder dit streepje is niet te zien of een
            markering links of rechts van neutraal staat. */}
        <span
          className="absolute top-[-3px] bottom-[-3px] w-px"
          style={{ left: "50%", background: "var(--border-strong)" }}
        />
        {bandLinks !== null && bandRechts !== null && bandRechts - bandLinks > 0.5 && (
          <span
            className="absolute inset-y-0 rounded-[var(--radius-pill)] opacity-30"
            style={{
              left: `${bandLinks}%`,
              width: `${bandRechts - bandLinks}%`,
              background: tint,
            }}
          />
        )}
        <span
          className="absolute top-[-4px] bottom-[-4px] w-[3px] rounded-[var(--radius-pill)]"
          style={{ left: `calc(${plek}% - 1.5px)`, background: tint }}
        />
      </div>

      <div className="flex justify-between">
        <span className="type-caption text-muted">negatief</span>
        <span className="type-caption text-muted">neutraal</span>
        <span className="type-caption text-muted">positief</span>
      </div>
    </div>
  );
}
