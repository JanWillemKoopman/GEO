import { PageSkeleton } from "@/components/skeleton";

/** De bedrijvenlijst: kop en de regels eronder. */
export default function Loading() {
  return <PageSkeleton blocks={4} hoogte="h-24" />;
}
