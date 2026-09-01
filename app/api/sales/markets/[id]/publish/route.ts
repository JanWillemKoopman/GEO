import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isSalesAdmin } from "@/lib/sales/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { magPubliceren } from "@/lib/sales/report";
import { leesInvoer } from "@/lib/pipeline/sales-report";

/**
 * POST en DELETE /api/sales/markets/[id]/publish
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 20).
 *
 * ── PUBLICEREN IS EEN HANDELING, GEEN GEVOLG ────────────────────────────────
 *
 * "`is_public` staat standaard uit. Publiceren is een expliciete handeling van
 * een sales admin, en intrekken kan altijd." Vandaar twee methodes op één route:
 * POST zet hem aan, DELETE haalt hem eraf. Geen instelling, geen automatisme, en
 * geen stap in de keten die dit als bijproduct doet.
 *
 * ⚠️ **Bij een hermeting verschuift de publieke pagina niet vanzelf.** POST zet
 * `published_run_id` op de ronde die je bewust publiceert. Zou de pagina
 * meebewegen met de laatste meting, dan veranderen de cijfers onder een lopende
 * mailcampagne, en dan leest een prospect andere getallen dan er in zijn mail
 * stonden. Dat is precies de fout die hoofdstuk 15 wil uitsluiten.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  // Publiceren gaat naar buiten, dus alleen een sales admin (plan 4.2).
  if (!(await isSalesAdmin(user.id))) return new NextResponse(null, { status: 404 });

  const admin = createAdminClient();
  const { data: markt } = await admin
    .from("sales_markets")
    .select("id, label, industry, location, slug")
    .eq("id", id)
    .maybeSingle();
  if (!markt) return NextResponse.json({ error: "Deze markt bestaat niet." }, { status: 404 });

  // De jongste afgeronde ronde, want dat is wat er te publiceren valt.
  const { data: runs } = await admin
    .from("sales_runs")
    .select("id, engines, question_count, finished_at")
    .eq("market_id", id)
    .eq("status", "klaar")
    .order("round_no", { ascending: false })
    .limit(1);

  const run = (runs ?? [])[0] as
    | { id: string; engines: string[]; question_count: number; finished_at: string | null }
    | undefined;
  if (!run) {
    return NextResponse.json(
      { error: "Er is nog geen afgeronde meting om te publiceren." },
      { status: 409 },
    );
  }

  const { data: rapport } = await admin
    .from("sales_market_reports")
    .select("id")
    .eq("run_id", run.id)
    .maybeSingle();
  if (!rapport) {
    return NextResponse.json(
      { error: "Er is nog geen rapport geschreven voor deze meting." },
      { status: 409 },
    );
  }

  // ⚠️ De drempel wordt hier opnieuw getoetst en niet alleen bij het schrijven.
  // Tussen die twee momenten kan er een bedrijf om verwijdering hebben gevraagd,
  // en dan blijven er misschien te weinig bedrijven over om nog een marktbeeld
  // te zijn (`lib/sales/report.ts`).
  const invoer = await leesInvoer(admin, run.id, id, {
    label: markt.label as string,
    industry: markt.industry as string,
    location: markt.location as string,
    engines: (run.engines ?? []).filter((e) => e !== "alle"),
    vragen: Number(run.question_count ?? 0),
    gemetenOp: run.finished_at,
  });
  const drempel = magPubliceren(invoer);
  if (!drempel.ok) {
    return NextResponse.json({ error: drempel.bezwaren.join(" ") }, { status: 409 });
  }

  const nu = new Date().toISOString();
  await admin
    .from("sales_markets")
    .update({
      is_public: true,
      published_at: nu,
      published_by: user.id,
      published_run_id: run.id,
      unpublished_at: null,
    })
    .eq("id", id);

  await admin.from("sales_market_reports").update({ published_at: nu }).eq("run_id", run.id);

  return NextResponse.json({ ok: true, adres: `/markt/${markt.slug as string}` });
}

/**
 * Intrekken kan altijd, en het is één handeling.
 *
 * Er zit geen bevestigingsvraag omheen en geen wachttijd: als iemand vindt dat
 * een pagina eraf moet, dan gaat hij eraf. Terugzetten kost één klik, een pagina
 * die te lang bleef staan kost een relatie.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isSalesAdmin(user.id))) return new NextResponse(null, { status: 404 });

  const admin = createAdminClient();
  await admin
    .from("sales_markets")
    .update({ is_public: false, unpublished_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
