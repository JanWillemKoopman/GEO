import { PageSkeleton } from "@/components/skeleton";

/** Het prospectdossier: kop, de reden, de score-opbouw en het bewijs. */
export default function Loading() {
  return <PageSkeleton blocks={4} hoogte="h-32" />;
}
