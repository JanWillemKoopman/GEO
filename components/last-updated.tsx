import { formatRelativeTime, formatDateLong } from "@/lib/format";

/**
 * "Laatst bijgewerkt: 3 dagen geleden" (H.63).
 *
 * Eén regel die op elk paneel dezelfde vraag beantwoordt: kijk ik naar oude
 * data? Zonder dit moet een klant zelf onthouden wanneer hij voor het laatst
 * keek, en dat is precies het soort dingen dat de app voor hem hoort te doen.
 *
 * `title` draagt de volledige datum: relatieve tijd is snel te lezen, maar
 * "37 dagen geleden" is voor iemand die het exacte moment wil weten geen
 * antwoord. Hoveren (of, op mobiel, lang indrukken) geeft dat alsnog.
 */
export function LastUpdated({ at, className = "text-sm text-muted" }: { at: string; className?: string }) {
  return (
    <span className={className} title={formatDateLong(at)}>
      Laatst bijgewerkt: {formatRelativeTime(at)}
    </span>
  );
}
