import { Skeleton } from "@/components/skeleton";

/**
 * De 0-meting opent niet met een `PageHeader` maar met `ProfileHero`: een
 * brede kaart met de merknaam, het adres en de kopregel uit de nulmeting.
 * Vandaar een eigen vorm en niet `PageSkeleton`, zelfde reden als bij het oude
 * merkdossier waar dit scherm van afstamt.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Bezig met laden">
      <Skeleton className="h-32" style={{ borderRadius: "var(--radius-lg)" }} />
      <Skeleton className="h-48" style={{ borderRadius: "var(--radius-lg)" }} />
      <Skeleton className="h-56" style={{ borderRadius: "var(--radius-lg)" }} />
    </div>
  );
}
