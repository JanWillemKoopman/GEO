import { PageSkeleton } from "@/components/skeleton";

/** De onboardingsessie: kop, voortgang, en de stappen eronder. */
export default function Loading() {
  return <PageSkeleton blocks={4} hoogte="h-32" />;
}
