import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPlan } from "@/lib/plans";
import { backlogCount } from "@/lib/plan-backlog-data";
import { PageHeader } from "@/components/page-header";
import { PlanView } from "./plan-view";
import { PlanReadView } from "./plan-read-view";
import { CreatePlanBox } from "./create-plan-box";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contentplan" };

/**
 * Het contentplan, in twee weergaven die iedereen mag zien.
 *
 * ── WAAROM TWEE ─────────────────────────────────────────────────────────────
 *
 * Hetzelfde plan beantwoordt twee verschillende vragen. "Wat gebeurt er deze
 * maand en wat moet ik doen" is een leesvraag; daar hoort een lijstje bij.
 * "Welke pagina komt in welke maand" is een planvraag; daar hoort het sleepbord
 * bij, met de voorraad ernaast.
 *
 * Tot 27 augustus 2026 was er alleen het bord, ook voor de klant, met bovenaan
 * de uitleg "sleep beschikbare content items naar de maand waarin ze geschreven
 * moeten worden". Dat vroeg de zwaarste bediening van de app van de gebruiker
 * die er het minst vaak komt.
 *
 * ⚠️ Het verschil zit alleen in wat je als eerste ziet, niet in wat je mag. De
 * klant landt op het overzicht en gaat met één klik naar het bord; de
 * consultant landt op het bord. Beiden kunnen alles wat het plan kan. Wie een
 * weergave in de URL meegeeft (`?weergave=`) krijgt die, ongeacht rol, zodat
 * een gedeelde link bij beiden hetzelfde opent.
 */
export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ weergave?: string }>;
}) {
  const { id } = await params;
  const { weergave } = await searchParams;
  const profile = await getProfile(id);
  if (!profile) notFound();
  const user = await requireUser();
  const staff = await isStaff(user.id);

  const admin = createAdminClient();
  const bundle = await loadPlan(admin, id);

  const { data: account } = profile.account_id
    ? await admin
        .from("accounts")
        .select("package_pages_per_month, name")
        .eq("id", profile.account_id)
        .maybeSingle()
    : { data: null };

  const quota = (account?.package_pages_per_month as number | null) ?? null;

  const kansen = bundle ? 0 : await backlogCount(admin, id);

  const bord = weergave ? weergave === "plannen" : staff;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Strategie"
        title="Contentplan"
        description={
          bord
            ? "Sleep content naar de maand waarin het geschreven moet worden. Elke maand geef je apart vrij."
            : "Wat ORBIT ENGINE deze maand en volgende maand voor je schrijft, en wanneer het live moet."
        }
      />

      {bundle && <WeergaveKiezer profileId={id} bord={bord} />}

      {bundle ? (
        bord ? (
          <PlanView
            profileId={id}
            plan={bundle.plan}
            months={bundle.months}
            pages={bundle.pages}
            backlog={bundle.backlog}
            declined={bundle.declined}
            funnels={bundle.funnels}
            topics={bundle.topics}
            staff={staff}
          />
        ) : (
          <PlanReadView
            profileId={id}
            plan={bundle.plan}
            months={bundle.months}
            pages={bundle.pages}
            topics={bundle.topics}
          />
        )
      ) : (
        <CreatePlanBox
          profileId={id}
          staff={staff}
          quota={quota}
          kansCount={kansen}
          accountName={(account?.name as string | undefined) ?? null}
        />
      )}
    </div>
  );
}

/**
 * De schakelaar tussen de twee weergaven.
 *
 * Twee links en geen tabbladen: dit is één scherm dat op twee manieren te lezen
 * is, en een link houdt de keuze deelbaar. Dezelfde regel als bij de
 * hoofdstukken van het clusterdossier (`docs/ux-design.md`).
 */
function WeergaveKiezer({ profileId, bord }: { profileId: string; bord: boolean }) {
  const basis = `/merk/${profileId}/strategie/plan`;
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Keuze href={`${basis}?weergave=overzicht`} actief={!bord}>
        Overzicht
      </Keuze>
      <Keuze href={`${basis}?weergave=plannen`} actief={bord}>
        Plannen
      </Keuze>
    </div>
  );
}

function Keuze({
  href,
  actief,
  children,
}: {
  href: string;
  actief: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={actief ? "page" : undefined}
      className="rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--wash-hover)]"
      style={{
        color: actief ? "var(--text-primary)" : "var(--text-secondary)",
        background: actief ? "var(--bg-elevated)" : undefined,
      }}
    >
      {children}
    </Link>
  );
}
