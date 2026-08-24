import { AuthBrand } from "./auth-brand";

/**
 * De smalle kaart voor alle inlogschermen behálve inloggen zelf: registreren,
 * wachtwoord instellen, wachtwoord vergeten, uitnodiging.
 *
 * Inloggen heeft een eigen, brede kaart met een merkpaneel ernaast. Die vorm
 * hier ook opleggen zou betekenen dat je op het scherm "kies een nieuw
 * wachtwoord" een verkooppaneel naast je formulier krijgt, en dat is precies
 * het moment waarop iemand geen verhaal wil lezen. Zelfde decor en dezelfde
 * kop dus, andere kaart.
 */
export function AuthPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <AuthBrand />
      <div className="auth-card p-6">{children}</div>
    </div>
  );
}
