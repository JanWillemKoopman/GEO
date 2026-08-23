import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { mayTriggerCost, COST_DENIED } from "@/lib/cost-guard";
import { checkBudgetForProfile } from "@/lib/spend-limit";
import { RUN_BUDGET_EUR } from "@/lib/reputation/budget";
import type { ReputationDepth } from "@/lib/types/database";

/**
 * Een reputatieanalyse starten (docs/tasks/mijn-reputatie.md §3.4).
 *
 * ── DRIE REMMEN, EN ZE STAAN LOS VAN ELKAAR ─────────────────────────────────
 *
 * Precies dezelfde drie als op `deep-research/route.ts`, en om dezelfde reden:
 * elke dure route stelt dezelfde vraag aan dezelfde functie. Twee functies die
 * hetzelfde zouden moeten doen drijven uit elkaar (conventie P2), en dat is met
 * `getOwnedProfile` en `getOwnedAnalysis` letterlijk gebeurd.
 *
 *   1. ZIEN mag iedereen die bij het merk mag (`getOwnedProfile`, de drie lagen
 *      uit `lib/access.ts`).
 *   2. STARTEN mag alleen de beheerder (`mayTriggerCost`, besluit 18). Zonder
 *      deze regel kan een klant op één middag dollars uitgeven zonder dat iemand
 *      het merkt.
 *   3. DOORGAAN mag alleen als het maand- en dagplafond het toelaat
 *      (`checkBudgetForProfile`). Besluit 18 haalde de klant weg als risicobron;
 *      wat het niet wegneemt is een beheerder die zich vergist, of een cron die
 *      twintig keer vuurt. Die vragen niemand om toestemming.
 *
 * ⚠️ De knop wordt NIET verborgen voor de klant. Verbergen betekent dat hij niet
 * weet dat dit bestaat, en dit is een product dat je wilt verkopen. Hij ziet wat
 * het is, wat het oplevert, en bij wie hij moet zijn. Vandaar dat regel 2 een
 * 403 met een uitleg geeft en geen 404.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile)
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  // ── Rem 2: wie mag betaald werk starten ──────────────────────────────────
  if (!(await mayTriggerCost(user.id))) {
    return NextResponse.json({ error: COST_DENIED.reputatie_starten }, { status: 403 });
  }

  // ── Rem 3: het maand- en dagplafond van het account ──────────────────────
  const budget = await checkBudgetForProfile(id);
  if (!budget.ok) {
    return NextResponse.json({ error: budget.message }, { status: 402 });
  }

  // ── Loopt er al een? ─────────────────────────────────────────────────────
  //
  // Een tweede run naast een lopende zou dezelfde vragen nog een keer stellen en
  // dus nog een keer betalen, en het scherm zou niet weten welke van de twee het
  // moet tonen. Een AFGERONDE run blokkeert niet: een herhaalscan over drie
  // maanden is nieuw werk (§7).
  const { data: lopend } = await admin
    .from("reputation_runs")
    .select("id")
    .eq("profile_id", id)
    .in("status", ["queued", "running"])
    .maybeSingle();

  if (lopend) {
    return NextResponse.json(
      { error: "Er loopt al een reputatieanalyse voor dit merk." },
      { status: 409 },
    );
  }

  // ── De diepte ────────────────────────────────────────────────────────────
  //
  // ⚠️ Alleen `standaard` wordt vandaag daadwerkelijk anders behandeld. `diep`
  // is in het datamodel voorzien (§2.3) maar de herhalingen en de extra rotaties
  // komen pas in sprint R5. De waarde wordt wél bewaard, zodat een run van
  // vandaag straks van een run van later te onderscheiden is.
  let depth: ReputationDepth = "standaard";
  try {
    const body = (await request.json()) as { depth?: string };
    if (body?.depth === "diep") depth = "diep";
  } catch {
    // Geen body is prima: dan is het de standaardmodus.
  }

  const { data: run, error } = await admin
    .from("reputation_runs")
    .insert({
      profile_id: id,
      started_by: user.id,
      depth,
      status: "queued",
      // Het plafond dat voor DEZE run geldt, meebewaard. Verandert het later,
      // dan moet een oude run nog steeds uit te leggen zijn.
      budget_eur: RUN_BUDGET_EUR,
    })
    .select("id")
    .single();

  if (error || !run) {
    return NextResponse.json(
      { error: "De reputatieanalyse kon niet gestart worden. Probeer het opnieuw." },
      { status: 500 },
    );
  }

  // De run bestaat nu, dus de dedupe-sleutel kan eraan hangen. Dat is precies
  // wat een herhaalscan van een duplicaat onderscheidt.
  await enqueue(admin, {
    type: "reputation_start",
    payload: { runId: run.id as string },
    profileId: id,
    dedupeKey: dedupe.reputationStart(run.id as string),
  });

  return NextResponse.json({ ok: true, runId: run.id });
}
