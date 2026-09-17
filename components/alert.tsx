import { Icon } from "@/components/icon";
import type { IcoonNaam } from "@/lib/icons";

const ICOON: Record<"success" | "warning" | "danger", IcoonNaam> = {
  success: "klaar",
  warning: "letop",
  danger: "mislukt",
};

/**
 * Een melding in de pagina, geen zwevende toast. AFGELEID (`redesign2026.md`
 * §7.16): OKX levert dit component niet in de opgehaalde bundels. Zie de
 * toelichting bij `.alert` in `app/globals.css` voor kleur en rand.
 *
 * Gebouwd voor het inlogtoneel (stap 8 van de redesign), dat er alle drie
 * gebruikt: een bevestiging na registreren (`success`), een verlopen
 * herstel-link (`warning`), een formulierfout (`danger`).
 */
export function Alert({
  intent,
  role = "status",
  className,
  children,
}: {
  intent: "success" | "warning" | "danger";
  /** `"alert"` onderbreekt een schermlezer meteen; gebruik dat alleen voor
   *  iets dat de gebruiker nu moet weten, zoals een formulierfout. */
  role?: "status" | "alert";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`alert alert-${intent}${className ? ` ${className}` : ""}`} role={role}>
      <Icon naam={ICOON[intent]} size={16} />
      <span>{children}</span>
    </div>
  );
}
