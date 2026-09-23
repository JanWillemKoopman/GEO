import { laadPaginas } from "@/lib/pagina-data";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPlan } from "@/lib/plans";
import { backlogCount } from "@/lib/plan-backlog-data";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { PlanView } from "./plan-view";
import { PlanReadView } from "./plan-read-view";
import { PlanCalendarView } from "./plan-calendar-view";
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
 * ⚠️ Sinds 22 september 2026 landt iedereen zonder `?weergave=` op het bord
 * (Plannen): dat is de weergave waar het meeste werk gebeurt. Beiden kunnen
 * alles wat het plan kan; wie een weergave in de URL meegeeft krijgt die,
 * ongeacht rol, zodat een gedeelde link bij iedereen hetzelfde opent.
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
  // De ene stand per pagina (`lib/pagina-stand.ts`), zodat het plan hetzelfde
  // zegt als de bibliotheek, "Openstaande vragen" en het paginascherm (23 september 2026).
  const standen = Object.fromEntries(
    (await laadPaginas(admin, id))
      .filter((r) => r.plannedPageId)
      .map((r) => [r.plannedPageId!, { naam: r.naam, label: r.stand.label, toon: r.stand.toon, handeling: r.stand.handeling, sleutel: r.stand.sleutel, looptAchter: r.stand.looptAchter }]),
  );


  const { data: account } = profile.account_id
    ? await admin
        .from("accounts")
        .select("package_pages_per_month, name")
        .eq("id", profile.account_id)
        .maybeSingle()
    : { data: null };

  const quota = (account?.package_pages_per_month as number | null) ?? null;

  const kansen = bundle ? 0 : await backlogCount(admin, id);

  // Blok A punt 7: de link naar eerdere voorstellen alleen tonen als die er
  // ook echt zijn. Eén telling in plaats van de volle `loadPlanVersions()`:
  // dit scherm hoeft alleen te weten of er meer dan één versie bestaat.
  const { count: versieAantal } = bundle
    ? await admin
        .from("content_plans")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", id)
    : { count: 0 };

  // Blok A punt 6: een derde weergave naast Overzicht en Plannen. Zelfde regel
  // als de andere twee: een weergave in de URL wint, ongeacht rol, zodat een
  // gedeelde link bij iedereen hetzelfde opent. Zonder weergave in de URL
  // landt iedereen op Plannen.
  const modus: "overzicht" | "plannen" | "kalender" =
    weergave === "plannen" || weergave === "kalender" || weergave === "overzicht"
      ? weergave
      : "plannen";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Strategie"
        title="Contentplan"
        description={
          modus === "plannen"
            ? "Sleep content naar de maand waarin het geschreven moet worden. Elke maand geef je apart vrij."
            : modus === "kalender"
              ? "Het hele jaar in één oogopslag: waar zit alles gepland, en waar valt een gat."
              : "Wat ORBIT ENGINE deze maand en volgende maand voor je schrijft, en wanneer het live moet."
        }
        action={
          bundle && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Blok A punt 7: alleen tonen als er ook echt meer dan één
                  voorstel is. */}
              {(versieAantal ?? 0) > 1 && (
                <Link href={`/merk/${id}/strategie/plan/versies`} className="btn-outline">
                  Eerdere voorstellen
                </Link>
              )}
              {/* Punt 28 uit docs/tasks/nova-vergelijking-verbeterpunten.md: de
                  klant die dit meeneemt naar een eigen overleg wil het hele
                  plan zien, dus alleen tonen zodra er een plan bestaat om te
                  downloaden. */}
              <a
                href={`/api/profiles/${id}/plan/export`}
                className="btn-outline inline-flex items-center gap-1.5"
              >
                <Icon naam="downloaden" size={16} />
                Download CSV
              </a>
            </div>
          )
        }
      />

      {bundle && <WeergaveKiezer profileId={id} modus={modus} />}

      {bundle ? (
        modus === "plannen" ? (
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
            standen={standen}
          />
        ) : modus === "kalender" ? (
          <PlanCalendarView
            plan={bundle.plan}
            months={bundle.months}
            pages={bundle.pages}
            topics={bundle.topics}
          />
        ) : (
          <PlanReadView
            profileId={id}
            plan={bundle.plan}
            months={bundle.months}
            pages={bundle.pages}
            topics={bundle.topics}
            clusterNaam={bundle.clusterNaam}
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
 * De schakelaar tussen de drie weergaven.
 *
 * Links en geen tabbladen: dit is één scherm dat op drie manieren te lezen is,
 * en een link houdt de keuze deelbaar. Dezelfde regel als bij de hoofdstukken
 * van het clusterdossier (`docs/ux-design.md`). Kalender (blok A punt 6) is de
 * derde: Nova's "Table"/"Calendar"-schakelaar, hier als eigen weergave naast
 * Overzicht en Plannen in plaats van een schakelaar binnen één scherm, want
 * die twee bestonden al als losse pagina's met hun eigen url.
 */
function WeergaveKiezer({
  profileId,
  modus,
}: {
  profileId: string;
  modus: "overzicht" | "plannen" | "kalender";
}) {
  const basis = `/merk/${profileId}/strategie/plan`;
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Keuze href={`${basis}?weergave=plannen`} actief={modus === "plannen"}>
        Plannen
      </Keuze>
      <Keuze href={`${basis}?weergave=kalender`} actief={modus === "kalender"}>
        Kalender
      </Keuze>
      <Keuze href={`${basis}?weergave=overzicht`} actief={modus === "overzicht"}>
        Overzicht
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
      className="rounded-[var(--radius-xl)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--wash-hover)]"
      style={{
        color: actief ? "var(--text-primary)" : "var(--text-secondary)",
        background: actief ? "var(--bg-elevated)" : undefined,
      }}
    >
      {children}
    </Link>
  );
}
