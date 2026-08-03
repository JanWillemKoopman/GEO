import Link from "next/link";
import { PasswordResetRequestForm } from "../password-forms";

export default async function WachtwoordVergetenPage({
  searchParams,
}: {
  searchParams: Promise<{ verlopen?: string }>;
}) {
  const { verlopen } = await searchParams;

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Wachtwoord vergeten</h1>
      {verlopen && (
        <p
          className="mb-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-3 text-sm text-[var(--status-warning)]"
          role="alert"
        >
          Die herstel-link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.
        </p>
      )}
      <p className="mb-6 text-sm text-secondary">
        Vul je e-mailadres in. Staat er een account op dat adres, dan sturen we een link waarmee je
        een nieuw wachtwoord kunt kiezen.
      </p>
      <PasswordResetRequestForm />
      <p className="mt-4 text-center text-sm text-secondary">
        <Link href="/login" className="text-[var(--accent-purple-soft)] hover:underline">
          Terug naar inloggen
        </Link>
      </p>
    </>
  );
}
