import Link from "next/link";
import { OnboardingWizard } from "./onboarding-wizard";
import { requireUser } from "@/lib/auth";
import { mayTriggerCost } from "@/lib/cost-guard";
import { COST_DENIED } from "@/lib/cost-rules";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Nieuw merk" };

/**
 * De pre-boarding: naam, webadres en schrijfwijzen.
 *
 * Het contentpakket wordt hier bewust niet meer gevraagd (A5): tot 31 augustus
 * 2026 landde het op het eigen account van de consultant in plaats van dat van
 * de klant, omdat het merk pas bij Toewijzen op het klantaccount komt te
 * staan. Het pakket wordt sindsdien uitsluitend gezet op het
 * toewijzingsscherm, ná het koppelen (`package-box.tsx`).
 *
 * ── WIE HET NIET MAG, KRIJGT GEEN FORMULIER (UX-AUDIT 23 SEPTEMBER 2026, P1.3) ──
 *
 * Een merk onderzoeken is van de consultant (`merk_onderzoeken` in
 * `lib/cost-rules.ts`). Tot die dag vulde een klant hier toch naam, adres en
 * schrijfwijzen in, klikte op "Start het onderzoek" en kreeg pas dán te horen
 * dat de consultant dit doet. Nu staat dezelfde melding er vóóraf, in plaats
 * van het formulier. De server weigert nog steeds zelf (`/api/profiles`).
 */
export default async function NewProfilePage() {
  const user = await requireUser();
  if (!(await mayTriggerCost(user.id, "merk_onderzoeken"))) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <PageHeader title="Nieuw merk" />
        <div className="card flex flex-col gap-3">
          <p className="text-secondary">{COST_DENIED.merk_onderzoeken}</p>
          <Link href="/merk" className="btn-outline w-fit">
            Terug naar je merken
          </Link>
        </div>
      </div>
    );
  }
  return <OnboardingWizard />;
}
