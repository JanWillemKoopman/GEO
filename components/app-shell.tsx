import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { selectBrand } from "@/app/(app)/workspace-actions";
import { ProfileMenu } from "@/components/profile-menu";
import { PreviewToggle } from "@/components/preview-toggle";
import { WorkspaceChrome } from "@/components/workspace-chrome";
import type { Workspace } from "@/lib/workspace";
import type { User } from "@supabase/supabase-js";

/**
 * App-shell voor het ingelogde gedeelte: zijbalk links, merkkiezer bovenin.
 *
 * ── WAAROM DIT VERANDERDE ───────────────────────────────────────────────────
 *
 * Het was een bovenbalk met twee bestemmingen. Besluit 1 maakt van de app een
 * merk-werkruimte, en dan komen er twee soorten navigatie naast elkaar te
 * staan: wat over dít merk gaat en wat over de app gaat. Dat onderscheid
 * past niet horizontaal. Zie `components/sidebar.tsx`.
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
  staffAccount,
  children,
}: {
  user: User;
  workspace: Workspace;
  /** Beheerder? Dan staat het CSM-paneel in de zijbalk (fase 8). Dit is het
   *  EFFECTIEVE recht: staat de klantweergave aan, dan is dit `false`, ook
   *  voor een echte beheerder (`lib/staff.ts`). */
  staff: boolean;
  /** Het ECHTE recht, dat de klantweergave nooit verandert. Alleen gebruikt om
   *  de wisselknop zelf te tonen: anders is er geen weg terug. */
  staffAccount: boolean;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceChrome
      brands={workspace.brands}
      activeBrand={workspace.active}
      staff={staff}
      onSelectBrand={selectBrand}
      logo={
        // Het woordmerk gaat naar het overzicht van het merk waar je in zit, en
        // niet naar een lijst. Sinds fase 5 is dát de startpagina; een logo dat
        // naar een lijst gaat kost een klik om terug te komen waar je was.
        <Link
          href={workspace.active ? `/merk/${workspace.active.id}` : "/merk"}
          className="text-lg"
        >
          <span className="brand-logo brand-gradient-text">ORBIT ENGINE</span>
        </Link>
      }
      // Alleen een echte beheerder ziet deze knop, ook terwijl hij zelf op de
      // klantweergave staat: anders is er geen weg terug behalve de cookie met
      // de hand wissen.
      previewToggle={staffAccount ? <PreviewToggle previewing={!staff} /> : null}
      accountMenu={<ProfileMenu email={user.email ?? ""} signOutAction={signOut} />}
    >
      {children}
    </WorkspaceChrome>
  );
}
