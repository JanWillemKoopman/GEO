import Link from "next/link";

/**
 * `notFound()` wordt op zes plekken aangeroepen, maar er stond geen enkel
 * scherm achter, dus kreeg de klant de kale standaardpagina van het framework,
 * buiten de huisstijl om.
 *
 * Dit scherm valt buiten de AppShell (dat is hoe de router werkt bij een
 * not-found op rootniveau), dus staat het logo hier zelf.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-6 py-12">
      <div
        className="glow-orb"
        style={{
          width: 420,
          height: 420,
          top: -140,
          left: "50%",
          marginLeft: -210,
          background: "var(--accent-purple-glow)",
        }}
      />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-5 text-center">
        <Link href="/analyses" className="text-2xl font-bold tracking-tight">
          <span className="brand-gradient-text">Aura</span>
        </Link>
        <div className="card flex flex-col items-center gap-4 py-14">
          <span className="mono-label">404 · buiten bereik</span>
          <h1 className="text-xl font-semibold">Deze pagina bestaat niet</h1>
          <p className="max-w-sm text-secondary">
            De link klopt niet meer, of het item is verwijderd. Vanaf je overzicht kom je overal.
          </p>
          <Link href="/analyses" className="btn-primary mt-1">
            Naar je analyses
          </Link>
        </div>
      </div>
    </main>
  );
}
