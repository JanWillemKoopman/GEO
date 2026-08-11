import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { selectBrand } from "@/app/(app)/workspace-actions";
import { ProfileMenu } from "@/components/profile-menu";
import { WorkspaceChrome } from "@/components/workspace-chrome";
import type { Workspace } from "@/lib/workspace";
import type { User } from "@supabase/supabase-js";

/**
 * App-shell voor het ingelogde gedeelte: zijbalk links, merkkiezer bovenin.
 *
 * ── WAAROM DIT VERANDERDE ───────────────────────────────────────────────────
 *
 * Het was een bovenbalk met twee bestemmingen. Besluit 1 (`docs/Nova.md` §0)
 * maakt van de app een merk-werkruimte, en dan komen er twee soorten navigatie
 * naast elkaar te staan: wat over dít merk gaat en wat over de app gaat. Dat
 * onderscheid past niet horizontaal. Zie `components/sidebar.tsx`.
 *
 * De opbouw blijft server-side: dit component leest de werkruimte en geeft hem
 * door. Alleen het openklappen, zoeken en wisselen is client-werk, en dat zit in
 * `WorkspaceChrome`. Zo staat er geen `"use client"` boven de hele shell, en
 * blijft de merkenlijst uit de client-bundel.
 */
export function AppShell({
  user,
  workspace,
  staff,
  children,
}: {
  user: User;
  workspace: Workspace;
  /** Beheerder? Dan staat het CSM-paneel in de zijbalk (fase 8). */
  staff: boolean;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceChrome
      brands={workspace.brands}
      activeBrand={workspace.active}
      staff={staff}
      onSelectBrand={selectBrand}
      logo={
        <Link href="/profielen" className="text-lg font-bold tracking-tight">
          <span className="brand-gradient-text">Aura</span>
        </Link>
      }
      accountMenu={<ProfileMenu email={user.email ?? ""} signOutAction={signOut} />}
    >
      {children}
    </WorkspaceChrome>
  );
}
