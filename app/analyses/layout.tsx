import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

/**
 * App-shell voor het ingelogde gedeelte: bovenbalk met logo, e-mail en uitloggen.
 * requireUser beschermt alle /analyses-routes ook server-side (naast de middleware).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[rgba(11,11,12,0.72)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/analyses" className="text-lg font-bold tracking-tight">
            <span className="brand-gradient-text">GEO Tracker</span>
          </Link>
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
