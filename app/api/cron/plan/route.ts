import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import {
  startVoorbereiding,
  probeerTeSchrijven,
  SCHRIJFPAGINA_KOLOMMEN,
  type TeSchrijvenPagina,
} from "@/lib/plan-write-start";

/**
 * GET /api/cron/plan, de motor onder het contentplan (fase 4, zie `docs/logbook.md`).
 *
 * ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
 *
 * Zonder deze cron is een goedgekeurde maand een lijst die niets doet. Nova
 * schrijft "about 10 days before its scheduled post date"; dit is die tien
 * dagen. De pagina's van een goedgekeurde maand die binnen dat venster vallen
 * krijgen een schrijftaak, en gaan op `schrijven` tot de tekst er is.
 *
 * DAGELIJKS, niet vaker. Een plan denkt in dagen: twee keer per dag kijken kan
 * hooguit een pagina een halve dag eerder starten, en die halve dag is
 * betekenisloos bij een voorsprong van tien dagen.
 *
 * ── DE ROUTE PLANT, HIJ SCHRIJFT NIET ───────────────────────────────────────
 *
 * Net als `/api/cron/tracking`: hier worden alleen taken klaargezet, het echte
 * werk doet de werker. Deze route is in milliseconden klaar, hoeveel merken er
 * ook zijn.
 *
 * ⚠️ Wat niet geschreven kan worden, wordt geteld en niet weggemoffeld. Bij Van
 * den Udenhout hebben zes van de acht onderwerpen nog geen analyse, en dus geen
 * meting om op te schrijven. Die zes staan in het antwoord onder `geblokkeerd`,
 * en op het scherm staat per pagina waarom. Een cron die stil overslaat, laat
 * pagina's een jaar lang op "Gepland" staan zonder dat iemand weet waarom.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * ⚠️ De rijvorm en de vijf stappen die erop volgen staan sinds 22 september
 * 2026 in `lib/plan-write-start.ts`, want de beheerder kan dezelfde pagina nu
 * ook met de hand laten schrijven vanuit het contentplan. Twee kopieën van die
 * stappen zouden gegarandeerd uit elkaar lopen.
 */

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.cronSecret}`) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  const admin = createAdminClient();
  const nu = new Date();

  // ── Sinds 23 september 2026: voorbereiden en de schrijfpoort, nooit direct schrijven ──
  //
  // Deze cron schreef tot die dag elke pagina van een vrijgegeven maand zodra
  // hij binnen tien dagen viel, zonder één vraag te stellen. Dat botst met het
  // besluit dat er pas geschreven wordt als elke vraag van de pagina beantwoord
  // of overgeslagen is (`docs/tasks/contentflow-een-lijn.md` §1).
  //
  // Nu is hij het VANGNET onder twee dingen die elders gebeuren: het vrijgeven
  // van een maand start de voorbereiding, en het laatste antwoord start het
  // schrijven. Hier worden pagina's opgepakt die daar doorheen glipten:
  //
  //   1. pagina's van vrijgegeven maanden zonder rij in `content_pieces`:
  //      voorbereiding starten;
  //   2. pagina's met een rij die nog op `briefing` staat: de schrijfpoort
  //      opnieuw vragen. Dat is ook hoe de tiendaagse schrijfdatum bereikt
  //      wordt: de poort zegt "nog niet" tot die dag, en daarna "ja".
  const { data, error } = await admin
    .from("planned_pages")
    .select(`${SCHRIJFPAGINA_KOLOMMEN}, content_piece_id`)
    .eq("status", "gepland")
    .eq("is_buffer", false)
    .not("scheduled_for", "is", null)
    .eq("plan_months.status", "goedgekeurd")
    .order("scheduled_for");

  if (error) {
    console.error("Plan-cron: pagina's ophalen mislukt:", error.message);
    return NextResponse.json({ error: "Ophalen mislukt.", detail: error.message }, { status: 500 });
  }

  const pages = (data ?? []) as unknown as (TeSchrijvenPagina & { content_piece_id: string | null })[];
  const geblokkeerd: Record<string, number> = {};
  const wacht: Record<string, number> = {};
  let voorbereiding = 0;
  let ingepland = 0;

  const zonderRij = pages.filter((p) => !p.content_piece_id);
  const uitkomsten = await startVoorbereiding(admin, zonderRij, nu);
  for (const u of uitkomsten.values()) {
    if (u.uitkomst === "gestart") voorbereiding++;
    else if (u.uitkomst === "geblokkeerd") tel(geblokkeerd, u.reden);
  }

  for (const page of pages.filter((p) => p.content_piece_id)) {
    const uitkomst = await probeerTeSchrijven(admin, page.content_piece_id!, nu);
    if (uitkomst.uitkomst === "geschreven_ingepland") ingepland++;
    else if (uitkomst.uitkomst === "wacht") tel(wacht, uitkomst.reden);
    else if (uitkomst.uitkomst === "geblokkeerd") tel(geblokkeerd, uitkomst.reden);
    else tel(geblokkeerd, "inplannen_mislukt");
  }

  const zoekdata = await planSearchConsoleSync(admin, nu);

  return NextResponse.json({
    bekeken: pages.length,
    voorbereiding,
    ingepland,
    wacht,
    geblokkeerd,
    zoekdata,
  });
}

/**
 * Zet voor elk gekoppeld merk een ophaaltaak klaar (fase 5, migratie 0052).
 *
 * Eén per merk per dag; de dedupe-sleutel draagt de datum, want twee rondes op
 * dezelfde dag halen exact dezelfde cijfers op (Google levert pas definitieve
 * data met twee dagen vertraging).
 */
async function planSearchConsoleSync(
  admin: ReturnType<typeof createAdminClient>,
  nu: Date,
): Promise<{ merken: number; ingepland: number }> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .not("gsc_property", "is", null)
    .is("archived_at", null);

  const merken = (data ?? []) as { id: string }[];
  const dag = nu.toISOString().slice(0, 10);
  let ingepland = 0;

  for (const m of merken) {
    const { created } = await enqueue(admin, {
      type: "gsc_sync",
      payload: {},
      profileId: m.id,
      dedupeKey: dedupe.gscSync(m.id, dag),
    });
    if (created) ingepland++;
  }

  return { merken: merken.length, ingepland };
}

function tel(teller: Record<string, number>, sleutel: string): void {
  teller[sleutel] = (teller[sleutel] ?? 0) + 1;
}
