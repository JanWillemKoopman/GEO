import { PageSkeleton } from "@/components/skeleton";

/** Het kwaliteitslab: kop, het ijkingsblok en de tabel met pagina's. */
export default function Loading() {
  return <PageSkeleton blocks={3} hoogte="h-32" />;
}
