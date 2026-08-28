import { PageSkeleton } from "@/components/skeleton";

/**
 * Koppelingen praat met Google Search Console om te zien of de verbinding nog
 * staat. Dat is een externe dienst, dus de wachttijd hangt niet aan ons.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <PageSkeleton blocks={2} hoogte="h-40" />
    </div>
  );
}
