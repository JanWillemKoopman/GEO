import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { PAGE_TYPE_LABEL, PLAN_STATUS_META } from "@/lib/plan-status";
import type { ContentPlan, FunnelStage, PlanMonth, PlannedPage } from "@/lib/types/database";

/**
 * GET /api/profiles/[id]/plan/export, het contentplan als CSV (Nova's
 * "Download CSV" op het planscherm, punt 28 uit
 * docs/tasks/nova-vergelijking-verbeterpunten.md).
 *
 * Eén rij per geplande pagina, ongeacht of hij al geschreven of geplaatst is:
 * de klant die dit meeneemt naar een eigen overleg wil het hele plan zien, niet
 * alleen wat al af is. Het per-pagina exporteren van de tekst zelf bestaat al
 * (`lib/pipeline/content-export.ts`, de downloadknop in de bibliotheek); dit
 * bestand is het overzicht ernaast, geen vervanging.
 */
function csvCell(value: string | number | null): string {
  if (value == null) return "";
  const s = String(value);
  // Puntkomma als scheidingsteken (Nederlandse Excel-instelling), dus die moet
  // ook ontsnapt worden, net als aanhalingstekens en regeleindes.
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const { data: planRow } = await admin
    .from("content_plans")
    .select("*")
    .eq("profile_id", id)
    .maybeSingle();
  const plan = planRow as ContentPlan | null;
  if (!plan) {
    return NextResponse.json({ error: "Er is nog geen contentplan voor dit merk." }, { status: 404 });
  }

  const [{ data: maandRijen }, { data: faseRijen }] = await Promise.all([
    admin.from("plan_months").select("*").eq("plan_id", plan.id).order("month_number"),
    admin
      .from("profile_funnel_stages")
      .select("id, label, sort_order")
      .eq("profile_id", id),
  ]);
  const maanden = (maandRijen ?? []) as PlanMonth[];
  const fases = new Map(((faseRijen ?? []) as FunnelStage[]).map((f) => [f.id, f.label]));

  const maandIds = maanden.map((m) => m.id);
  const { data: paginaRijen } =
    maandIds.length > 0
      ? await admin
          .from("planned_pages")
          .select("*")
          .in("plan_month_id", maandIds)
          .order("sort_order")
      : { data: [] };
  const paginas = (paginaRijen ?? []) as PlannedPage[];
  const maandNummerVan = new Map(maanden.map((m) => [m.id, m.month_number]));

  const header = [
    "Maand",
    "Titel",
    "Type",
    "Fase",
    "Status",
    "Gepland op",
    "Geplaatst op",
    "URL",
  ];

  const rows = paginas
    // Buffers wachten op een plek die pas ontstaat als een andere pagina
    // sneuvelt: in het plan van de klant zijn ze nog geen belofte.
    .filter((p) => !p.is_buffer)
    .map((p) => [
      csvCell(maandNummerVan.get(p.plan_month_id) ?? null),
      csvCell(p.title),
      csvCell(PAGE_TYPE_LABEL[p.page_type] ?? p.page_type),
      csvCell(p.funnel_stage_id ? (fases.get(p.funnel_stage_id) ?? "") : ""),
      csvCell(PLAN_STATUS_META[p.status].label),
      csvCell(p.scheduled_for),
      csvCell(p.posted_at ? p.posted_at.slice(0, 10) : null),
      csvCell(p.posted_url),
    ]);

  // BOM vooraan, anders toont Excel accenten verkeerd (zie de analyse-variant
  // van dit bestand, app/api/analyses/[id]/results/export/route.ts).
  const csv = "﻿" + [header.map(csvCell), ...rows].map((r) => r.join(";")).join("\r\n");

  const filename = `contentplan.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
