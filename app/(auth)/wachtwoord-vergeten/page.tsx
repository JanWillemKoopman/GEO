import Link from "next/link";
import { PasswordResetRequestForm } from "../password-forms";
import { AuthBackground } from "../auth-background";

export const metadata = { title: "Wachtwoord vergeten" };

export default async function WachtwoordVergetenPage({
  searchParams,
}: {
  searchParams: Promise<{ verlopen?: string }>;
}) {
  const { verlopen } = await searchParams;

  return (
    <>
      <AuthBackground />
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
        Vul je e-mailadres in. Staat er een account op dat adres, dan is er binnen een minuut een
        link onderweg waarmee je een nieuw wachtwoord kiest.
      </p>
      <PasswordResetRequestForm />
      <p className="mt-4 text-center text-sm text-secondary">
        <Link href="/login" className="text-[var(--intent-intelligence-text)] hover:underline">
          Terug naar inloggen
        </Link>
      </p>
    </>
  );
}
