import { PageSkeleton } from "@/components/skeleton";

/** De vergelijkingstabel is één breed blok, met de duiding erboven. */
export default function Loading() {
  return <PageSkeleton blocks={2} hoogte="h-64" />;
}
