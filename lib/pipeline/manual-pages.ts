import "server-only";

/**
 * Pagina's die een MENS aan de inventaris toevoegt.
 *
 * ── WAAROM DIT ER MOEST KOMEN ───────────────────────────────────────────────
 *
 * De crawl kiest zo goed mogelijk welke pagina's hij leest, maar bij een site
 * van duizenden pagina's blijft dat een keuze uit een lijst waarvan de crawler
 * de betekenis niet kent. De consultant kent die wel: hij weet vóór het
 * demogesprek dat de pagina met de tarieven en de drie belangrijkste
 * dienstenpagina's erbij horen, ook als ze diep in de site hangen.
 *
 * Dat is geen noodgreep maar precies waar de sales-led opzet op rust: het
 * profiel wordt met de hand klaargezet, en dit is de plek waar die kennis het
 * systeem in gaat.
 *
 * ── WAT ZE ANDERS MAAKT DAN GECRAWLDE PAGINA'S ──────────────────────────────
 *
 * Eén ding: `source = 'handmatig'` (migratie 0061). Daardoor overleven ze de
 * volgende crawlronde. Zonder dat onderscheid gooit `discover.ts` ze weg bij de
 * eerstvolgende "Onderzoek opnieuw", en dan is toevoegen zinloos.
 *
 * Verder zijn ze gewoon pagina's: ze tellen mee in de aanbodboom, in de
 * feitenkaart en in het contentadvies, en ze kunnen net zo goed een citaat
 * dragen als een gecrawlde pagina.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlPages } from "@/lib/crawler";
import { insertPages } from "@/lib/pipeline/discover";
import { parseUrlList, type RejectedUrl } from "@/lib/crawl-urls";
import type { Profile } from "@/lib/types/database";

/** Hoeveel adressen er in één keer bij mogen. Meer is een crawl, geen aanvulling. */
export const MAX_MANUAL_PAGES = 100;

export interface AddPagesResult {
  /** Hoeveel pagina's er daadwerkelijk zijn toegevoegd. */
  added: number;
  /** Adressen die we niet konden lezen: een 404, een time-out, of een lege pagina. */
  unreadable: string[];
  /** Adressen die al in de inventaris stonden. Geen fout, wel goed om te weten. */
  duplicates: string[];
  /** Regels die geen bruikbaar adres waren, met de reden erbij. */
  rejected: RejectedUrl[];
  /** Hoeveel pagina's er nu in totaal in de inventaris staan. */
  total: number;
}

export async function addManualPages(
  profileId: string,
  raw: string,
): Promise<AddPagesResult> {
  const admin = createAdminClient();

  const { data: row } = await admin.from("profiles").select("*").eq("id", profileId).single();
  if (!row) throw new Error(`Profiel ${profileId} niet gevonden.`);
  const profile = row as Profile;

  const { urls, rejected } = parseUrlList(raw, profile.url, MAX_MANUAL_PAGES);

  const { data: bestaandeRijen } = await admin
    .from("profile_pages")
    .select("url")
    .eq("profile_id", profileId);
  const bestaand = new Set(((bestaandeRijen ?? []) as { url: string }[]).map((r) => r.url));

  const duplicates = urls.filter((u) => bestaand.has(u));
  const teHalen = urls.filter((u) => !bestaand.has(u));

  if (teHalen.length === 0) {
    return {
      added: 0,
      unreadable: [],
      duplicates,
      rejected,
      total: bestaand.size,
    };
  }

  // Zonder `harvest`: die oogst (gestructureerde data, renderbaarheid,
  // sjabloonherkenning) hoort bij het beoordelen van de HELE site in fase 0, en
  // een handjevol losse pagina's mag dat oordeel niet verschuiven.
  const gehaald = await crawlPages(teHalen);
  const bruikbaar = gehaald.filter((p) => p.text.trim().length > 0);
  const gelukt = new Set(bruikbaar.map((p) => p.url));

  const { stored } = await insertPages(
    admin,
    profileId,
    bruikbaar.map((p) => ({ url: p.url, title: p.title, text: p.text })),
    "handmatig",
  );

  return {
    added: stored,
    // Een adres dat we niet konden lezen NOEMEN we, in plaats van het stil weg
    // te laten. Anders denkt de consultant dat de pagina meetelt in het aanbod
    // terwijl er niets van binnenkwam (conventie 3).
    unreadable: teHalen.filter((u) => !gelukt.has(u)),
    duplicates,
    rejected,
    total: bestaand.size + stored,
  };
}

/** Haalt één handmatig toegevoegde pagina weer weg. Gecrawlde pagina's blijven met rust. */
export async function removeManualPage(profileId: string, url: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("profile_pages")
    .delete({ count: "exact" })
    .eq("profile_id", profileId)
    .eq("url", url)
    .eq("source", "handmatig");
  return (count ?? 0) > 0;
}
