import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = { title: "Nieuw merk" };

/**
 * De pre-boarding: naam, webadres en schrijfwijzen.
 *
 * Het contentpakket wordt hier bewust niet meer gevraagd (A5): tot 31 augustus
 * 2026 landde het op het eigen account van de consultant in plaats van dat van
 * de klant, omdat het merk pas bij Toewijzen op het klantaccount komt te
 * staan. Het pakket wordt sindsdien uitsluitend gezet op het
 * toewijzingsscherm, ná het koppelen (`package-box.tsx`).
 */
export default function NewProfilePage() {
  return <OnboardingWizard />;
}
