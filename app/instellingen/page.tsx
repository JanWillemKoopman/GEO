import { requireUser } from "@/lib/auth";

export default async function InstellingenPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Mijn instellingen</h1>
        <p className="mt-2 text-secondary">Accountinstellingen, los van je bedrijfsgegevens.</p>
      </div>

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
