import { PageSkeleton } from "@/components/skeleton";

/** Het entiteitenbeheer: kop en één blok met de lijst. */
export default function Loading() {
  return <PageSkeleton blocks={1} hoogte="h-96" />;
}
