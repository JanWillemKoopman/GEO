import { Icon } from "@/components/icon";

/**
 * Het blokje met één cijfer erin, voor de strook bovenaan een scherm.
 *
 * ── DRIE REGELS DIE UIT `CLAUDE.md` KOMEN EN HIER VORM KRIJGEN ──────────────
 *
 * 1. **Onbekend is een betere waarde dan een verkeerde** (conventie 3). Geef
 *    `waarde={null}` en er staat een liggend streepje met "nog niet gemeten"
 *    eronder. Nooit een nul, nooit een gok. Een nul is een meting die zegt dat
 *    het merk nergens genoemd wordt; leeg is een meting die niet bestaat.
 *
 * 2. **Zeg het gevolg van een cijfer, niet alleen het cijfer.** Vandaar
 *    `toelichting`: één korte zin onder de waarde die zegt wat het betekent.
 *    Hij is optioneel maar bijna altijd de moeite waard.
 *
 * 3. **Schrijf nooit dat iets al kan wat nog niet gebouwd is.** Een datakaart
 *    zonder bron is een bewering. Wie een cijfer toont dat nog nergens op rust,
 *    hoort `waarde={null}` te geven.
 *
 * ── DE HIËRARCHIE KOMT VAN DE MAAT ──────────────────────────────────────────
 *
 * 24 pixels voor het getal, 12 voor het label, gewicht 500 tegen 400. GEMETEN
 * bij OKX. Het getal is dus niet zwaarder gemaakt maar groter, en dat is het
 * verschil tussen een kaart die leest als data en een kaart die schreeuwt.
 *
 * De vorm staat in `app/globals.css` onder "Datakaart". Zie `redesign2026.md`
 * §7.10.
 */
export function DataCard({
  label,
  waarde,
  toelichting,
  verschil,
  children,
}: {
  label: string;
  /** `null` betekent: niet gemeten. Zie regel 1 hierboven. */
  waarde: string | null;
  /** Wat het cijfer betekent, in één korte zin. */
  toelichting?: string;
  /**
   * De verandering ten opzichte van de vorige meting. Laat weg als er geen
   * vorige meting is: een verschil van nul tegenover niets is geen nul.
   *
   * `oordeel` is er voor een cijfer waar lager beter is (een positie in
   * Google): het pijltje volgt de richting, de kleur volgt het oordeel. Zonder
   * oordeel volgt de kleur de richting.
   */
  verschil?: {
    tekst: string;
    richting: "omhoog" | "omlaag" | "vlak";
    oordeel?: "beter" | "slechter";
  };
  /** Wat er verder bij het cijfer hoort, onder de toelichting (een verdeling, een lijstje). */
  children?: React.ReactNode;
}) {
  const gemeten = waarde !== null;
  const kleur = verschil?.oordeel
    ? verschil.oordeel === "beter"
      ? "omhoog"
      : "omlaag"
    : verschil?.richting;

  return (
    <div className="data-card">
      <span className="data-card-label">{label}</span>

      <span className="data-card-waarde" style={gemeten ? undefined : { color: "var(--text-disabled)" }}>
        {gemeten ? waarde : "–"}
      </span>

      {verschil && gemeten && (
        <span className={`data-card-verschil data-card-verschil-${kleur}`}>
          {/* Kleur en vorm samen, nooit kleur alleen: wie rood en groen niet uit
              elkaar houdt leest het pijltje. */}
          <Icon
            naam={
              verschil.richting === "omhoog"
                ? "stijging"
                : verschil.richting === "omlaag"
                  ? "daling"
                  : "nvt"
            }
            size={14}
          />
          {verschil.tekst}
        </span>
      )}

      {/* Staat er geen meting, dan zegt de kaart dát in plaats van niets. Een
          leeg blokje laat de lezer raden of het nul is of stuk. */}
      {!gemeten && <span className="type-caption text-muted">Nog niet gemeten</span>}

      {toelichting && gemeten && <span className="type-caption text-muted">{toelichting}</span>}

      {children}
    </div>
  );
}

export function DataCardRij({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
  );
}
