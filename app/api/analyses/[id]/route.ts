import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { checkMix, type FunnelStage } from "@/lib/prompt-mix";

/**
 * PATCH /api/analyses/[id], analyse-instellingen bewerken. Twee dingen: de
 * content-brief (§6/§7/§8, de gewenste hoek en doelgroep) en de verdeling van de
 * vragen over de funnelfasen (migratie 0054). `url` en `topic` blijven bewust
 * gelockt (die maken bij wijziging het onderzoek en de prompts met terugwerkende
 * kracht ongeldig, zie §3.3). Geen AI-call.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { content_brief?: unknown; mix?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if ("content_brief" in body) {
    const raw = typeof body.content_brief === "string" ? body.content_brief.trim() : "";
    update.content_brief = raw || null;
  }

  // ── De verdeling over de funnelfasen (migratie 0054) ────────────────────
  //
  // ⚠️ Alleen zolang de vragen nog niet zijn opgesteld. Daarna zou de instelling
  // een belofte zijn die niemand waarmaakt: de vragen staan er al, en ze
  // opnieuw laten genereren kost geld en gooit de bewerkingen van de klant weg.
  // Een veld dat je kunt invullen zonder gevolg is erger dan een veld dat er
  // niet is.
  if ("mix" in body && body.mix) {
    if (analysis.status !== "bezig" && analysis.status !== "mislukt") {
      return NextResponse.json(
        {
          error:
            "De vragen van deze analyse zijn al opgesteld, dus de verdeling ligt vast. " +
            "Wil je een andere verdeling, start dan een nieuwe analyse op dit onderwerp.",
        },
        { status: 409 },
      );
    }

    const check = checkMix(body.mix as Partial<Record<FunnelStage, unknown>>);
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

    update.prompts_orientatie = check.mix["Oriëntatie"];
    update.prompts_overweging = check.mix["Overweging"];
    update.prompts_beslissing = check.mix["Beslissing"];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Niets om bij te werken." }, { status: 400 });
  }

  const { error } = await admin.from("analyses").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
