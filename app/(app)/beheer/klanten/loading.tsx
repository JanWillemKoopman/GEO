import { PageSkeleton } from "@/components/skeleton";

/** Het klantenoverzicht: kop, schakelaar en de tabel. */
export default function Loading() {
  return <PageSkeleton blocks={4} hoogte="h-28" />;
}
