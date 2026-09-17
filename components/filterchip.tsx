"use client";

/**
 * De filterchip: een keuze die aan of uit staat, in een rij met soortgenoten.
 *
 * ── WAAROM DIT GEEN KEUZELIJST IS ───────────────────────────────────────────
 *
 * Een keuzelijst verbergt wat er te kiezen valt tot je hem opent, en laat maar
 * één keuze tegelijk zien. Een rij chips laat alle opties én de huidige stand
 * in één blik zien, en dat is precies wat een filterbalk moet doen: de vraag is
 * nooit "welke opties zijn er" maar "wat staat er nu aan".
 *
 * De omslag zit bij ongeveer acht opties. Daarboven wordt de rij een blok dat
 * de tabel eronder wegduwt, en dan is een keuzelijst beter. `AnalyticsFilters`
 * gebruikt daarom nog keuzelijsten voor cluster en label (tientallen opties) en
 * deze chips voor periode en fase.
 *
 * ── DE STAAT IS EEN RAND EN GEEN VULLING ────────────────────────────────────
 *
 * GEMETEN bij OKX: een gekozen chip krijgt `border-selected` en houdt zijn
 * vulling. Het vlak in rust is al een waas; zou gekozen óók een vulling zijn,
 * dan was het verschil tussen "aanwijsbaar" en "aan" alleen nog een tint. Dit
 * is hetzelfde patroon als bij een gekozen regel in een menu, waar een vinkje
 * het werk doet in plaats van een kleur.
 *
 * De vorm staat in `app/globals.css` onder "Filterchip". Zie `redesign2026.md`
 * §7.8 voor de gemeten maten.
 */
export function FilterChip({
  label,
  gekozen,
  onKies,
  aantal,
  uitgeschakeld,
  groot,
}: {
  label: string;
  gekozen: boolean;
  onKies: () => void;
  /** Hoeveel er achter deze keuze zitten. Nul betekent: laat het getal weg. */
  aantal?: number;
  uitgeschakeld?: boolean;
  /** 40 pixels in plaats van 36, voor een balk die los boven een scherm staat. */
  groot?: boolean;
}) {
  return (
    <button
      type="button"
      className={`chip-select${groot ? " chip-select-lg" : ""}`}
      aria-pressed={gekozen}
      disabled={uitgeschakeld}
      onClick={onKies}
    >
      {label}
      {aantal != null && aantal > 0 && (
        // Het getal is gedempt en niet gekleurd: het zegt hoeveel, niet of het
        // goed of slecht is. `aria-hidden` omdat het label ernaast de betekenis
        // al draagt en "Actueel 12" voorgelezen worden als twee losse dingen
        // verwarrender is dan alleen "Actueel".
        <span aria-hidden style={{ color: "var(--text-subtle)" }}>
          {aantal}
        </span>
      )}
    </button>
  );
}

/**
 * De rij eromheen. GEMETEN: 8 pixels tussen twee chips.
 *
 * Bestaat als eigen component zodat die afstand op één plek staat en niet in
 * elke filterbalk opnieuw wordt gekozen.
 */
export function FilterChipGroep({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="chip-select-groep" role="group" aria-label={label}>
      {children}
    </div>
  );
}
