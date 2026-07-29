import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { loadResults } from "@/lib/pipeline/results";

/**
 * GET /api/analyses/[id]/results/export — het behaalde effect als CSV
 * (optimalisatie.md 5.9).
 *
 * Voor bureaus is dit het bestand waarmee ze hun eigen klant behouden; voor
 * ondernemers de bevestiging dat het geld goed besteed was.
 *
 * CSV en geen PDF: dit gaat naar Excel, naar een rapportage, of naar een mail —
 * en een PDF genereren vraagt een bibliotheek van megabytes voor iets wat
 * niemand daarna nog kan bewerken.
 */
function csvCell(value: string | number | null): string {
  if (value == null) return "";
  const s = String(value);
  // Puntkomma als scheidingsteken (Nederlandse Excel-instelling), dus die moet
  // ook ontsnapt worden — net als aanhalingstekens en regeleindes.
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const results = await loadResults(admin, id);

  const header = [
    "Pagina",
    "Gepubliceerd op",
    "URL",
    "Doelvragen",
    "Genoemd vóór",
    "Genoemd na",
    "Verschil (punten)",
    "Controlegroep (punten)",
    "Drempel (punten)",
    "Oordeel",
  ];

  const rows = results.pieces.map((p) => [
    csvCell(p.title),
    csvCell(p.publishedAt.slice(0, 10)),
    csvCell(p.publishedUrl),
    csvCell(p.impact?.target_total ?? null),
    csvCell(p.impact?.target_before_mentioned ?? null),
    csvCell(p.impact?.target_after_mentioned ?? null),
    csvCell(p.impact?.target_delta ?? null),
    csvCell(p.impact?.control_delta ?? null),
    csvCell(p.impact?.delta_threshold ?? null),
    csvCell(p.impact?.verdict ?? "nog aan het meten"),
  ]);

  const summary = [
    [],
    [csvCell("Samenvatting")],
    [csvCell("Geschreven"), csvCell(results.funnel.generated)],
    [csvCell("Nagekeken"), csvCell(results.funnel.reviewed)],
    [csvCell("Gepubliceerd"), csvCell(results.funnel.published)],
    [csvCell("Effect gemeten"), csvCell(results.funnel.measured)],
  ];

  // BOM vooraan, anders toont Excel accenten verkeerd — een detail dat elk
  // Nederlands CSV-bestand raakt en dat je één keer goed regelt.
  const csv =
    "﻿" +
    [header.map(csvCell), ...rows, ...summary].map((r) => r.join(";")).join("\r\n");

  const filename = `geo-resultaat-${analysis.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
