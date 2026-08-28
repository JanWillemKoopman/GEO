import { PageSkeleton } from "@/components/skeleton";

/** Het diagnosescherm van de beheerder: kop en een reeks blokken. */
export default function Loading() {
  return <PageSkeleton blocks={3} hoogte="h-40" />;
}
