import "server-only";

/**
 * De blokkade-poort ophalen voor een analyse (optimalisatie.md 3.7).
 *
 * Eén plek, omdat het rapport, de contentknop en straks de bibliotheek allemaal
 * hetzelfde moeten weten: staat de deur open? Als die vraag op drie plekken los
 * beantwoord wordt, gaan die antwoorden uit elkaar lopen, en dan blokkeert het
 * ene scherm wel en het andere niet.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditCheck } from "@/lib/audit/technical";
import type { TechnicalAudit as AuditRow } from "@/lib/types/database";

export interface AuditGateState {
  /** Alleen de controles met ernst 'blocker'. Leeg = de deur staat open. */
  blockers: AuditCheck[];
  /** Wanneer de audit draaide, null als hij nog nooit gedraaid heeft. */
  checkedAt: string | null;
  /** Sinds wanneer de blokkade er onafgebroken is. */
  since: string | null;
}

/**
 * Leest de laatste audit én zoekt uit sinds wanneer de blokkade er staat.
 *
 * Dat laatste is geen luxe: "dit is nieuw sinds vorige maand" wijst naar een
 * recente aanpassing en is een concreet gesprek met de webbouwer, terwijl "dit
 * staat er al een jaar" betekent dat de klant al een jaar onzichtbaar is zonder
 * het te weten. Dezelfde balk, een heel ander gesprek.
 */
export async function loadAuditGate(
  supabase: SupabaseClient,
  profileId: string,
): Promise<AuditGateState> {
  const { data } = await supabase
    .from("technical_audits")
    .select("checked_at, checks_json")
    .eq("profile_id", profileId)
    .order("checked_at", { ascending: false })
    .limit(24); // twee jaar aan maandelijkse audits

  const rows = (data ?? []) as Pick<AuditRow, "checked_at" | "checks_json">[];
  if (rows.length === 0) return { blockers: [], checkedAt: null, since: null };

  const latest = (rows[0].checks_json ?? []) as AuditCheck[];
  const blockers = latest.filter((c) => c.severity === "blocker");
  if (blockers.length === 0) {
    return { blockers: [], checkedAt: rows[0].checked_at, since: null };
  }

  // Terug in de tijd zolang er nog een blokkade in zat; de eerste audit zónder
  // blokkade breekt de reeks, want alles daarvóór zegt niets over de huidige.
  const ids = new Set(blockers.map((b) => b.id));
  let since = rows[0].checked_at;
  for (const row of rows.slice(1)) {
    const checks = (row.checks_json ?? []) as AuditCheck[];
    const stillBlocked = checks.some((c) => ids.has(c.id) && c.severity === "blocker");
    if (!stillBlocked) break;
    since = row.checked_at;
  }

  return { blockers, checkedAt: rows[0].checked_at, since };
}
