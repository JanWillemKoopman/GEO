import { AuthBackground } from "./auth-background";

/**
 * De schil om elk inlogscherm: het decor en het midden van het scherm, verder
 * niets.
 *
 * De kop en de kaart zaten hier tot 24 augustus 2026 in. Ze zijn naar de
 * pagina's verhuisd omdat inloggen sindsdien een brede kaart met een merkpaneel
 * heeft en de andere schermen een smalle: een lay-out die niet weet welke route
 * hij dient, kan die breedte niet kiezen. `AuthPanel` doet de smalle vorm voor
 * alle andere schermen, dus de kop staat nog steeds op één plek.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
      <AuthBackground />
      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}
