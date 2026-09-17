import Link from "next/link";
import { AuthStage } from "./auth-stage";
import { OrbitMark } from "./orbit-mark";

/**
 * De schil om elk inlogscherm: de ondergrond, het woordmerk en het midden van
 * het scherm.
 *
 * De kaart zelf staat in `AuthCard`, want elk inlogscherm gebruikt exact
 * dezelfde vorm: kopje, titel, ondertitel, formulier, afsluiter.
 *
 * ── HET WOORDMERK STAAT SINDS STAP 8 BOVEN DE KAART, NIET ERIN ─────────────
 *
 * `redesign2026.md` §8.2: "woordmerk boven de kaart, 24px eronder". Vóór stap
 * 8 stond het logo bovenaan in `AuthCard`, dus binnen de rand die de kaart
 * trekt. Het hoort hier, in de schil: alle vijf schermen delen precies één
 * logo, en dat is een feit van het toneel en niet van de kaart. De 24px komt
 * uit `gap-6` op deze flexkolom, dezelfde afstand die de rest van dit bestand
 * met `--space-6` aanhoudt.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <AuthStage />
      <Link
        href="/"
        className="relative z-10 inline-flex items-center gap-2.5"
        aria-label="ORBIT ENGINE"
      >
        <OrbitMark size={28} gradientId="orbit-mark-toneel" className="h-7 w-7" />
        <span className="brand-logo text-[1.25rem] leading-none">
          <span style={{ color: "var(--wordmark-1)" }}>ORBIT</span>{" "}
          <span style={{ color: "var(--wordmark-2)" }}>ENGINE</span>
        </span>
      </Link>
      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}
