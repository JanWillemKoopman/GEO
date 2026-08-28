import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";
import { loadWorkspace } from "@/lib/workspace";
import { isStaff, isStaffAccount } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { countOpenQuestionsForBrand } from "@/lib/open-questions";

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

  // ── ⚠️ ALLES WAT TEGELIJK KAN, GAAT TEGELIJK (28 AUGUSTUS 2026) ──────────
  //
  // Deze drie stonden onder elkaar, elk met een eigen `await`. Ze weten niets
  // van elkaar: de werkruimte komt uit `profiles`, de twee rechten uit
  // `staff_users`. Achter elkaar afwachten kostte drie netwerkrondes vóór er
  // één byte HTML de deur uit kon, en deze layout draait onder élk scherm van
  // de app. `isStaff` en `isStaffAccount` delen hun query via `cache()`, dus
  // parallel starten levert er ook geen extra op.
  //
  // De werkruimte hoort bij de shell en niet bij een pagina: de merkkiezer staat
  // op élk scherm, ook op de schermen die zelf geen merk kennen.
  //
  // `staff` is het EFFECTIEVE recht: dit bepaalt wat het scherm laat zien, en
  // is `false` zolang de klantweergave aanstaat, ook voor een echte beheerder.
  // `staffAccount` is het ECHTE recht en verandert nooit door de klantweergave;
  // die gebruiken we alleen om de wisselknop zelf te tonen, want anders kan een
  // beheerder die net op de klantweergave heeft geklikt niet meer terug.
  const [workspace, staff, staffAccount] = await Promise.all([
    loadWorkspace(user.id),
    isStaff(user.id),
    isStaffAccount(user.id),
  ]);

  // ── De teller in de bovenbalk (28 augustus 2026) ─────────────────────────
  //
  // Hij hoort bij de shell en niet bij een pagina, om dezelfde reden als de
  // merkkiezer: hij staat naast élk scherm. Dat is de prijs van een teller die
  // klopt op het moment dat je hem leest. Zonder actief merk is er niets te
  // tellen.
  //
  // ⚠️ Eén netwerkronde en geen drie: `countOpenQuestionsForBrand` haalt het
  // profiel en de twee vragenlijsten tegelijk op. Zie de toelichting daar.
  //
  // ⚠️ Via de gewone client en niet via de service role: lezen mag onder RLS, en
  // het merk komt uit `loadWorkspace`, dat het eigendom al heeft gecontroleerd.
  let openVragen = 0;
  if (workspace.active) {
    const supabase = await createClient();
    openVragen = await countOpenQuestionsForBrand(supabase, workspace.active.id);
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
