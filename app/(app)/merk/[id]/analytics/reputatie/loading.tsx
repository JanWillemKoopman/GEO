import { Skeleton } from "@/components/skeleton";

/**
 * De laadstaat, verplicht per scherm (`docs/ux-design.md`).
 *
 * De vorm volgt het echte scherm, anders springt de pagina op het moment dat de
 * data binnenkomt: de kop, de uitspraakkaart met de meter, de twee steunkaarten
 * ernaast, en dan de productlijst. Een spinner zou hier misleiden, want deze
 * pagina haalt zes tabellen op en dat duurt merkbaar langer dan een gemiddeld
 * scherm.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-16 w-full max-w-md" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
