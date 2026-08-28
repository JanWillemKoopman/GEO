import { PageSkeleton } from "@/components/skeleton";

/** Kop met de knop "Nieuw cluster", daaronder de clusterkaarten. */
export default function Loading() {
  return <PageSkeleton blocks={3} hoogte="h-32" ruimte="ruim" />;
}
