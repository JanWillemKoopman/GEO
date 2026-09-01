import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { MAX_PAGES_BACKGROUND } from "@/lib/crawler";
import { isCrawlSpeed, type CrawlSpeed } from "@/lib/crawl-speed";

/**
 * POST /api/profiles/[id]/refresh-inventory, crawlt de content-inventaris
 * opnieuw of vult haar aan (onboarding Ronde D, §17.7/§17.8).
 *
 * ⚠️ Sinds deze ronde plant dit alleen de achtergrondtaak in en geeft meteen
 * antwoord; het crawlt niet meer zelf. Op "langzaam" duurt 150 pagina's ruim
 * tien minuten, en deze route mag hooguit 60 seconden. De bestaande
 * statusroute (`/api/profiles/[id]/status`) toont de voortgang.
 */
export const maxDuration = 30;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const mode = body.mode === "meer" ? "meer" : "opnieuw";

  let maxPages: number | undefined;
  if (body.maxPages !== undefined) {
    const n = Math.round(Number(body.maxPages));
    if (!Number.isFinite(n)) {
      return NextResponse.json({ error: "Ongeldig aantal pagina's." }, { status: 400 });
    }
    maxPages = Math.min(Math.max(n, 5), MAX_PAGES_BACKGROUND);
  }

  let speed: CrawlSpeed | undefined;
  if (body.speed !== undefined) {
    if (!isCrawlSpeed(body.speed)) {
      return NextResponse.json({ error: "Ongeldig tempo." }, { status: 400 });
    }
    speed = body.speed;
  }

  const { created } = await enqueue(admin, {
    type: "crawl_inventory",
    payload: { mode, maxPages, speed },
    profileId: id,
    dedupeKey: dedupe.crawlInventory(id),
  });

  return NextResponse.json({
    queued: true,
    // Stond er al een ronde te wachten of te draaien? Dan is dit verzoek
    // genegeerd in plaats van een tweede crawl van dezelfde site te starten
    // (conventie 9). Het scherm kan dit tonen als "er loopt al een ronde".
    already: !created,
  });
}
