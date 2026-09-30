import { PageSkeleton } from "@/components/skeleton";

/** Feiten en kennis: kop, tabbladen en blokken per onderwerp. */
export default function Loading() {
  return <PageSkeleton blocks={3} hoogte="h-16" />;
}
