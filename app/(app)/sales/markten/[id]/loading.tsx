import { PageSkeleton } from "@/components/skeleton";

/** Het marktdossier: kop, de stand en de bedrijvenlijst. */
export default function Loading() {
  return <PageSkeleton blocks={3} hoogte="h-40" />;
}
