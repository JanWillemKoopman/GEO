import { PageSkeleton } from "@/components/skeleton";

/** De etalage: kop plus de blokken eronder. */
export default function Loading() {
  return <PageSkeleton blocks={5} hoogte="h-32" />;
}
