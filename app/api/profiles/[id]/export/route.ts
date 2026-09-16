import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { BRAND_FIELDS, CLIENT_STEPS, veldAlsTekst } from "@/lib/pipeline/brand-fields";

/**
 * GET /api/profiles/[id]/export, het merkprofiel als CSV (blok B punt 10,
 * `docs/tasks/nova-vergelijking-verbeterpunten.md`, Nova's "Download profile").
 *
 * Precies de 42 velden die de klant ook op `/merk/[id]/merkprofiel/bewerken`
 * ziet (`CLIENT_STEPS`, `lib/pipeline/brand-fields.ts`), niet de vijftien
 * commerciële/contactvelden die uitsluitend in het verkoopgesprek horen. Een
 * klant die dit meeneemt naar zijn eigen tekstschrijver of bureau, geeft
 * daarmee niet per ongeluk prijs waar hij intern nog op wil groeien.
 */
function csvCell(value: string | number | null): string {
  if (value == null) return "";
  const s = String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const velden = BRAND_FIELDS.filter((f) => CLIENT_STEPS.includes(f.step));
  const header = ["Veld", "Waarde"];
  const rows = velden.map((f) => [
    csvCell(f.label),
    csvCell(veldAlsTekst((profile as unknown as Record<string, unknown>)[f.key])),
  ]);

  // BOM vooraan, anders toont Excel accenten verkeerd (zelfde reden als de
  // andere export-routes).
  const csv = "﻿" + [header.map(csvCell), ...rows].map((r) => r.join(";")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="merkprofiel.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
