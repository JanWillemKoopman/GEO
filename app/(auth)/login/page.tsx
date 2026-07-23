import { AuthForm } from "../auth-form";
import { signIn } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ check_email?: string }>;
}) {
  const params = await searchParams;
  const notice = params.check_email
    ? "Account aangemaakt. Check je e-mail om te bevestigen en log daarna in."
    : null;

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Inloggen</h1>
      <p className="mb-6 text-sm text-secondary">Welkom terug.</p>
      <AuthForm mode="login" action={signIn} notice={notice} />
    </>
  );
}
