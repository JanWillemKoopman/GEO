import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

export default async function InstellingenPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader
        title="Mijn instellingen"
        description="Accountinstellingen, los van je merken."
      />

      <div className="card flex flex-col gap-4">
        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
          <span className="text-secondary">E-mailadres</span>
          <span className="font-medium">{user.email}</span>
        </div>
        <p className="text-secondary">
          Wachtwoord wijzigen en overige accountinstellingen komen hier binnenkort beschikbaar.
        </p>
      </div>
    </div>
  );
}
