import { AuthCard } from "../auth-card";
import { LoginForm, LoginFooter } from "./login-form";
import { signIn } from "../actions";
import { signupsEnabled } from "@/lib/config";

export const metadata = { title: "Inloggen" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ check_email?: string; reset_sent?: string }>;
}) {
  const params = await searchParams;
  // Bewust dezelfde tekst ongeacht of het adres bestaat: zou dat verschillen,
  // dan is het herstelformulier een manier om te achterhalen wie een account heeft.
  const notice = params.reset_sent
    ? "Staat er een account op dat adres, dan is er een herstel-link onderweg. Kijk ook even in je spam."
    : params.check_email
      ? "Je account staat klaar. Bevestig je e-mailadres en log daarna in."
      : null;

  return (
    <AuthCard
      eyebrow="Veilig inloggen"
      title="Welkom terug"
      intro="Log in op je ORBIT ENGINE-werkruimte."
      footer={<LoginFooter signupsEnabled={signupsEnabled} />}
    >
      <LoginForm action={signIn} notice={notice} />
    </AuthCard>
  );
}
