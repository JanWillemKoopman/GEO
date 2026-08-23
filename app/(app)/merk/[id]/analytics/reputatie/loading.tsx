import { Skeleton } from "@/components/skeleton";

/**
 * De laadstaat, verplicht per scherm (`docs/ux-design.md`).
 *
 * De vorm volgt het echte scherm: een brede kaart voor blok 1, dan een reeks
 * smallere regels voor de ingeklapte blokken eronder. Een spinner zou hier
 * misleiden, want deze pagina haalt vijf tabellen op en dat duurt merkbaar
 * langer dan een gemiddeld scherm.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 w-full max-w-md" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
