import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { TeamBox } from "./team-box";
import { AccountBox } from "./account-box";
import { SecurityBox } from "./security-box";
import { accountsOf, membershipsOf, membersOf, ownAccountIdsOf } from "@/lib/accounts";
import { kiesAccount } from "@/lib/account-keuze";
import { activeBrand } from "@/lib/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaff } from "@/lib/staff";
import { mayInvite } from "@/lib/invite-rules";
import { listPendingInvites } from "@/lib/invites";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn account" };

export default async function InstellingenPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const user = await requireUser();
  const { account: gevraagd } = await searchParams;
  const [accounts, memberships, staff, eigenIds, merk] = await Promise.all([
    accountsOf(user.id),
    membershipsOf(user.id),
    isStaff(user.id),
    ownAccountIdsOf(user.id),
    activeBrand(user.id),
  ]);

  // Het account van het merk waar je nu in zit. Zonder gekozen merk valt de
  // keuze terug op je eigen account (zie `lib/account-keuze.ts`).
  let merkAccountId: string | null = null;
  if (merk) {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("account_id")
      .eq("id", merk.id)
      .maybeSingle();
    merkAccountId = (data?.account_id as string | null) ?? null;
  }

  // Eén account tegelijk. Een bureau (besluit 9) kan er meer hebben, en kiest
  // dan hieronder welk account het gaat; bedrijfsgegevens en team horen bij
  // dat ene account en staan dus niet meer zes keer onder elkaar.
  const account = kiesAccount({ accounts, gevraagd, merkAccountId, eigenIds });
  const rol = account ? (memberships.find((m) => m.accountId === account.id)?.role ?? null) : null;
  const [members, pending] = account
    ? await Promise.all([membersOf(account.id, user.id), listPendingInvites(account.id)])
    : [[], []];

  return (
    <div className="wil-lezen flex flex-col gap-6">
      <PageHeader
        eyebrow="Account"
        title="Mijn account"
        description="Je gegevens, je wachtwoord en je team. Wat bij een merk hoort, staat bij dat merk."
      />

      <SecurityBox email={user.email ?? ""} />

      {accounts.length > 1 && account && (
        <nav aria-label="Kies een account" className="flex flex-col gap-2">
          <span className="mono-label">Voor welk account?</span>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <Link
                key={a.id}
                href={`/instellingen?account=${a.id}`}
                aria-current={a.id === account.id ? "page" : undefined}
                className={a.id === account.id ? "chip" : "chip chip-neutral"}
              >
                {a.name}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {account && (
        <>
          <AccountBox
            // Nieuwe sleutel bij een ander account, anders houdt het formulier de
            // velden van het vorige account vast.
            key={`account-${account.id}`}
            account={account}
            // Elke klant uit dít account mag wijzigen (één klantrol, migratie 0137).
            mayEdit={rol !== null || staff}
            // Opzeggen is admin-werk: een klant vraagt het bij Outer Orbit aan.
            mayCancel={staff}
          />
          <TeamBox
            key={`team-${account.id}`}
            accountId={account.id}
            accountName={account.name}
            members={members}
            pending={pending}
            mayInvite={mayInvite(rol, staff)}
          />
        </>
      )}
    </div>
  );
}
