import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";
import { loadWorkspace } from "@/lib/workspace";
import { isStaff, isStaffAccount } from "@/lib/staff";

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
  return (
    <ToastProvider>
      <AppShell user={user} workspace={workspace} staff={staff} staffAccount={staffAccount}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
