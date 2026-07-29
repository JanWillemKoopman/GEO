import { ListSkeleton } from "@/components/skeleton";

/** Het dashboard doet vijf queries voordat er iets te zien is; dit vult dat gat. */
export default function Loading() {
  return <ListSkeleton rows={3} />;
}
