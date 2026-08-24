/**
 * Het merkteken: een baan die niet helemaal rond is, met één lichaam erin.
 *
 * ── WAAROM EEN OPEN RING ────────────────────────────────────────────────────
 *
 * Dezelfde gedachte als achter het icoon `overzicht` in `lib/icons.ts`: een
 * middelpunt met een lichaam eromheen is het beeld van "waar sta jij ten
 * opzichte van de rest". De opening rechtsboven maakt er een baan van in
 * plaats van een cirkel, en dat is precies het verschil tussen een ring en een
 * knop. De stip zit ín die opening: de baan is af, het lichaam is onderweg.
 *
 * Het verloop loopt van groen naar paars, hetzelfde als `--brand-gradient`,
 * maar dan diagonaal in plaats van onder 96 graden: een verloop dat over een
 * cirkel loopt moet de diagonaal volgen, anders raakt het de onderkant nooit.
 *
 * ⚠️ `gradientId` is geen sier maar een eis: het teken staat twee keer op de
 * inlogpagina (in de kop en in het paneel), en twee `<linearGradient>`-en met
 * hetzelfde id is ongeldige HTML.
 */
export function OrbitMark({
  size,
  gradientId,
  className,
}: {
  /** Pixels. 80 in de paginakop, 56 in het merkpaneel. */
  size: number;
  gradientId: string;
  className?: string;
}) {
  // De omtrek van een cirkel met straal 36: 2 × π × 36 = 226,19. De streep
  // beslaat 300 graden (188,5) en de opening de resterende 60 (37,7). De
  // verschuiving van 47,1 is 75 graden en zet die opening rechtsboven, tussen
  // één en twee uur, in plaats van bovenaan.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      role="img"
      aria-label="ORBIT ENGINE"
    >
      <defs>
        <linearGradient id={gradientId} x1="10%" y1="4%" x2="88%" y2="96%">
          <stop offset="0%" stopColor="#37941c" />
          <stop offset="55%" stopColor="#5c63a8" />
          <stop offset="100%" stopColor="#8511d9" />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="36"
        stroke={`url(#${gradientId})`}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray="188.5 37.7"
        strokeDashoffset="-47.1"
        transform="rotate(-90 50 50)"
      />
      <circle cx="75.5" cy="24.5" r="7" fill="#8511d9" />
    </svg>
  );
}
