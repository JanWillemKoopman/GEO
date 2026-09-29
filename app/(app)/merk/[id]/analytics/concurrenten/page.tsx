import { redirect } from "next/navigation";

/**
 * De concurrenten staan sinds 30 september 2026 onder "Zichtbaarheid in AI",
 * achter de keuzeknop naast de AI-vragen. Dit adres blijft bestaan zodat oude
 * bladwijzers en links werken.
 */
export default async function ConcurrentenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/merk/${id}/analytics?tabel=concurrenten`);
}
