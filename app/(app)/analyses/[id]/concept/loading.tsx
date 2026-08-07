import { ChapterSkeleton } from "@/components/skeleton";

/** B: ontbrak nog. Drie queries (profiel, onderzoek, vragen) vóór de eerste byte. */
export default function Loading() {
  return <ChapterSkeleton blocks={3} />;
}
