import { PageSkeleton } from "@/components/skeleton";

/** De bibliotheek is een lijst: kop, filterregel, en de teksten eronder. */
export default function Loading() {
  return <PageSkeleton blocks={4} hoogte="h-24" />;
}
