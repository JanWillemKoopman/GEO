import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { TeamBox } from "./team-box";
import { accountsOf, membershipsOf } from "@/lib/accounts";
import { isStaff } from "@/lib/staff";
import { mayInvite } from "@/lib/invite-rules";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccountRole } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn instellingen" };

export default async function InstellingenPage() {
  const user = await requireUser();
  const [accounts, memberships, staff] = await Promise.all([
    accountsOf(user.id),
    membershipsOf(user.id),
    isStaff(user.id),
  ]);

  // Bij een bureau (besluit 9) hoort iemand bij meerdere accounts, en dan is
  // "wie kan erbij" een vraag per account. Vandaar een blok per account en niet
  // één lijst: twee klanten met dezelfde collega erin zijn twee verschillende
  // afspraken.
  const teams = await Promise.all(
    accounts.map(async (account) => {
      const rol = memberships.find((m) => m.accountId === account.id)?.role ?? null;
      return {
        account,
        rol,
        members: await listMembers(account.id, user.id),
        magUitnodigen: mayInvite(rol, staff),
      };
    }),
  );

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader
        eyebrow="Aura · account"
        title="Mijn instellingen"
        description="Je persoonlijke account. Instellingen per merk en per analyse staan bij het merk of de analyse zelf."
      />

      <div className="card flex flex-col gap-4">
        <div className="flex flex-wrap justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
          <span className="text-secondary">E-mailadres</span>
          <span className="break-url font-medium">{user.email}</span>
        </div>
        <p className="text-secondary">
          Wachtwoord wijzigen en de overige accountinstellingen komen hier
          binnenkort.
        </p>
      </div>

      {teams.map((t) => (
        <TeamBox
          key={t.account.id}
          accountId={t.account.id}
          accountName={t.account.name}
          members={t.members}
          mayInvite={t.magUitnodigen}
        />
      ))}
    </div>
  );
}

/**
 * Wie zitten er in dit account?
 *
 * Loopt over de auth-gebruikers omdat `account_users` alleen id's kent en er
 * geen leesbaar profiel naast staat. Bij twintig klanten (besluit 11) is dat
 * één pagina; wordt het groter, dan hoort er een eigen gebruikerstabel te komen.
 */
async function listMembers(
  accountId: string,
  currentUserId: string,
): Promise<{ email: string; role: AccountRole; isYou: boolean }[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("account_users")
    .select("user_id, role")
    .eq("account_id", accountId);
  if (!data || data.length === 0) return [];

  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const opId = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return data
    .map((r) => ({
      email: opId.get(r.user_id as string) ?? "onbekend adres",
      role: r.role as AccountRole,
      isYou: r.user_id === currentUserId,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}
