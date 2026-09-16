import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/profiles/[id]/plan/requeue-overdue (blok D punt 18,
 * `docs/tasks/nova-vergelijking-verbeterpunten.md`).
 *
 * Nova: "Reschedule the post instead, that moves the date and re-queues the
 * write in one step. A publication date in the past is skipped, so a rewrite
 * on its own would never go out."
 *
 * ── WAAROM ÉÉN KLIK TWEE DINGEN MOET DOEN ────────────────────────────────────
 *
 * `app/api/cron/plan/route.ts` haalt alleen pagina's op met `status =
 * 'gepland'`. Een pagina die vastloopt in `status = 'schrijven'` (de
 * schrijftaak stierf, of raakte om een andere reden nooit afgerond) komt daar
 * NOOIT meer in voor, hoe ver de datum ook in het verleden ligt: alleen
 * "opnieuw schrijven" aanroepen verandert die status niet. Een datum vooruit
 * zetten zonder de status te herstellen lost het dus niet op, en de status
 * herstellen zonder de datum vooruit te zetten laat een pagina met een datum
 * die al voorbij is (`csm-data.ts`, dezelfde telling als "over de datum").
 *
 * Vandaar: dit is precies de "reschedule the post" van Nova, met het
 * her-inplannen ERIN in plaats van als losse stap.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isStaff(user.id))) {
    return NextResponse.json({ error: "Alleen voor ORBIT ENGINE zelf." }, { status: 403 });
  }

  const admin = createAdminClient();

  // Dezelfde definitie van "over de datum" als `lib/csm-data.ts`: gepland of
  // schrijven, met een publicatiedatum die al voorbij is, in een maand die al
  // is vrijgegeven (een niet-vrijgegeven maand wordt sowieso nooit geschreven,
  // daar is niets aan "opnieuw inplannen" te repareren).
  const vandaag = new Date().toISOString().slice(0, 10);
  const { data: teLaatRijen, error: leesError } = await admin
    .from("planned_pages")
    .select("id, plan_months!inner(status)")
    .eq("profile_id", id)
    .eq("is_buffer", false)
    .in("status", ["gepland", "schrijven"])
    .not("scheduled_for", "is", null)
    .lt("scheduled_for", vandaag)
    .eq("plan_months.status", "goedgekeurd");

  if (leesError) {
    console.error("Over-de-datum-pagina's ophalen mislukt:", leesError.message);
    return NextResponse.json({ error: "Ophalen is niet gelukt." }, { status: 500 });
  }

  const ids = (teLaatRijen ?? []).map((r) => r.id as string);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, aantal: 0 });
  }

  const morgen = new Date();
  morgen.setDate(morgen.getDate() + 1);

  const { error: schrijfError } = await admin
    .from("planned_pages")
    .update({ scheduled_for: morgen.toISOString().slice(0, 10), status: "gepland" })
    .in("id", ids);

  if (schrijfError) {
    console.error("Over-de-datum-pagina's herinplannen mislukt:", schrijfError.message);
    return NextResponse.json({ error: "Herinplannen is niet gelukt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, aantal: ids.length });
}
