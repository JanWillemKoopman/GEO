import { PageSkeleton } from "@/components/skeleton";

/**
 * Zoekverkeer wacht op Google Search Console, dus op een dienst buiten onze
 * eigen database. Van alle schermen is dit degene waar de wachttijd het minst
 * in eigen hand is, en dus degene die het hardst een wachtvorm nodig had.
 */
export default function Loading() {
  return <PageSkeleton blocks={3} hoogte="h-48" />;
}
