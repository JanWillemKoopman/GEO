import { Skeleton } from "@/components/skeleton";

/**
 * De wachtvorm van Clusters ontdekken: kop, het raster met de vijf bronnen, en
 * een rij kandidaatkaarten. Dezelfde vorm als wat eronder komt
 * (`docs/ux-design.md` §4).
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Bezig met laden">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" style={{ borderRadius: "var(--radius-xl)" }} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40" style={{ borderRadius: "var(--radius-xl)" }} />
        ))}
      </div>
    </div>
  );
}
