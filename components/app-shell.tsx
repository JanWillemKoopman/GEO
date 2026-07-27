import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import type { User } from "@supabase/supabase-js";

/**
 * App-shell voor het ingelogde gedeelte: bovenbalk met logo, navigatie, e-mail
 * en uitloggen. Gedeeld tussen /analyses en /profielen (zelfde shell, andere
 * sectie).
 */
export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[rgba(247,248,246,0.8)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/analyses" className="text-lg font-bold tracking-tight">
              <span className="brand-gradient-text">GEO Tracker</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/analyses" className="mono-label transition-colors hover:text-[var(--text-primary)]">
                Mijn analyses
              </Link>
              <Link href="/profielen" className="mono-label transition-colors hover:text-[var(--text-primary)]">
                Klantprofielen
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-secondary sm:inline">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="mono-label transition-colors hover:text-[var(--text-primary)]">
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</div>
    </div>
  );
}
