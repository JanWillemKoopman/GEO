import { NewPasswordForm } from "../password-forms";

export const metadata = { title: "Nieuw wachtwoord" };

/**
 * Waar de herstel-link uit de mail op uitkomt. Supabase zet de sessie op basis
 * van het token in de URL-fragment; die verwerking gebeurt client-side door de
 * Supabase-client, dus dit scherm hoeft alleen het formulier te tonen. Is de
 * link verlopen, dan meldt `updatePassword` dat, beter daar dan hier, want dan
 * is het een echt antwoord op een echte poging in plaats van een gok vooraf.
 */
export default function NieuwWachtwoordPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Nieuw wachtwoord</h1>
      <p className="mb-6 text-sm text-secondary">Kies een wachtwoord van minstens 8 tekens.</p>
      <NewPasswordForm />
    </>
  );
}
