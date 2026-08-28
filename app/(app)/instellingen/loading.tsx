import { PageSkeleton } from "@/components/skeleton";

/**
 * Instellingen staat in een kolom van maximaal 36rem, dus de wachtvorm ook.
 * Zonder die grens springt het scherm van breed naar smal zodra het vult.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <PageSkeleton blocks={3} hoogte="h-40" />
    </div>
  );
}
