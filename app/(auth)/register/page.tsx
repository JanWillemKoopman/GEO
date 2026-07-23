import { AuthForm } from "../auth-form";
import { signUp } from "../actions";

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Account aanmaken</h1>
      <p className="mb-6 text-sm text-secondary">Gratis starten — geen creditcard nodig.</p>
      <AuthForm mode="register" action={signUp} />
    </>
  );
}
