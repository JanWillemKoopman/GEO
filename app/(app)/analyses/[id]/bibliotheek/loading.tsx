import { ListSkeleton } from "@/components/skeleton";

/** B: ontbrak nog. De kop en tabs staan al in de layout, alleen de lijst wacht. */
export default function Loading() {
  return <ListSkeleton rows={3} />;
}
