import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { ProfileMenu } from "@/components/profile-menu";
import type { User } from "@supabase/supabase-js";

/**
 * App-shell voor het ingelogde gedeelte: bovenbalk met logo, navigatie, e-mail
 * en uitloggen. Gedeeld tussen /analyses en /profielen (zelfde shell, andere
 * sectie).
 *
 * Bewust twee losse indelingen i.p.v. hetzelfde menu verkleind (designsystem.md
 * C5): op `sm:` en groter staat alles direct zichtbaar in de balk — dat is hier
 * geen probleem, er passen maar vier links + e-mail + uitloggen. Op mobiel is
 * daar geen ruimte voor, dus staat er alleen het profiel-icoon (ProfileMenu),
 * dat een full-screen menu opent in plaats van diezelfde links uit te knijpen.
 */
export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[rgba(247,248,246,0.8)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/analyses" className="text-lg font-bold tracking-tight">
            <span className="brand-gradient-text">GEO Tracker</span>
          </Link>

          {/* sm+ : alles direct in de balk, geen icoon nodig. */}
          <div className="hidden items-center gap-6 sm:flex">
            <nav className="flex items-center gap-4">
              <Link href="/analyses" className="mono-label transition-colors hover:text-[var(--text-primary)]">
                Mijn analyses
              </Link>
              <Link href="/profielen" className="mono-label transition-colors hover:text-[var(--text-primary)]">
                Klantprofielen
              </Link>
              <Link href="/profielen" className="mono-label transition-colors hover:text-[var(--text-primary)]">
                Mijn bedrijfsgegevens
              </Link>
              <Link href="/instellingen" className="mono-label transition-colors hover:text-[var(--text-primary)]">
                Mijn instellingen
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <span className="text-sm text-secondary">{user.email}</span>
              <form action={signOut}>
                <button type="submit" className="mono-label transition-colors hover:text-[var(--text-primary)]">
                  Uitloggen
                </button>
              </form>
            </div>
          </div>

          {/* Mobiel: alleen het icoon, opent het full-screen menu. */}
          <ProfileMenu email={user.email ?? ""} signOutAction={signOut} />
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</div>
    </div>
  );
}
