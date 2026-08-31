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

  // ⚠️ Dezelfde controle als de POST hieronder, en dat stond er eerst niet.
  // Deze `GET` toetste alleen eigendom, dus een klantaccount kreeg gewoon de
  // vooruitblik ("Dit is de eerste aanvullende ronde voor dit merk", met de
  // geschatte kosten erbij): geen uitgavelek, maar wel de regie-informatie die
  // volgens werkpakket A §3.5 bij de beheerder hoort te blijven (punt 8 van
  // docs/tasks/opdracht-bevindingen-5-tot-9.md). `TopicRefreshButton` is de
  // enige aanroeper en die staat alleen op het scherm van een beheerder
  // (`topics-panel.tsx`), dus een klant kwam er nooit langs; deze regel is de
  // garantie op de achterkant die daar niet van afhankelijk is (conventie 1).
  if (!(await mayTriggerCost(user.id, "clusters_aanvullen"))) {
    return NextResponse.json({ error: COST_DENIED.clusters_aanvullen }, { status: 403 });
  }

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
