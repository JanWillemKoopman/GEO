/**
 * Eén hoofdstuk van het analysedossier.
 *
 * ── WAAROM HOOFDSTUKKEN EN GEEN TABBLADEN ───────────────────────────────────
 *
 * Een analyse was verdeeld over vijf tabbladen: Overzicht, Vragen & antwoorden,
 * Rapport, Bibliotheek, Instellingen. Vijf gelijkwaardige, parallelle keuzes,
 * terwijl het werk in werkelijkheid één vaste volgorde heeft: meten, zien waar
 * je mist, iets doen, kijken of het werkte.
 *
 * Een tabbalk KAN die volgorde niet uitdrukken. Dat is geen labelprobleem dat
 * je met betere woorden oplost; het is de vorm zelf. Een verticale as kan het
 * wel, en daarom is dit een doorlopende pagina met genummerde hoofdstukken.
 *
 * De vormgeving volgt InSpace 1-op-1 (designsystem.md §A2/§A3): een genummerd
 * mono-label in paars, een grote kop waarvan één woord de merk-gradient draagt,
 * en een grote, sterk vervaagde gloed-orb als ambient sectiescheiding.
 */
export function Chapter({
  id,
  number,
  title,
  accent,
  intro,
  aside,
  children,
}: {
  id: string;
  /** "01" t/m "04", hetzelfde patroon als het mobiele menu. */
  number: string;
  title: string;
  /** Het woord dat de merk-gradient krijgt: de InSpace-vingerafdruk. */
  accent: string;
  /** Eén zin die zegt welke vraag dit hoofdstuk beantwoordt. */
  intro?: string;
  /** Rechts van de kop, bv. Een periodekiezer. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="relative scroll-mt-24">
      {/* Ambient gloed-orb (§A3). Zeer laag in dekking: hij mag het lezen niet
          storen, alleen de sectiegrens voelbaar maken. */}
      <div
        className="glow-orb"
        aria-hidden
        style={{
          width: 300,
          height: 300,
          top: -90,
          right: -130,
          background: "rgba(133,17,217,0.06)",
        }}
      />

      <header className="relative z-10 mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="mono-label" style={{ color: "var(--accent-purple)" }}>
            {number}
          </span>
          <h2 className="text-3xl font-bold tracking-tight">
            {title} <span className="brand-gradient-text">{accent}</span>
          </h2>
          {intro && <p className="mt-1 max-w-xl text-secondary">{intro}</p>}
        </div>
        {aside}
      </header>

      <div className="relative z-10 flex flex-col gap-4">{children}</div>
    </section>
  );
}
