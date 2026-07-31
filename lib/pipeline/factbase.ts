import "server-only";

/**
 * De feitenindex opbouwen (contentbriefing.md §3.1, implementatieplan.md R5.1).
 *
 * Verzamelt alles wat we met bron over deze klant weten. Geen AI-aanroep — dit
 * is puur ophalen en ordenen. Wat hier niet in staat, mag de schrijver straks
 * niet beweren; dat maakt de volledigheid van deze functie belangrijker dan hij
 * eruitziet.
 *
 * Volgorde = betrouwbaarheid, en die volgorde is niet cosmetisch: `numberFacts`
 * nummert in deze volgorde, dus de door de klant bevestigde feiten krijgen de
 * lage F-nummers en staan bovenaan de kaart. Wat bovenaan een prompt staat wordt
 * het best gebruikt.
 *
 *   1. klant     — expliciet beantwoorde vragen. Hoogst: dit weet niemand anders.
 *   2. site      — proof points en letterlijke sitetekst, met URL.
 *   3. onderzoek — de samenvatting uit het onderwerp-onderzoek.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  numberFacts,
  factFromAnswer,
  SOURCE_ORDER,
  type FactItem,
  type FactSourceKind,
  type RawFact,
} from "@/lib/pipeline/factcard";

type Admin = SupabaseClient;

/**
 * Hoeveel letterlijke sitetekst er als feit meegaat.
 *
 * Niet de hele inventaris: HEMA heeft 40 productpagina's, en die integraal in de
 * feitenkaart proppen maakt de prompt onleesbaar én duur zonder dat het de
 * dekking verbetert. De pagina's die er wél toe doen (de bestaande pagina bij
 * `verbeteren`) gaan apart mee in de schrijfstap.
 */
const MAX_SITE_PAGES = 8;
const PAGE_EXCERPT_CHARS = 400;

/**
 * Bouwt de feitenindex voor één analyse.
 *
 * `analysisId` bepaalt welk onderwerp-onderzoek meegaat; de klantantwoorden komen
 * uit twee lagen (contentbriefing.md §7): merkbrede feiten gelden voor álle
 * analyses van deze klant, analyse-specifieke alleen voor deze. Dat is wat de
 * kennisbank na drie analyses waardevol maakt — elke volgende pagina start met
 * meer bevestigde feiten dan de vorige.
 */
export async function buildFactBase(
  admin: Admin,
  profileId: string,
  analysisId: string,
): Promise<FactItem[]> {
  const [{ data: profile }, { data: topic }, { data: pages }, { data: answers }] = await Promise.all([
    admin.from("profiles").select("proof_points, brand_name, url").eq("id", profileId).maybeSingle(),
    admin.from("topic_research").select("content_summary").eq("analysis_id", analysisId).maybeSingle(),
    admin
      .from("profile_pages")
      .select("url, title, text_excerpt")
      .eq("profile_id", profileId)
      .limit(MAX_SITE_PAGES),
    // Merkbrede antwoorden gelden altijd; analyse-antwoorden alleen bij deze
    // analyse. Een 'pagina'-antwoord hoort bij één content_piece en gaat daar
    // apart mee — hier zou het bij de verkeerde pagina kunnen belanden.
    admin
      .from("fact_requests")
      .select("question, answer, answer_type, answered_at, scope, analysis_id")
      .eq("profile_id", profileId)
      .eq("status", "beantwoord")
      .not("answer", "is", null),
  ]);

  const rauw: RawFact[] = [];

  for (const row of answers ?? []) {
    const scope = row.scope as string;
    const hoortErbij =
      scope === "merk" || (scope === "analyse" && row.analysis_id === analysisId);
    if (!hoortErbij) continue;
    const feit = factFromAnswer(row as never);
    if (feit) rauw.push(feit);
  }

  const siteUrl = (profile?.url as string | null) ?? "de eigen site";
  for (const punt of (profile?.proof_points as string[] | null) ?? []) {
    if (!punt?.trim()) continue;
    rauw.push({ text: punt.trim(), source: `site ${siteUrl}`, allowed: true, kind: "site" });
  }

  for (const page of pages ?? []) {
    const tekst = ((page.text_excerpt as string | null) ?? "").trim();
    if (tekst.length < 40) continue;
    rauw.push({
      text: `Sitetekst "${(page.title as string | null) ?? page.url}": ${tekst.slice(0, PAGE_EXCERPT_CHARS)}`,
      source: `site ${page.url as string}`,
      allowed: true,
      kind: "site",
    });
  }

  const samenvatting = ((topic?.content_summary as string | null) ?? "").trim();
  if (samenvatting) {
    rauw.push({
      text: `Wat de site over dit onderwerp zegt: ${samenvatting}`,
      source: "onderwerp-onderzoek",
      allowed: true,
      kind: "onderzoek",
    });
  }

  // Verboden achteraan nummeren maakt niets uit voor hun werking (die staan in
  // een eigen blok op de kaart), maar de bruikbare feiten houden zo de lage
  // nummers — en dat zijn de nummers waar de content naar verwijst.
  const gesorteerd = [...rauw].sort(
    (a, b) => SOURCE_ORDER[a.kind] - SOURCE_ORDER[b.kind] || Number(a.allowed) - Number(b.allowed),
  );

  return numberFacts(
    gesorteerd.map(({ text, source, allowed }) => ({ text, source, allowed })),
  );
}
