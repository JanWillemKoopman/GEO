import Link from "next/link";
import { PasswordResetRequestForm } from "../password-forms";
import { AuthCard } from "../auth-card";
import { Alert } from "@/components/alert";

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
        <Link href="/login" className="btn-ghost w-full">
          Terug naar inloggen
        </Link>
      }
    >
      {verlopen && (
        <Alert intent="warning" role="alert" className="mb-4">
          Die herstel-link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.
        </Alert>
      )}
      <PasswordResetRequestForm />
    </AuthCard>
  );
}
