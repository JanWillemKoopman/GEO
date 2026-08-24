import { AuthStage } from "./auth-stage";

/**
 * De schil om elk inlogscherm: de ondergrond en het midden van het scherm,
 * verder niets.
 *
 * De kaart zelf staat in `AuthCard`, want elk inlogscherm gebruikt exact
 * dezelfde vorm: logo, kopje, titel, ondertitel, formulier, afsluiter.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
      <AuthStage />
      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}
