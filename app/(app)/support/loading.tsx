import { PageSkeleton } from "@/components/skeleton";

/** Support is een tekstpagina zonder tabel of grafiek, dus brede, lage blokken. */
export default function Loading() {
  return <PageSkeleton blocks={4} hoogte="h-32" />;
}
