import { PageSkeleton } from "@/components/skeleton";

/** Het salesoverzicht: kop en de vier werkblokken. */
export default function Loading() {
  return <PageSkeleton blocks={3} hoogte="h-32" />;
}
