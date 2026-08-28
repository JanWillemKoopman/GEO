import { PageSkeleton } from "@/components/skeleton";

/** Toewijzen is één blok: kies een account, bevestig. */
export default function Loading() {
  return <PageSkeleton blocks={1} hoogte="h-64" />;
}
