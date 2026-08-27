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
 * Het contentplan van één merk.
 *
 * Twee toestanden: er is een plan, of er is er nog geen. Dat tweede is geen lege
 * lijst maar een eigen scherm dat uitlegt wat er gaat gebeuren en wat ervoor
 * nodig is (`docs/ux-design.md` §4: een paneel dat niets te tonen heeft,
 * verdwijnt niet, het toont waaróm het leeg is).
 */
export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();
  const user = await requireUser();
  // Besluit 18: betaald werk start alleen de beheerder. De klant ziet het plan
  // volledig en keurt in het gesprek goed; de knop die geld kost, staat er voor
  // hem niet. Een knop tonen die een 403 oplevert is erger dan geen knop.
  const staff = await isStaff(user.id);

  const admin = createAdminClient();
  const bundle = await loadPlan(admin, id);

  // Het pakket bepaalt de quota, en zonder pakket is er geen plan te maken.
  // Dat hoort het scherm te zeggen in plaats van een knop te tonen die faalt.
  const { data: account } = profile.account_id
    ? await admin
        .from("accounts")
        .select("package_pages_per_month, name")
        .eq("id", profile.account_id)
        .maybeSingle()
    : { data: null };

  const quota = (account?.package_pages_per_month as number | null) ?? null;

  // ⚠️ De voorwaarde voor een plan is niet meer "er zijn onderwerpen" maar "er
  // is minstens één cluster gemeten". Een plan opstellen uit onderwerpen die
  // nooit gemeten zijn, leverde precies de 120 rijen op waarvan er 103 een jaar
  // lang op een meting stonden te wachten. Alleen tellen als er nog geen plan
  // is: staat het scherm hieronder al, dan heeft `loadPlan()` de voorraad net
  // gesynchroniseerd.
  const kansen = bundle ? 0 : await backlogCount(admin, id);

  return (
    <div className="flex flex-col gap-6">
      {/* ⚠️ Twee beschrijvingen, want dit scherm heeft sinds 27 augustus 2026
          twee gedaanten. De oude tekst ("sleep beschikbare content items naar
          de maand waarin ze geschreven moeten worden") stond er voor iedereen,
          ook voor de klant die niet sleept en niet mag slepen. */}
      <PageHeader
        eyebrow="Strategie"
        title="Contentplan"
        description={
          staff
            ? "Plan content op basis van je clusteranalyses. Sleep beschikbare content items naar de maand waarin ze geschreven moeten worden."
            : "Wat ORBIT ENGINE deze maand en volgende maand voor je schrijft, en wanneer het live moet."
        }
      />

      {bundle ? (
        staff ? (
          <PlanView
            profileId={id}
            plan={bundle.plan}
            months={bundle.months}
            pages={bundle.pages}
            backlog={bundle.backlog}
            funnels={bundle.funnels}
            topics={bundle.topics}
            staff={staff}
          />
        ) : (
          // De leesweergave. Zie `lib/plan-read.ts` voor het waarom: het
          // sleepbord is het werkblad van de consultant, en het vroeg de
          // zwaarste bediening van de app van de gebruiker die er het minst
          // mee doet.
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
