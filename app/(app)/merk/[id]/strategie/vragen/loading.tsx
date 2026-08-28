import { Skeleton } from "@/components/skeleton";

/**
 * De wachtvorm van dit scherm: terug-link, kop, en één blok met vraagregels.
 *
 * Zonder deze route erfde "Openstaande vragen" de wachtvorm van het overzicht
 * (`ChapterSkeleton`, drie brede blokken), en dat is de vorm van een ander
 * scherm. De vorm van de skeleton is de vorm van wat eronder komt, anders
 * herkent de gebruiker het scherm niet zodra het vult (`docs/ux-design.md` §4).
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Bezig met laden">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      {/* ⚠️ 32 in plaats van 14: sinds 28 augustus 2026 staat het invoerveld
          onder de vraag en is het drie regels hoog. Een skeleton die de oude
          hoogte houdt laat het scherm bij het vullen zichtbaar springen. */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" style={{ borderRadius: "var(--radius-md)" }} />
        ))}
      </div>
    </div>
  );
}
