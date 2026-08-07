import { ChapterSkeleton } from "@/components/skeleton";

/** B: ontbrak nog. De briefing doet drie queries voordat de eerste vraag toont. */
export default function Loading() {
  return <ChapterSkeleton blocks={2} />;
}
