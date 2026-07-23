import { envStatus } from "@/lib/env";

/**
 * Scaffold-statuspagina (Sprint 1). Dit is bewust nog GEEN feature-scherm —
 * het toont dat het fundament staat en dat het design system (designsystem.md
 * §C) correct laadt. De echte "Mijn analyses"-flow komt in Sprint 2.
 */
export default function Home() {
  const env = envStatus();

  const checks: { label: string; ok: boolean }[] = [
    { label: "Supabase URL", ok: env.supabaseUrl },
    { label: "Supabase anon key", ok: env.supabaseAnonKey },
    { label: "Supabase service-role", ok: env.supabaseServiceRoleKey },
    { label: "OpenAI API key", ok: env.openaiApiKey },
    { label: "Resend API key", ok: env.resendApiKey },
  ];

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      {/* Ambient gloed-orbs (spaarzaam, designsystem.md §C.6) */}
      <div
        className="glow-orb"
        style={{ width: 360, height: 360, top: -120, right: -80, background: "rgba(133,17,217,0.28)" }}
      />
      <div
        className="glow-orb"
        style={{ width: 300, height: 300, bottom: -100, left: -60, background: "rgba(84,184,106,0.16)" }}
      />

      <header className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="live-dot" />
          <span className="mono-label">Fundament · Sprint 1</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="brand-gradient-text">GEO Tracker</span>
        </h1>
        <p className="max-w-xl text-lg text-secondary">
          Simpele GEO-tracking voor iedereen. Het technische fundament staat: Next.js op
          Vercel, Supabase-datamodel, OpenAI-contracten en het design system.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="chip">Next.js · Vercel</span>
          <span className="chip chip-green">Supabase</span>
          <span className="chip">OpenAI · nano + mini</span>
        </div>
      </header>

      <section className="card relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <span className="mono-label">Omgeving</span>
          <span className="mono-label">{env.models.volume} · {env.models.quality}</span>
        </div>
        <ul className="flex flex-col gap-2.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center justify-between text-sm">
              <span className="text-secondary">{c.label}</span>
              <span
                className="chip"
                style={
                  c.ok
                    ? undefined
                    : { background: "rgba(229,72,77,0.16)", color: "#f0a3a5", borderColor: "rgba(229,72,77,0.35)" }
                }
              >
                {c.ok ? "ingesteld" : "ontbreekt"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-muted">
          Ontbreekt er iets? Kopieer <code className="font-mono">.env.example</code> naar{" "}
          <code className="font-mono">.env.local</code> en vul de waarden in. Zie{" "}
          <code className="font-mono">SETUP.md</code>.
        </p>
      </section>

      <footer className="relative z-10 flex flex-wrap items-center gap-4">
        <span className="btn-primary" aria-disabled="true">
          Sprint 2: Mijn analyses (volgt)
        </span>
        <a className="btn-outline" href="/api/health">
          API health-check
        </a>
      </footer>
    </main>
  );
}
