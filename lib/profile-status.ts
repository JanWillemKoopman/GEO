import type { ProfileStatus } from "@/lib/types/database";
import type { StatusTone, WhoseTurn } from "@/lib/analysis-status";

/** Zie WhoseTurn in analysis-status.ts: dezelfde tweelaags-statustaal (A.1), nu voor het profiel. */
export const PROFILE_STATUS_META: Record<
  ProfileStatus,
  { label: string; tone: StatusTone; whoseTurn: WhoseTurn }
> = {
  bezig: { label: "Onderzoek loopt…", tone: "progress", whoseTurn: "orbit_engine" },
  klaar: { label: "Gereed", tone: "success", whoseTurn: null },
  mislukt: { label: "Niet gelukt", tone: "error", whoseTurn: "jij" },
};

/**
 * Welke merken staan op 'klaar' terwijl de site niet gelezen kon worden
 * (herstelplan na audit T8.7).
 *
 * Op productie kreeg zo'n merk `status = 'klaar'` met nul gecrawlde pagina's,
 * nul aanbodregels en nul onderwerpen, terwijl het profiel zelf gevuld leek
 * (branche, werkgebied en concurrenten kwamen uit algemene web-zoekacties, niet
 * van de site). Voor een consultant die dit vóór een demogesprek klaarzet is
 * dat de gevaarlijkste vorm: hij ziet "klaar" en heeft geen reden om verder te
 * kijken.
 */
export function identifyEmptyProfiles(
  profiles: { id: string; status: ProfileStatus }[],
  pageCountByProfileId: Map<string, number>,
): Set<string> {
  return new Set(
    profiles
      .filter((p) => p.status === "klaar" && (pageCountByProfileId.get(p.id) ?? 0) === 0)
      .map((p) => p.id),
  );
}
