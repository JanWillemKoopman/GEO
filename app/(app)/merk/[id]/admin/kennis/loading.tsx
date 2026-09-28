import { PageSkeleton } from "@/components/skeleton";

/** Het kennisoverzicht: kop en blokken per onderwerp. */
export default function Loading() {
  return <PageSkeleton blocks={3} hoogte="h-48" />;
}
