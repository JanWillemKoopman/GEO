import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";
import { loadWorkspace } from "@/lib/workspace";
import { isStaff, isStaffAccount } from "@/lib/staff";
import { getProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { countOpenQuestions } from "@/lib/open-questions";

/**
 * Het ingelogde gedeelte van de app.
 *
 * Dit was drie keer hetzelfde bestand: `analyses/layout.tsx`,
 * `profielen/layout.tsx` en `instellingen/layout.tsx` waren op de JSDoc-regel na
 * letterlijk identiek, `requireUser()` plus de shell. Drie plekken om te
 * vergeten als er ooit iets aan verandert.
 *
 * Een route group verandert de URL's niet: /analyses blijft /analyses.
 *
 * `requireUser` beschermt alles hieronder ook server-side, naast de middleware.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // De werkruimte hoort bij de shell en niet bij een pagina: de merkkiezer staat
  // op élk scherm, ook op de schermen die zelf geen merk kennen.
  const workspace = await loadWorkspace(user.id);
  // Gememoïseerd per request (`lib/staff.ts`), dus dit kost geen extra query
  // bovenop de ownership-checks die de pagina's zelf al doen.
  //
  // `staff` is het EFFECTIEVE recht: dit bepaalt wat het scherm laat zien, en
  // is `false` zolang de klantweergave aanstaat, ook voor een echte beheerder.
  // `staffAccount` is het ECHTE recht en verandert nooit door de klantweergave;
  // die gebruiken we alleen om de wisselknop zelf te tonen, want anders kan een
  // beheerder die net op de klantweergave heeft geklikt niet meer terug.
  const staff = await isStaff(user.id);
  const staffAccount = await isStaffAccount(user.id);

  // ── De teller in de bovenbalk (28 augustus 2026) ─────────────────────────
  //
  // Hij hoort bij de shell en niet bij een pagina, om dezelfde reden als de
  // merkkiezer: hij staat naast élk scherm. Dat kost twee queries per
  // paginaweergave, en dat is de prijs van een teller die klopt op het moment
  // dat je hem leest. Zonder actief merk is er niets te tellen.
  //
  // ⚠️ Via de gewone client en niet via de service role: lezen mag onder RLS, en
  // het merk komt uit `loadWorkspace`, dat het eigendom al heeft gecontroleerd.
  let openVragen = 0;
  if (workspace.active) {
    const profile = await getProfile(workspace.active.id);
    if (profile) {
      const supabase = await createClient();
      openVragen = await countOpenQuestions(supabase, profile);
    }
  }

  return (
    <ToastProvider>
      <AppShell
        user={user}
        workspace={workspace}
        staff={staff}
        staffAccount={staffAccount}
        openVragen={openVragen}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
