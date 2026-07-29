import { ChapterSkeleton } from "@/components/skeleton";

/** De kop en de navigatie staan al in de layout; alleen de inhoud wacht nog. */
export default function Loading() {
  return <ChapterSkeleton blocks={2} />;
}
