import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { OrbitMark } from "./orbit-mark";

/**
 * De kaart die élk inlogscherm draagt: logo, kopje, titel, ondertitel,
 * formulier, afsluiter.
 *
 * ── WAAROM ÉÉN VORM VOOR ALLE SCHERMEN ──────────────────────────────────────
 *
 * Tot 24 augustus 2026 had inloggen een brede kaart met een verkooppaneel
 * ernaast en hadden de andere schermen een smalle kaart. Dat is teruggebracht
 * naar één vorm, op verzoek van de eigenaar: wie zijn wachtwoord opnieuw
 * aanvraagt heeft precies hetzelfde nodig als wie inlogt, namelijk één kolom
 * met één handeling erin. Verschil zit alleen in het kopje, de titel en het
 * formulier; de maatvoering is overal dezelfde.
 */
export function AuthCard({
  eyebrow,
  title,
  intro,
  children,
  footer,
}: {
  /** Het mono-kopje boven de titel, bijvoorbeeld "veilig inloggen". */
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
  /** Wat er onder de knop komt: een link terug, een link naar herstel. */
  footer?: React.ReactNode;
}) {
  return (
    <div className="auth-card">
      <div className="flex justify-center">
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="ORBIT ENGINE">
          <OrbitMark size={28} gradientId="orbit-mark-kaart" className="h-7 w-7" />
          {/* Gewicht 700 en niet 800: 600 is het zwaarste gewicht dat in Nova's
              hele typografieschaal voorkomt, en een woordmerk mag daar één stap
              boven staan maar geen twee. */}
          <span className="text-[1.25rem] font-bold leading-none tracking-[0.06em]">
            {/* Uit de tokens en niet uit de hand, sinds 24 augustus 2026. In de
                donkere stand staan ze allebei op wit, hetzelfde besluit als bij
                het woordmerk in de bovenbalk; het waarom staat bij
                `--wordmark-1` in `app/globals.css`. */}
            <span style={{ color: "var(--wordmark-1)" }}>ORBIT</span>{" "}
            <span style={{ color: "var(--wordmark-2)" }}>ENGINE</span>
          </span>
        </Link>
      </div>

      {/* De verticale maatvoering volgt sinds 24 augustus 2026 de schaal van
          Nova (8, 16, 24, 32) in plaats van zeven losse pixelwaarden die elk
          apart bedacht waren. Zie de toelichting bij `.auth-card` in
          `app/globals.css`: het scherm was een maat te groot. */}
      <p className="auth-eyebrow mt-8">
        <ShieldCheck size={13} strokeWidth={1.75} aria-hidden="true" />
        {eyebrow}
      </p>

      {/* `.type-title`, de kop van een scherm bij Nova: 24 pixels op gewicht 600
          zonder krappe letterspatiëring. Was 28 op 700 met `tracking-tight`. */}
      <h1 className="type-title mt-5">{title}</h1>
      <p className="mt-2 text-[0.9375rem] text-secondary">{intro}</p>

      <div className="mt-8">{children}</div>

      {footer && <div className="mt-6 text-center text-[0.9375rem]">{footer}</div>}

      <div className="mt-8 border-t border-[var(--border-subtle)] pt-5">
        <p className="auth-footnote">
          <ShieldCheck size={13} strokeWidth={1.75} aria-hidden="true" />
          Je gegevens zijn versleuteld en beveiligd.
        </p>
      </div>
    </div>
  );
}

/** Het label boven een veld, met het rode sterretje voor verplichte velden. */
export function AuthLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="auth-label">
      {children}
      {required && <span className="auth-label-required"> *</span>}
    </label>
  );
}
