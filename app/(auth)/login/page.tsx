import { AuthBrand } from "../auth-brand";
import { LoginForm } from "./login-form";
import { OrbitVisual } from "./orbit-visual";
import { signIn } from "../actions";
import { signupsEnabled } from "@/lib/config";

export const metadata = { title: "Inloggen" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ check_email?: string; reset_sent?: string }>;
}) {
  const params = await searchParams;
  // Bewust dezelfde tekst ongeacht of het adres bestaat: zou dat verschillen,
  // dan is het herstelformulier een manier om te achterhalen wie een account heeft.
  const notice = params.reset_sent
    ? "Staat er een account op dat adres, dan is er een herstel-link onderweg. Kijk ook even in je spam."
    : params.check_email
      ? "Je account staat klaar. Bevestig je e-mailadres en log daarna in."
      : null;

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <AuthBrand />

      <div className="auth-card grid md:grid-cols-[0.94fr_1fr]">
        {/* ── De merkzijde ────────────────────────────────────────────────────
            Weg op een telefoon. Dat is geen bezuiniging maar regel 7 van
            docs/ux-design.md: mobiel is geen verkleinde desktop, en een
            formulier staat daar in één kolom over de volle breedte. Wie op zijn
            telefoon inlogt, wil inloggen, niet lezen wat het product doet. */}
        <div className="auth-aside hidden flex-col justify-between gap-10 p-8 pl-10 md:flex lg:p-12 lg:pl-14">
          <div>
            <h2 className="text-[0.9375rem] font-bold uppercase leading-[1.5] tracking-[0.04em]">
              <span className="block">AI-zichtbaarheid</span>
              <span className="block">als concurrentievoordeel</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-secondary">
              ORBIT ENGINE helpt je ontdekken waar jouw merk wordt genoemd, vergeleken en gekozen
              door AI.
            </p>
          </div>

          <OrbitVisual />
        </div>

        {/* ── De formulierzijde ─────────────────────────────────────────────── */}
        <div className="p-7 sm:p-10 md:py-12">
          <h1 className="text-[1.75rem] font-bold leading-none tracking-tight">Welkom terug</h1>
          <p className="mt-2.5 text-sm text-secondary">Log in om verder te gaan in ORBIT ENGINE.</p>

          <div className="mt-7">
            <LoginForm action={signIn} notice={notice} signupsEnabled={signupsEnabled} />
          </div>
        </div>
      </div>
    </div>
  );
}
