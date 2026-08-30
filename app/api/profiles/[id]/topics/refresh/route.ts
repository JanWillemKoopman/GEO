import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { checkBudgetForProfile } from "@/lib/spend-limit";
import { previewAdditionalRound, proposeAdditionalTopics } from "@/lib/pipeline/propose-more-topics";

/**
 * De knop "Stel nieuwe clusters voor" (docs/optimalisatielab-orbit-engine.md,
 * werkpakket A §3.5).
 *
 * GET: de preview, zonder kosten. Zegt of er iets nieuws is sinds de vorige
 * ronde en wat die ronde ongeveer gaat kosten, zodat het scherm dat kan tonen
 * vóórdat iemand klikt.
 * POST: de ronde daadwerkelijk draaien. Alleen de beheerder (`clusters_aanvullen`
 * in `lib/cost-rules.ts`); de knop staat bij een klant niet eens op het scherm,
 * dit is de garantie op de achterkant (conventie 1).
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const preview = await previewAdditionalRound(id);
  return NextResponse.json(preview);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  // ⚠️ Regieknop, niet klantwerk (lib/cost-rules.ts, 30 augustus 2026): anders
  // dan de vijf handelingen die sinds 27 augustus open staan, bepaalt hier de
  // beheerder wanneer het beeld van een merk goed genoeg is voor een nieuwe
  // ronde, niet de klant.
  if (!(await mayTriggerCost(user.id, "clusters_aanvullen"))) {
    return NextResponse.json({ error: COST_DENIED.clusters_aanvullen }, { status: 403 });
  }

  const budget = await checkBudgetForProfile(id);
  if (!budget.ok) {
    return NextResponse.json({ error: budget.message }, { status: 402 });
  }

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const result = await proposeAdditionalTopics(id);
  return NextResponse.json(result);
}
