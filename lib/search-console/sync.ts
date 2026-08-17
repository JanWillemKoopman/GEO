import "server-only";

/**
 * Zoekcijfers ophalen bij Google en wegschrijven.
 *
 * ── DE ROUTE PLANT, DEZE FUNCTIE HAALT OP ───────────────────────────────────
 *
 * Eén taak per merk per dag (`gsc_sync`). Geen AI-aanroep, dus licht werk in de
 * zin van `HEAVY_JOB_TYPES`: het is één HTTP-verzoek naar Google plus een
 * bulk-upsert.
 *
 * ── WAT ER NIET WORDT OPGEHAALD ─────────────────────────────────────────────
 *
 * Geen zoekopdrachten (nog niet: fase 2 van `docs/tasks/zoekdata-koppeling.md`),
 * geen apparaten, geen landen. Alleen pagina's per dag, want de vraag die dit
 * product stelt is "doet de pagina die ORBIT ENGINE schreef iets".
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { accessToken } from "@/lib/search-console/auth";
import { syncWindow, heeftWerk } from "@/lib/search-console/window";

type Admin = ReturnType<typeof createAdminClient>;

/** Google geeft maximaal 25.000 rijen per aanroep. */
const ROW_LIMIT = 25000;

export interface SyncResult {
  ok: boolean;
  /** In gewone taal, klaar om in het scherm te zetten. */
  reason: string | null;
  rijen: number;
  start: string | null;
  eind: string | null;
}

/**
 * Haalt de cijfers van één merk op.
 *
 * ⚠️ Elke afloop, ook een mislukking, wordt op het profiel vastgelegd
 * (`gsc_last_error`). Zonder dat is "er komen geen cijfers binnen" een vraag die
 * alleen met een logboek te beantwoorden is, en een klant die vraagt waarom zijn
 * grafiek leeg blijft, verdient een antwoord op het scherm.
 */
export async function syncSearchConsole(
  admin: Admin,
  profileId: string,
  now: Date = new Date(),
): Promise<SyncResult> {
  const { data: profileRow } = await admin
    .from("profiles")
    .select("id, gsc_property, gsc_first_day")
    .eq("id", profileId)
    .maybeSingle();

  const property = (profileRow?.gsc_property as string | null) ?? null;
  if (!property) {
    return { ok: false, reason: "Dit merk is nog niet aan Search Console gekoppeld.", rijen: 0, start: null, eind: null };
  }

  const token = await accessToken();
  if (!token.ok) {
    await noteer(admin, profileId, token.reason);
    return { ok: false, reason: token.reason, rijen: 0, start: null, eind: null };
  }

  // De laatste dag die we al hebben bepaalt hoe ver we terug moeten.
  const { data: laatsteRij } = await admin
    .from("search_console_days")
    .select("day")
    .eq("profile_id", profileId)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  const venster = syncWindow((laatsteRij?.day as string | null) ?? null, now);
  if (!heeftWerk(venster)) {
    return { ok: true, reason: null, rijen: 0, start: venster.start, eind: venster.eind };
  }

  const url =
    `https://searchconsole.googleapis.com/webmasters/v3/sites/` +
    `${encodeURIComponent(property)}/searchAnalytics/query`;

  let rows: { keys?: string[]; clicks?: number; impressions?: number; position?: number }[];
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: venster.start,
        endDate: venster.eind,
        dimensions: ["date", "page"],
        // ⚠️ `final` en niet `all`: Google's verse cijfers worden nog herzien, en
        // wie de dag van gisteren als bewijs gebruikt, meet ruis.
        dataState: "final",
        rowLimit: ROW_LIMIT,
      }),
    });

    if (!res.ok) {
      const reden = await uitleg(res);
      await noteer(admin, profileId, reden);
      return { ok: false, reason: reden, rijen: 0, start: venster.start, eind: venster.eind };
    }

    const j = (await res.json()) as { rows?: typeof rows };
    rows = j.rows ?? [];
  } catch {
    const reden = "Google was niet bereikbaar. De volgende ronde probeert het opnieuw.";
    await noteer(admin, profileId, reden);
    return { ok: false, reason: reden, rijen: 0, start: venster.start, eind: venster.eind };
  }

  const rijen = rows
    .filter((r) => Array.isArray(r.keys) && r.keys.length === 2)
    .map((r) => ({
      profile_id: profileId,
      day: r.keys![0],
      page: r.keys![1],
      clicks: Math.round(r.clicks ?? 0),
      impressions: Math.round(r.impressions ?? 0),
      position: r.position ?? null,
    }));

  if (rijen.length > 0) {
    // Upsert op de unieke sleutel uit migratie 0052: Google herziet dagen na, en
    // dat moet een correctie worden en geen tweede rij.
    const { error } = await admin
      .from("search_console_days")
      .upsert(rijen, { onConflict: "profile_id,day,page" });
    if (error) {
      const reden = "De cijfers konden niet worden opgeslagen.";
      await noteer(admin, profileId, reden);
      return { ok: false, reason: reden, rijen: 0, start: venster.start, eind: venster.eind };
    }
  }

  await admin
    .from("profiles")
    .update({
      gsc_verified_at: new Date().toISOString(),
      gsc_last_sync_at: new Date().toISOString(),
      gsc_last_error: null,
      // Het nulpunt van "sinds de start" wordt één keer gezet en verandert daarna
      // niet: zou hij meebewegen, dan verschuift de grafiek onder de klant.
      gsc_first_day: (profileRow?.gsc_first_day as string | null) ?? venster.start,
    })
    .eq("id", profileId);

  return { ok: true, reason: null, rijen: rijen.length, start: venster.start, eind: venster.eind };
}

/**
 * De fout van Google in gewone taal.
 *
 * De twee die in de praktijk voorkomen krijgen een eigen zin, want ze vragen
 * allebei een andere handeling van een andere persoon.
 */
async function uitleg(res: Response): Promise<string> {
  if (res.status === 403) {
    return "ORBIT ENGINE mag deze property nog niet lezen. Voeg het adres hieronder toe als gebruiker in Search Console, met het recht Beperkt.";
  }
  if (res.status === 404) {
    return "Deze property bestaat niet in Search Console. Controleer of hij precies zo geschreven is als daar, inclusief sc-domain: of https://.";
  }
  const tekst = await res.text().catch(() => "");
  return `Google gaf een fout (${res.status}). ${tekst.replace(/\s+/g, " ").slice(0, 200)}`;
}

async function noteer(admin: Admin, profileId: string, reden: string): Promise<void> {
  await admin
    .from("profiles")
    .update({ gsc_last_error: reden, gsc_last_sync_at: new Date().toISOString() })
    .eq("id", profileId);
}
