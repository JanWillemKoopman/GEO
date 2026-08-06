import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-6 py-12">
      <div
        className="glow-orb"
        style={{ width: 420, height: 420, top: -140, left: "50%", marginLeft: -210, background: "color-mix(in srgb, var(--accent-purple) 22%, transparent)" }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            <span className="brand-gradient-text">Aura</span>
          </Link>
          <p className="mt-2 text-sm text-secondary">
            Zichtbaar zijn in AI-antwoorden. Gemeten, niet gegokt.
          </p>
        </div>
        <div className="card">{children}</div>
      </div>
    </main>
  );
}
