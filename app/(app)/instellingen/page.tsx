import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

export default async function InstellingenPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader
        eyebrow="Aura · account"
        title="Mijn instellingen"
        description="Je persoonlijke account. Instellingen per merk en per analyse staan bij het merk of de analyse zelf."
      />

      <div className="card flex flex-col gap-4">
        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
          <span className="text-secondary">E-mailadres</span>
          <span className="font-medium">{user.email}</span>
        </div>
        <p className="text-secondary">
          Wachtwoord wijzigen en de overige accountinstellingen komen hier binnenkort.
        </p>
      </div>
    </div>
  );
}
