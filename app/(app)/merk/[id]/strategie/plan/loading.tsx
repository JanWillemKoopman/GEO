import { PageSkeleton } from "@/components/skeleton";

/**
 * Het contentplan haalt het plan, de maanden, de pagina's, de reservelijst, de
 * funnelfases en de onderwerpen op. Zes lijsten voor één scherm, en daarna nog
 * een bord dat in de browser opgebouwd wordt.
 */
export default function Loading() {
  return <PageSkeleton blocks={2} hoogte="h-72" />;
}
