import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { TeamBox } from "./team-box";
import { AccountBox } from "./account-box";
import { SecurityBox } from "./security-box";
import { accountsOf, membershipsOf, membersOf } from "@/lib/accounts";
import { isStaff } from "@/lib/staff";
import { mayInvite } from "@/lib/invite-rules";
import { listPendingInvites } from "@/lib/invites";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn account" };

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
        members: await membersOf(account.id, user.id),
        pending: await listPendingInvites(account.id),
        magUitnodigen: mayInvite(rol, staff),
      };
    }),
  );

  return (
    <div className="wil-lezen flex flex-col gap-6">
      <PageHeader
        eyebrow="Account"
        title="Mijn account"
        description="Je gegevens, je wachtwoord en je team. Wat bij een merk hoort, staat bij dat merk."
      />

      <SecurityBox email={user.email ?? ""} />

      {teams.map((t) => (
        <AccountBox
          key={`account-${t.account.id}`}
          account={t.account}
          // Alleen een admin van dít account mag wijzigen; een member leest mee.
          mayEdit={t.rol === "admin" || staff}
        />
      ))}

      {teams.map((t) => (
        <TeamBox
          key={t.account.id}
          accountId={t.account.id}
          accountName={t.account.name}
          members={t.members}
          pending={t.pending}
          mayInvite={t.magUitnodigen}
        />
      ))}
    </div>
  );
}
