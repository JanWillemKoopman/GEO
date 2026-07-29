import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

/**
 * Het ingelogde gedeelte van de app.
 *
 * Dit was drie keer hetzelfde bestand: `analyses/layout.tsx`,
 * `profielen/layout.tsx` en `instellingen/layout.tsx` waren op de JSDoc-regel na
 * letterlijk identiek — `requireUser()` plus de shell. Drie plekken om te
 * vergeten als er ooit iets aan verandert.
 *
 * Een route group verandert de URL's niet: /analyses blijft /analyses.
 *
 * `requireUser` beschermt alles hieronder ook server-side, naast de middleware.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
