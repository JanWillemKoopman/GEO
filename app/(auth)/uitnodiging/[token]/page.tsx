import Link from "next/link";
import type { Metadata } from "next";
import { lookupInvite } from "@/lib/invites";
import { ActivationForm } from "./activation-form";
import { AuthPanel } from "../../auth-panel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Uitnodiging" };

/**
 * De activatiepagina: de enige deur naar binnen.
 *
 * ── VIER EINDTOESTANDEN, VIER SCHERMEN ──────────────────────────────────────
 *
 * Nova heeft er precies deze vier (`onboarding.activation`), en dat onderscheid
 * is de moeite waard. "Deze link is verlopen, vraag een nieuwe" is een heel
 * ander bericht dan "je account is al actief, log gewoon in". Met één generieke
 * foutmelding belt de klant, en dat is precies het gesprek dat je niet wilt
 * voeren op de dag dat hij begint.
 *
 * ── HET ADRES STAAT ER, MAAR IS NIET TE WIJZIGEN ────────────────────────────
 *
 * Ook van Nova (`verified`-badge naast het werk-e-mailadres). De link is alleen
 * op dat adres aangekomen, dus dat adres is bewezen. Zou je het hier kunnen
 * wijzigen, dan is de uitnodiging een manier om een account op een wíllekeurig
 * adres te maken.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { state, invite, accountName } = await lookupInvite(token);

  if (state === "geldig" && invite) {
    return (
      <AuthPanel>
        <ActivationForm token={token} email={invite.email} accountName={accountName} />
      </AuthPanel>
    );
  }

  const schermen = {
    verlopen: {
      title: "Deze uitnodiging is verlopen",
      body:
        "Uitnodigingslinks verlopen na twee weken, dat is een beveiligingsmaatregel. " +
        "Vraag je contactpersoon om een nieuwe, dan sta je zo binnen.",
    },
    gebruikt: {
      title: "Je account is al actief",
      body:
        "Deze uitnodiging is al gebruikt. Log in met het e-mailadres en het wachtwoord " +
        "die je toen hebt ingesteld.",
    },
    ongeldig: {
      title: "Deze link werkt niet",
      body:
        "We vinden geen openstaande uitnodiging bij deze link. Misschien is hij " +
        "ingetrokken, of is er een stukje van de link weggevallen bij het kopiëren. " +
        "Vraag je contactpersoon om een nieuwe.",
    },
  } as const;

  const scherm = schermen[state as keyof typeof schermen];

  return (
    <AuthPanel>
      <div className="flex flex-col gap-4">
        <span className="mono-label">Uitnodiging</span>
        <h1 className="text-2xl font-bold tracking-tight">{scherm.title}</h1>
        <p className="text-secondary">{scherm.body}</p>
        <Link href="/login" className="btn-primary w-fit">
          Naar inloggen
        </Link>
      </div>
    </AuthPanel>
  );
}
