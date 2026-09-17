import "server-only";

/**
 * Zoekcijfers ophalen bij Google en wegschrijven.
 *
 * ── DE ROUTE PLANT, DEZE FUNCTIE HAALT OP ───────────────────────────────────
 *
 * Eén taak per merk per dag (`gsc_sync`). Geen AI-aanroep, dus licht werk in de
 * zin van `HEAVY_JOB_TYPES`: twee HTTP-verzoeken naar Google plus twee
 * bulk-upserts.
 *
 * ── SINDS 16 SEPTEMBER 2026: OOK DE ZOEKOPDRACHTEN (migratie 0103) ─────────
 *
 * Een tweede aanroep met `dimensions: ["date", "query", "page"]`, over
 * precies hetzelfde venster als de paginacijfers. Geen tweede cron en geen
 * nieuw jobtype: dezelfde dagelijkse taak doet nu twee aanroepen in plaats
 * van één (docs/tasks/zoekdata-in-de-keten.md, blok A).
 *
 * ⚠️ **De zoekopdrachten zijn bijvangst, geen kernfunctie.** Mislukt de
 * tweede aanroep, dan mislukt de synchronisatie als geheel NIET: de
 * paginacijfers die het zoekverkeerscherm en de lege staten dragen, blijven
 * gewoon staan. `gsc_last_error` gaat alleen over de eerste, kritieke
 * aanroep; een mislukte zoekopdrachtenronde wordt alleen gelogd en probeert
 * het de volgende dag opnieuw (dezelfde terugvalstrategie als de
 * paginacijfers zelf via `syncWindow()`'s nawerkvenster).
 *
 * Nog steeds niet opgehaald: apparaten, landen.
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
  /**
   * Hoeveel regels zoekopdrachten erbij kwamen. `null` als de aanroep om wat
   * voor reden dan ook niet lukte, dus GEEN 0: dat zou een echte lege ronde
   * niet meer te onderscheiden zijn van een mislukte (conventie 3).
   */
  queryRijen: number | null;
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
    return {
      ok: false,
      reason: "Dit merk is nog niet aan Search Console gekoppeld.",
      rijen: 0,
      start: null,
      eind: null,
      queryRijen: null,
    };
  }

  const token = await accessToken();
  if (!token.ok) {
    await noteer(admin, profileId, token.reason);
    return { ok: false, reason: token.reason, rijen: 0, start: null, eind: null, queryRijen: null };
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
    return { ok: true, reason: null, rijen: 0, start: venster.start, eind: venster.eind, queryRijen: null };
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
      return { ok: false, reason: reden, rijen: 0, start: venster.start, eind: venster.eind, queryRijen: null };
    }

    const j = (await res.json()) as { rows?: typeof rows };
    rows = j.rows ?? [];
  } catch {
    const reden = "Google was niet bereikbaar. De volgende ronde probeert het opnieuw.";
    await noteer(admin, profileId, reden);
    return { ok: false, reason: reden, rijen: 0, start: venster.start, eind: venster.eind, queryRijen: null };
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
      return { ok: false, reason: reden, rijen: 0, start: venster.start, eind: venster.eind, queryRijen: null };
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

  // ── De zoekopdrachten: bijvangst, mag mislukken zonder de ronde te breken ──
  const queryRijen = await syncQueries(admin, profileId, property, token.token, venster);

  return { ok: true, reason: null, rijen: rijen.length, start: venster.start, eind: venster.eind, queryRijen };
}

/**
 * Dezelfde aanroep, met `query` als extra dimensie (migratie 0103).
 *
 * Eigen functie en niet ingeweven in `syncSearchConsole()` zelf: die functie
 * is al lang genoeg, en een aparte functie maakt de "mag mislukken"-regel in
 * de aanroeper zichtbaar in plaats van verstopt in een try/catch middenin een
 * grotere functie.
 *
 * `null` bij elke mislukking. Geen `gsc_last_error`: dat veld stuurt de lege
 * staten van het zoekverkeerscherm, en die gaan over de paginacijfers, niet
 * over deze bijvangst.
 */
async function syncQueries(
  admin: Admin,
  profileId: string,
  property: string,
  accessTokenValue: string,
  venster: { start: string; eind: string },
): Promise<number | null> {
  const url =
    `https://searchconsole.googleapis.com/webmasters/v3/sites/` +
    `${encodeURIComponent(property)}/searchAnalytics/query`;

  let rows: { keys?: string[]; clicks?: number; impressions?: number; position?: number }[];
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessTokenValue}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: venster.start,
        endDate: venster.eind,
        dimensions: ["date", "query", "page"],
        dataState: "final",
        rowLimit: ROW_LIMIT,
      }),
    });
    if (!res.ok) {
      console.warn(`Zoekopdrachten ophalen mislukt voor profiel ${profileId}: HTTP ${res.status}.`);
      return null;
    }
    const j = (await res.json()) as { rows?: typeof rows };
    rows = j.rows ?? [];
  } catch (err) {
    console.warn(`Zoekopdrachten ophalen mislukt voor profiel ${profileId}: ${String(err)}.`);
    return null;
  }

  const rijen = rows
    .filter((r) => Array.isArray(r.keys) && r.keys.length === 3)
    .map((r) => ({
      profile_id: profileId,
      day: r.keys![0],
      query: r.keys![1],
      page: r.keys![2],
      clicks: Math.round(r.clicks ?? 0),
      impressions: Math.round(r.impressions ?? 0),
      position: r.position ?? null,
    }));

  if (rijen.length === 0) return 0;

  const { error } = await admin
    .from("search_console_queries")
    .upsert(rijen, { onConflict: "profile_id,day,query,page" });
  if (error) {
    console.warn(`Zoekopdrachten opslaan mislukt voor profiel ${profileId}: ${error.message}.`);
    return null;
  }

  return rijen.length;
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
