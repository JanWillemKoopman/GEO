import { Skeleton } from "@/components/skeleton";

/**
 * Het merkprofiel opent niet met een `PageHeader` maar met `ProfileHero`: een
 * brede kaart met de merknaam, het adres en de kopregel uit de nulmeting.
 * Vandaar een eigen vorm en niet `PageSkeleton`.
 *
 * ⚠️ Dit is het scherm dat de eigenaar deelt in een demogesprek
 * (`docs/logbook.md` §15). Een scherm dat daar seconden blanco blijft is niet
 * alleen traag, het is het eerste wat een mogelijke klant van het product ziet.
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
