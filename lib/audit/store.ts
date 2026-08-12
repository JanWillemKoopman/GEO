import "server-only";

/**
 * De audit draaien en bewaren (optimalisatie.md 3B).
 *
 * Apart van `technical.ts` gehouden: dáár staat wat er gecontroleerd wordt en
 * hoe, hier alleen waar de uitslag heen gaat. Zo blijft de audit zelf een pure
 * functie van een URL naar een uitslag, en is hij te draaien zonder database.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { runTechnicalAudit, type TechnicalAudit as AuditResult } from "@/lib/audit/technical";
import { entityConsistencyChecks } from "@/lib/audit/entity-consistency";
import type { Profile, TechnicalAudit as AuditRow } from "@/lib/types/database";
import { requireCount } from "@/lib/require-count";

type Admin = SupabaseClient;

export async function runAuditForProfile(admin: Admin, profileId: string): Promise<AuditResult> {
  const { data: row } = await admin.from("profiles").select("*").eq("id", profileId).maybeSingle();
  if (!row?.url) throw new Error(`Profiel ${profileId} heeft geen URL.`);
  const profile = row as Profile;

  const audit = await runTechnicalAudit(profile.url);

  // ── Entiteitsconsistentie erbovenop (blok B fase 4) ──────────────────────
  //
  // Nul extra kosten: alle invoer komt uit fase 0, die de site toch al uitkamde.
  // Heeft die nog niet gedraaid, bijvoorbeeld bij een profiel van vóór deze
  // ronde. Dan slaan we dit deel over in plaats van bevindingen te doen op
  // lege invoer. Een waarschuwing "geen schema.org gevonden" die alleen zegt
  // dat wíj niet gekeken hebben, is erger dan geen waarschuwing.
  const { data: facet } = await admin
    .from("profile_facets")
    .select("raw_json")
    .eq("profile_id", profileId)
    .eq("facet", "techniek")
    .maybeSingle();

  const discovery = facet?.raw_json as
    | {
        names?: string[];
        sameAs?: string[];
        schemaTypes?: string[];
        pagesWithSchema?: number;
        clientRenderedPages?: number;
      }
    | null
    | undefined;

  let checks = audit.checks;
  if (discovery) {
    // Niet `?? 0`: nul gecrawlde pagina's is een oordeel over de site van de
    // klant, en dat mag geen gevolg zijn van een haperende telling.
    const pagesCrawled = requireCount(
      await admin
        .from("profile_pages")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profileId),
      "de gecrawlde pagina's van dit merk",
    );

    checks = [
      ...checks,
      ...entityConsistencyChecks({
        brandName: profile.brand_name ?? profile.name,
        foundNames: discovery.names ?? [],
        aliases: profile.aliases ?? [],
        sameAs: discovery.sameAs ?? [],
        schemaTypes: discovery.schemaTypes ?? [],
        pagesWithSchema: discovery.pagesWithSchema ?? 0,
        pagesCrawled,
        clientRenderedPages: discovery.clientRenderedPages ?? 0,
        wikidataId: profile.wikidata_id,
        wikipediaUrl: profile.wikipedia_url,
      }),
    ];
  }

  // Opnieuw tellen: de tellers in `audit` gaan alleen over de robots-controles,
  // en de UI leest ze om te bepalen of er iets urgents is. Zonder dit zou een
  // JavaScript-blokkade wél in de lijst staan maar niet meetellen, en dat is
  // precies de bevinding die niet gemist mag worden.
  const result: AuditResult = {
    ...audit,
    checks,
    blockers: checks.filter((c) => c.severity === "blocker").length,
    warnings: checks.filter((c) => c.severity === "warning").length,
  };

  await admin.from("technical_audits").insert({
    profile_id: profileId,
    checked_at: result.checkedAt,
    site_url: result.siteUrl,
    blockers: result.blockers,
    warnings: result.warnings,
    checks_json: result.checks as never,
  });

  return result;
}

/** De meest recente uitslag, of null als er nog nooit een audit gedraaid is. */
export async function latestAudit(admin: Admin, profileId: string): Promise<AuditRow | null> {
  const { data } = await admin
    .from("technical_audits")
    .select("*")
    .eq("profile_id", profileId)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AuditRow | null) ?? null;
}

/**
 * Sinds wanneer staat deze blokkade er?
 *
 * Loopt terug door de geschiedenis tot de eerste audit waarin de blokkade ook al
 * zat, en geeft dát moment terug. "Dit is nieuw sinds vorige maand" is een heel
 * ander gesprek met de webbouwer dan "dit staat er al een jaar", en dat verschil
 * is precies waarom de audits als rijen bewaard worden en niet als kolommen op
 * het profiel.
 */
export async function blockerSince(
  admin: Admin,
  profileId: string,
  checkId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("technical_audits")
    .select("checked_at, checks_json")
    .eq("profile_id", profileId)
    .order("checked_at", { ascending: false })
    .limit(24); // twee jaar aan maandelijkse audits is ruim genoeg

  let since: string | null = null;
  for (const row of (data ?? []) as { checked_at: string; checks_json: unknown }[]) {
    const checks = (row.checks_json ?? []) as { id: string; severity: string }[];
    const hit = checks.find((c) => c.id === checkId);
    // Zodra we een audit tegenkomen waarin het gewoon in orde was, houdt de
    // reeks op, verder terugkijken zegt niets meer over de huidige blokkade.
    if (!hit || hit.severity !== "blocker") break;
    since = row.checked_at;
  }
  return since;
}
