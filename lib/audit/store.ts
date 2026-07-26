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
import type { TechnicalAudit as AuditRow } from "@/lib/types/database";

type Admin = SupabaseClient;

export async function runAuditForProfile(admin: Admin, profileId: string): Promise<AuditResult> {
  const { data: profile } = await admin.from("profiles").select("url").eq("id", profileId).maybeSingle();
  if (!profile?.url) throw new Error(`Profiel ${profileId} heeft geen URL.`);

  const audit = await runTechnicalAudit(profile.url as string);

  await admin.from("technical_audits").insert({
    profile_id: profileId,
    checked_at: audit.checkedAt,
    site_url: audit.siteUrl,
    blockers: audit.blockers,
    warnings: audit.warnings,
    checks_json: audit.checks as never,
  });

  return audit;
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
    // reeks op — verder terugkijken zegt niets meer over de huidige blokkade.
    if (!hit || hit.severity !== "blocker") break;
    since = row.checked_at;
  }
  return since;
}
