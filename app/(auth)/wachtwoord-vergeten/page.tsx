import Link from "next/link";
import { PasswordResetRequestForm } from "../password-forms";
import { AuthCard } from "../auth-card";

export const metadata = { title: "Wachtwoord vergeten" };

export default async function WachtwoordVergetenPage({
  searchParams,
}: {
  searchParams: Promise<{ verlopen?: string }>;
}) {
  const { verlopen } = await searchParams;

  return (
    <AuthCard
      eyebrow="Wachtwoord herstellen"
      title="Wachtwoord vergeten"
      intro="Vul je e-mailadres in. Staat er een account op dat adres, dan is er binnen een minuut een link onderweg waarmee je een nieuw wachtwoord kiest."
      footer={
        <Link href="/login" className="font-bold text-ink hover:underline">
          Terug naar inloggen
        </Link>
      }
    >
      {verlopen && (
        <p
          className="mb-[30px] rounded-[10px] border border-[var(--intent-warning-border)] bg-[var(--intent-warning-surface)] px-4 py-3 text-sm text-[var(--intent-warning-text)]"
          role="alert"
        >
          Die herstel-link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.
        </p>
      )}
      <PasswordResetRequestForm />
    </AuthCard>
  );
}
