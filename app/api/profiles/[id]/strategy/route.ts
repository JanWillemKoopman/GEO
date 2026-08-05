import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import {
  isContextFactorKind,
  extraAliasesFrom,
  extraRegionsFrom,
  parseContextFactors,
} from "@/lib/pipeline/context-factors";
import type { ContextFactor } from "@/lib/types/database";

/**
 * De uitkomst van het gesprek vastleggen (docs/tasks/onboarding-2.0.md, blok C).
 *
 * ── WAAROM DEZE ROUTE MEER DOET DAN OPSLAAN ─────────────────────────────────
 *
 * Een contextfactor is geen notitie maar een instructie. Twee ervan werken
 * meteen door in gegevens die de meting gebruikt, en dat gebeurt hier, niet
 * later, want "later" is de plek waar dit soort dingen blijven liggen:
 *
 *   • `naamswijziging` / `rebranding` → de andere naam gaat in `aliases`. Zonder
 *     dat telt de meting de helft van de vermeldingen niet mee, en dat is geen
 *     theoretisch verlies: de mention-classificatie eist de letterlijke naam in
 *     de tekst (migratie na de swapfiets-ronde).
 *   • `nieuwe_regio` → gaat in `service_regions`, want daar leest de
 *     promptgeneratie de plaatsnamen voor lokale zoekvragen uit.
 *
 * Beide zijn een UNIE, geen vervanging. De consultant vult aan wat de klant
 * vertelde; hij gooit niet weg wat het onderzoek vond.
 */
export async function PUT(
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

  let body: { strategyNotes?: string | null; contextFactors?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  // Valideren vóór opslaan, niet erna: `context_factors` is een jsonb-kolom en
  // die accepteert alles. Een onbekende soort zou stil opgeslagen worden en
  // daarna nergens een gevolg hebben, een instructie die niemand uitvoert.
  const factors: ContextFactor[] = [];
  if (Array.isArray(body.contextFactors)) {
    for (const raw of body.contextFactors) {
      if (!raw || typeof raw !== "object") continue;
      const o = raw as Record<string, unknown>;
      if (!isContextFactorKind(o.kind)) {
        return NextResponse.json(
          { error: `Onbekende soort: ${String(o.kind)}` },
          { status: 400 },
        );
      }
      const description =
        typeof o.description === "string" ? o.description.trim() : "";
      if (!description) {
        return NextResponse.json(
          { error: "Elke contextfactor heeft een korte omschrijving nodig." },
          { status: 400 },
        );
      }
      const from =
        typeof o.effective_from === "string" && o.effective_from.trim()
          ? o.effective_from.trim()
          : null;
      factors.push({ kind: o.kind, description, effective_from: from });
    }
  }

  const { error } = await admin.from("profile_strategy").upsert(
    {
      profile_id: id,
      strategy_notes: body.strategyNotes?.trim() || null,
      context_factors: factors as never,
      recorded_by: user.id,
      recorded_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  );
  if (error)
    return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });

  // ── Doorwerken in wat de meting gebruikt ─────────────────────────────────
  const nieuweAliassen = extraAliasesFrom(factors).filter(
    (naam) =>
      !profile.aliases.some((a) => a.toLowerCase() === naam.toLowerCase()),
  );
  const nieuweRegios = extraRegionsFrom(factors).filter(
    (r) =>
      !profile.service_regions.some((x) => x.toLowerCase() === r.toLowerCase()),
  );

  if (nieuweAliassen.length > 0 || nieuweRegios.length > 0) {
    await admin
      .from("profiles")
      .update({
        aliases: [...profile.aliases, ...nieuweAliassen],
        service_regions: [...profile.service_regions, ...nieuweRegios],
        // Wat een mens in het gesprek zette, mag een volgende onderzoeksronde
        // niet overschrijven (blok C, `profile_field_sources`).
        edited_by_user: true,
      })
      .eq("id", id);

    for (const field of [
      ...(nieuweAliassen.length > 0 ? ["aliases"] : []),
      ...(nieuweRegios.length > 0 ? ["service_regions"] : []),
    ]) {
      await admin.from("profile_field_sources").upsert(
        {
          profile_id: id,
          field,
          source: "gesprek",
          confidence: 1,
          set_by: user.id,
          set_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,field" },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    factors: parseContextFactors(factors),
    addedAliases: nieuweAliassen,
    addedRegions: nieuweRegios,
  });
}
