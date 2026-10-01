/**
 * Eén filter: een klein label met een compacte keuzelijst ernaast.
 *
 * ── WAAROM DIT BESTAAT (1 OKTOBER 2026) ─────────────────────────────────────
 *
 * Er waren vier manieren van filteren. Analytics had een balk met het label
 * naast een keuzelijst van 40 pixels, de Bibliotheek een kaart met het label
 * boven vier keuzelijsten van volle breedte, Clusters kale keuzelijsten zonder
 * label, en Openstaande vragen filterknoppen. Vier vormen voor één handeling
 * laten elk scherm aanvoelen als een ander product.
 *
 * De regel sinds vandaag (`docs/designsystem.md` §9): hooguit vijf vaste
 * keuzes die je naast elkaar wilt zien zijn filterknoppen (`FilterChip`), al
 * het andere is dit onderdeel, op de kleine veldmaat van 36 pixels die er
 * precies voor bestaat. Wat zelden nodig is, staat achter "Meer filters".
 */

export function FilterKeuze({
  label,
  waarde,
  onKies,
  children,
}: {
  label: string;
  waarde: string;
  onKies: (waarde: string) => void;
  /** De `<option>`-elementen. */
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 items-center gap-2">
      <span className="mono-label shrink-0">{label}</span>
      <select
        className="field field-sm field-select w-auto min-w-0 max-w-[16rem]"
        value={waarde}
        onChange={(e) => onKies(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
