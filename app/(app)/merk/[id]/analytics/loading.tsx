import { PageSkeleton } from "@/components/skeleton";

/**
 * Zichtbaarheid in AI: kop, de scorekaart, het verloop, en de vragentabel.
 *
 * ⚠️ Dit scherm draagt het hoofdgetal van het hele product en haalt daarvoor
 * vijf tabellen op. Het is dus precies het scherm waar wachten het meest
 * opvalt, en tot 28 augustus 2026 het scherm zonder wachtvorm.
 */
export default function Loading() {
  return <PageSkeleton blocks={3} hoogte="h-56" />;
}
