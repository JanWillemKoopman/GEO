import { OnboardingWizard } from "./onboarding-wizard";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";

export const metadata = { title: "Nieuw merk" };

/**
 * De pre-boarding: naam, webadres, schrijfwijzen en, voor de beheerder, het
 * contentpakket.
 *
 * ⚠️ De beheerdersvraag wordt hier op de server beantwoord en niet in de
 * browser. Zou het formulier zelf bepalen of iemand beheerder is, dan is de
 * grens een weergavekwestie; nu is het scherm alleen de eerste laag en weigert
 * `POST /api/profiles` het pakket ook echt van een klant (conventie 1).
 */
export default async function NewProfilePage() {
  const user = await getUser();
  const staff = user ? await isStaff(user.id) : false;
  return <OnboardingWizard isStaff={staff} />;
}
