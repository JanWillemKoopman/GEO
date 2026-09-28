import { PageSkeleton } from "@/components/skeleton";

/** De conflictlijst: kop en één blok met de lijst. */
export default function Loading() {
  return <PageSkeleton blocks={1} hoogte="h-96" />;
}
