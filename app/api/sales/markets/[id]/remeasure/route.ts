import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSalesAdmin } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { maakHermeting } from "@/lib/pipeline/sales-remeasure";

/**
 * POST /api/sales/markets/[id]/remeasure, dezelfde markt opnieuw meten
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 22, sprint 7).
 *
 * ── DIT IS DE STAP DIE DE ECONOMIE VAN DE MODULE VERANDERT ──────────────────
 *
 * "Zonder opportunitytype 8 is een marktanalyse een eenmalige oogst: je haalt er
 * acht kansen uit en daarna is die markt leeg. Met dit type levert elke hermeting
 * een nieuwe lichting belaanleidingen op uit dezelfde markt, zonder nieuwe
 * marktontdekking en tegen alleen de meetkosten."
 *
 * ⚠️ **DEZELFDE VRAGEN, LETTERLIJK.** Type 8 vergelijkt twee rondes met elkaar,
 * en dat mag alleen als het verschil aan de markt ligt en niet aan de vraag. De
 * nieuwe ronde krijgt daarom een kopie van de vragen van de vorige ronde,
 * inclusief hun gewicht en hun intentielabel. Zou hij nieuwe vragen genereren,
 * dan meet je het verschil tussen twee vragenlijsten en presenteer je dat als een
 * daling van het bedrijf. Dat is de fout die een verkoper voor schut zet bij een
 * ondernemer die vraagt wat er precies veranderd is.
 *
 * ⚠️ En daarom slaat deze route de intentie- en vragenstap over, maar NIET poort
 * 2: meten kost geld, dus er komt een mens aan te pas (plan §8.1).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isSalesAdmin(user.id))) return new NextResponse(null, { status: 404 });

  // Het werk zelf staat in `lib/pipeline/sales-remeasure.ts`, want de geplande
  // hermeting doet exact hetzelfde vanuit de wachtrij.
  const uit = await maakHermeting(createAdminClient(), id, user.id);
  if (!uit.ok) {
    return NextResponse.json({ error: uit.melding }, { status: 409 });
  }

  return NextResponse.json(
    { ok: true, runId: uit.runId, ronde: uit.ronde, vragen: uit.vragen },
    { status: 202 },
  );
}
