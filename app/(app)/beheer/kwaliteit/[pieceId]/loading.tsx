import { PageSkeleton } from "@/components/skeleton";

/** Eén pagina in het lab: de analyse, de tekst en het beoordelingsformulier. */
export default function Loading() {
  return <PageSkeleton blocks={4} hoogte="h-40" />;
}
