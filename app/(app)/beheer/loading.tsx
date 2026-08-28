import { PageSkeleton } from "@/components/skeleton";

/** Het CSM-paneel: kop en de klantenlijst. */
export default function Loading() {
  return <PageSkeleton blocks={4} hoogte="h-28" />;
}
