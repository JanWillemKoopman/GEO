import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { ProfileMenu } from "@/components/profile-menu";
import { MainNav } from "@/components/main-nav";
import type { User } from "@supabase/supabase-js";

/**
 * App-shell voor het ingelogde gedeelte.
 *
 * De balk telde acht elementen: vier navigatielinks (waarvan twee naar dezelfde
 * route), het e-mailadres en een uitlog-knop, plus op mobiel nog een icoon. Nu
 * zijn het er drie: logo, twee bestemmingen, en één menu waarin het account
 * zit.
 *
 * Het accountmenu zit op élk schermformaat achter hetzelfde icoon. Dat was
 * eerder alleen op mobiel zo, waardoor desktop en mobiel niet alleen anders
 * oogden maar ook een andere indeling hadden — twee menu's om uit elkaar te
 * laten lopen in plaats van één.
 */
export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[rgba(247,248,246,0.8)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/analyses" className="text-lg font-bold tracking-tight">
            <span className="brand-gradient-text">GEO Tracker</span>
          </Link>

          <div className="flex items-center gap-2">
            <MainNav />
            <ProfileMenu email={user.email ?? ""} signOutAction={signOut} />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</div>
    </div>
  );
}
