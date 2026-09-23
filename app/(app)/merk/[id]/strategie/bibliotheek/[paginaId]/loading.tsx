import { PageSkeleton } from "@/components/skeleton";

/** Het paginascherm: kop met standbalk, de kaart "Aan zet", en de inhoud eronder. */
export default function Loading() {
  return <PageSkeleton blocks={4} hoogte="h-24" />;
}
