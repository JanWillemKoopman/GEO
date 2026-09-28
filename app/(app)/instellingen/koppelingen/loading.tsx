import { PageSkeleton } from "@/components/skeleton";

/**
 * Het overzicht van koppelingen: een kop en een tabel, in de volle breedte
 * zoals de pagina zelf (sinds 28 september 2026 geen formulieren meer).
 */
export default function Loading() {
  return (
    <PageSkeleton blocks={1} hoogte="h-64" />
  );
}
