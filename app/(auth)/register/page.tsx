import { redirect } from "next/navigation";
import { AuthForm } from "../auth-form";
import { AuthCard } from "../auth-card";
import { signUp } from "../actions";
import { signupsEnabled } from "@/lib/config";

export const metadata = { title: "Account aanmaken" };

export default function RegisterPage() {
  // Registratie dicht tijdens de bouwfase → terug naar login.
  if (!signupsEnabled) {
    redirect("/login");
  }

  return (
    <AuthCard
      eyebrow="Account aanmaken"
      title="Account aanmaken"
      intro="Eén adres, één wachtwoord. Daarna zet ORBIT ENGINE je merk op de kaart."
    >
      <AuthForm mode="register" action={signUp} signupsEnabled />
    </AuthCard>
  );
}
