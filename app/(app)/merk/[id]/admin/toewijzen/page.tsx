import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { membersOf } from "@/lib/accounts";
import { listPendingInvites } from "@/lib/invites";
import { PageHeader } from "@/components/page-header";
import { PackageBox } from "../../_components/package-box";
import { overdrachtZonderCluster } from "@/lib/cluster-start";
import { TeamBox } from "@/app/(app)/instellingen/team-box";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperuserEmail, ROL_LABEL, ROL_UITLEG, type Rol } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Toegang" };

/**
 * Dit merk aan een klantaccount koppelen. Doe je ná het gesprek, niet tijdens,
 * vandaar een eigen scherm en niet een blok tussen wat de klant meeleest.
 *
 * ⚠️ Een klant krijgt hier een **404 en geen 403**. Een 403 bevestigt dat het
 * scherm bestaat, en dat is precies wat een klant niet hoort te weten. Zelfde
 * patroon als `app/(app)/beheer/page.tsx`.
 */
export default async function ToewijzenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  const staff = await isStaff(user.id);
  if (!staff) notFound();

  // Het pakket en de startdatum hangen aan het account onder dit merk, niet aan
  // het merk zelf.
  // Zie `app/(app)/merk/[id]/_components/package-box.tsx` voor waarom het juist
  // op dit scherm staat, en `lib/package-sizes.ts` voor de fout die het oplost.
  const account = profile.account_id
    ? (
        await createAdminClient()
          .from("accounts")
          .select("id, name, package_pages_per_month, started_at")
          .eq("id", profile.account_id)
          .maybeSingle()
      ).data
    : null;

  // Wie bij dit merk kan loopt via het account eronder (`account_users`,
  // migratie 0046), niet via het merk zelf. Eén formulier nodigt uit: hangt het
  // merk nog aan geen klant, dan maakt het eerste adres het klantaccount aan
  // (`assign-by-email`); daarna gaat elk adres via
  // `POST /api/accounts/[id]/invites`, die een consultant altijd toelaat
  // (`mayInvite` in lib/invite-rules.ts). De keuzelijst met bestaande accounts
  // (`AssignBox`) is op 30 september 2026 weggehaald: hij liet je een merk aan
  // een verkeerd account hangen en het verschil met het e-mailveld was niet uit
  // te leggen.
  //
  // Zolang `assigned_at` leeg is hangt het merk nog aan het account van de
  // consultant zelf. Die tel je niet als klant: de klant komt er pas bij met de
  // eerste uitnodiging hieronder.
  const gekoppeld = Boolean(profile.assigned_at);
  const accountId = gekoppeld ? ((account?.id as string | undefined) ?? null) : null;
  const [ledenRuw, pending] = accountId
    ? await Promise.all([membersOf(accountId, user.id), listPendingInvites(accountId)])
    : [[], []];

  // Wie in dit account is eigenlijk een consultant? Die staat in `staff_users`
  // en wordt hier niet als klant getoond.
  const { data: stafRijen } = ledenRuw.length
    ? await createAdminClient()
        .from("staff_users")
        .select("user_id")
        .in("user_id", ledenRuw.map((l) => l.userId))
    : { data: [] as { user_id: string }[] };
  const stafIds = new Set((stafRijen ?? []).map((r) => r.user_id as string));
  const members = ledenRuw.map((l) => ({
    email: l.email,
    isYou: l.isYou,
    rol: (isSuperuserEmail(l.email) ? "superuser" : stafIds.has(l.userId) ? "consultant" : "klant") as Rol,
  }));

  // Een merk zonder cluster overdragen levert gegarandeerd een klant op die op
  // een leeg overzicht kijkt en zelf niets kan starten, want een cluster
  // beginnen is beheerderswerk. Dat hoort hier gezegd te worden, op het scherm
  // waar de overdracht gebeurt, en niet pas als de klant belt.
  const { count: clusterAantal } = await createAdminClient()
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", id);
  const clusterWaarschuwing = overdrachtZonderCluster(clusterAantal ?? 0);

  return (
    // `wil-lezen`: formulierpatroon (§8.6/§8.8), 720px in plaats van 1440.
    <div className="flex flex-col gap-6 wil-lezen">
      <PageHeader
        eyebrow="Admin"
        title="Toegang"
        description="Wie dit merk kan zien, en het uitnodigen van de klant."
      />

      {clusterWaarschuwing && (
        <div className="card card-rail card-rail-warning flex flex-col gap-1">
          <span className="mono-label">Nog niets om naar te kijken</span>
          <p className="text-sm text-secondary">{clusterWaarschuwing}</p>
        </div>
      )}

      <TeamBox
        accountId={accountId}
        accountName={gekoppeld ? ((account?.name as string | undefined) ?? "dit merk") : "dit merk"}
        members={members}
        pending={pending}
        mayInvite
        profileId={id}
      />

      <div className="card flex flex-col gap-2">
        <span className="mono-label">Wie kan wat</span>
        <ul className="flex flex-col gap-1 text-sm text-secondary">
          {(["superuser", "consultant", "klant"] as const).map((r) => (
            <li key={r}>
              <strong className="text-[var(--text-primary)]">{ROL_LABEL[r]}.</strong> {ROL_UITLEG[r]}
            </li>
          ))}
        </ul>
      </div>

      <PackageBox
        accountId={accountId}
        accountName={accountId ? ((account?.name as string | undefined) ?? null) : null}
        current={accountId ? ((account?.package_pages_per_month as number | null | undefined) ?? null) : null}
        startedAt={accountId ? ((account?.started_at as string | null | undefined) ?? null) : null}
      />
    </div>
  );
}
