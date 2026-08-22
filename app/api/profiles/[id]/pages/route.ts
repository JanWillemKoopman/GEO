import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { addManualPages, removeManualPage } from "@/lib/pipeline/manual-pages";
import { describeError, classifyError } from "@/lib/errors";

/**
 * Pagina's met de hand aan de content-inventaris toevoegen of eruit halen.
 *
 * ── WAAROM DIT GEEN ACHTERGRONDTAAK IS ──────────────────────────────────────
 *
 * Het is een handeling die iemand doet terwijl hij naar het scherm kijkt, en
 * het gaat om hoogstens honderd pagina's in batches van acht. Dat past ruim
 * binnen de minuut hieronder, en een taak in de wachtrij zou betekenen dat de
 * consultant moet wachten op een werkerronde om te zien of zijn adressen goed
 * waren. Zelfde afweging als bij `refresh-inventory`.
 *
 * ── EN WAAROM ER GEEN KOSTENPOORT VOOR STAAT ────────────────────────────────
 *
 * Er komt geen AI aan te pas: dit is een fetch en een insert, precies zoals de
 * crawl zelf (`docs/architecture.md` §6, "Bewust géén AI"). De poort die wél
 * geldt is de eigendomscontrole hieronder: schrijven gaat nooit rechtstreeks
 * vanaf de client (conventie 6).
 */
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { urls?: unknown };
  const raw = typeof body.urls === "string" ? body.urls : "";
  if (!raw.trim()) {
    return NextResponse.json(
      { error: "Vul een of meer webadressen in, één per regel." },
      { status: 400 },
    );
  }

  try {
    const result = await addManualPages(id, raw);
    return NextResponse.json(result);
  } catch (err) {
    console.error(`addManualPages(${id}) mislukt:`, err);
    return NextResponse.json(
      {
        error: "Toevoegen is niet gelukt.",
        detail: describeError(err),
        problem: classifyError(err),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { url?: unknown };
  const url = typeof body.url === "string" ? body.url : "";
  if (!url) return NextResponse.json({ error: "Geen adres opgegeven." }, { status: 400 });

  // Alleen handmatige pagina's. Een gecrawlde pagina hier laten verwijderen zou
  // een lege plek achterlaten die de volgende crawl gewoon weer vult, dus dan
  // lijkt de knop stuk.
  const removed = await removeManualPage(id, url);
  if (!removed) {
    return NextResponse.json(
      { error: "Deze pagina is niet handmatig toegevoegd en blijft staan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
