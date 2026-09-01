import { PageSkeleton } from "@/components/skeleton";

/** De aanbodboom is één blok: kop plus boom. */
export default function Loading() {
  return <PageSkeleton blocks={1} hoogte="h-96" />;
}
