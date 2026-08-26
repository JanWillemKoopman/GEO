/**
 * Eén hoofdstuk van het analysedossier.
 *
 * Vier hoofdstukken, elk als eigen tabblad (`app/(app)/analyses/[id]/page.tsx`
 * rendert er telkens maar één). De genummerde kop (01 t/m 04) blijft de
 * volgorde tonen die de tabbalk zelf niet kan uitdrukken: meten, zien waar je
 * mist, iets doen, kijken of het werkte. Zie de pagina zelf voor waarom dit
 * niet meer één doorlopende scrollpagina is.
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
      <header className="relative z-10 mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="mono-label" style={{ color: "var(--intent-intelligence-text)" }}>
            {number}
          </span>
          {/* Het accentwoord stond in de merk-gradient. In de NOVA-werkomgeving
              komt die gradient nul keer voor; hij is nu voorbehouden aan het
              woordmerk. Het accent draagt nu gewicht in plaats van kleur. */}
          <h2 className="type-title">
            {title} <span className="text-[var(--intent-intelligence-text)]">{accent}</span>
          </h2>
          {intro && <p className="mt-1 max-w-xl text-secondary">{intro}</p>}
        </div>
        {aside}
      </header>

      <div className="relative z-10 flex flex-col gap-4">{children}</div>
    </section>
  );
}
