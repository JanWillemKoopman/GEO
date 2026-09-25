import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { ochtendronde } from "@/lib/pagina/start";

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
 * ⚠️ Wat er per pagina gebeurt, staat in `lib/pagina/start.ts` (de twee
 * ingangen van de contentketen). Deze route roept alleen de ochtendronde aan.
 */

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.cronSecret}`) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  const admin = createAdminClient();
  const nu = new Date();

  // Het vangnet onder de contentketen: de voorbereiding die niet startte, en de
  // schrijfpoort opnieuw vragen nu de datum dichterbij is (§6.8).
  const paginas = await ochtendronde(admin);
  const zoekdata = await planSearchConsoleSync(admin, nu);

  return NextResponse.json({ paginas, zoekdata });
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
