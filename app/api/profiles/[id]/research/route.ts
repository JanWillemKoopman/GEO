import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { describeError, classifyError } from "@/lib/errors";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { checkBudgetForProfile } from "@/lib/spend-limit";

/**
 * POST /api/profiles/[id]/research, plant het profielonderzoek in
 * (optimalisatie.md 1.4). Zelfde patroon als de andere routes: inplannen en
 * direct antwoorden, de werker doet het werk.
 *
 * Dit is de zwaarste enkele taak in het systeem (sitemap-crawl van tot 150
 * pagina's + AI-onderzoek met web_search), en juist daarom hoort hij op de
 * achtergrond en niet in een route waar een browser op wacht.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  try {
    if (profile.status === "mislukt") {
      await admin.from("profiles").update({ status: "bezig" }).eq("id", id);
    }

  // ⚠️ Betaald werk start alleen de beheerder (besluit 18). Zie lib/cost-guard.ts
  // voor de rekensom eronder: zonder deze regel kan een klant op één middag
  // dollars uitgeven zonder dat iemand het merkt.
  if (!(await mayTriggerCost(user.id, "merk_onderzoeken"))) {
    return NextResponse.json({ error: COST_DENIED.merk_onderzoeken }, { status: 403 });
  }

  // ⚠️ De TWEEDE rem, en hij staat los van de eerste (F1, lib/spend-limit.ts).
  // Besluit 18 hierboven haalde de klant weg als risicobron. Wat het niet
  // wegneemt: een beheerder die zich vergist in een lus, of een cron die
  // twintig keer vuurt. Die vragen niemand om toestemming.
  const budget = await checkBudgetForProfile(id);
  if (!budget.ok) {
    return NextResponse.json({ error: budget.message }, { status: 402 });
  }

    const { created } = await enqueue(admin, {
      type: "profile_research",
      payload: {},
      profileId: id,
      dedupeKey: dedupe.profileResearch(id),
    });

    return NextResponse.json({ queued: true, created, status: "bezig" });
  } catch (err) {
    console.error(`profielonderzoek inplannen mislukt voor ${id}:`, err);
    return NextResponse.json(
      { error: "ORBIT ENGINE kon het onderzoek niet inplannen.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
