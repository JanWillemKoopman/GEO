import { redirect } from "next/navigation";
import { AuthForm } from "../auth-form";
import { signUp } from "../actions";
import { signupsEnabled } from "@/lib/config";

export default function RegisterPage() {
  // Registratie dicht tijdens de bouwfase → terug naar login.
  if (!signupsEnabled) {
    redirect("/login");
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Account aanmaken</h1>
      <p className="mb-6 text-sm text-secondary">Eén adres, één wachtwoord. Daarna zet Aura je merk op de kaart.</p>
      <AuthForm mode="register" action={signUp} signupsEnabled />
    </>
  );
}
