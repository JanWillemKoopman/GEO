import { PageSkeleton } from "@/components/skeleton";

/** Eén lijst met eerdere planvoorstellen (blok A punt 7). */
export default function Loading() {
  return <PageSkeleton blocks={2} hoogte="h-24" />;
}
