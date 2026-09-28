import { PageSkeleton } from "@/components/skeleton";

/** Eén formulier in de breedte van `wil-lezen`, zoals de pagina zelf. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <PageSkeleton blocks={1} hoogte="h-80" />
    </div>
  );
}
