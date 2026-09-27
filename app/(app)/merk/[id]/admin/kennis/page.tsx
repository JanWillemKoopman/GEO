import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { alleRijen } from "@/lib/supabase/pagineer";
import { PageHeader } from "@/components/page-header";
import { maakOverzicht, type OverzichtItem } from "@/lib/kennis/overzicht";
import { KennisOverzicht } from "../../_components/kennis-overzicht";
import { blokkadesVoorMerk } from "@/lib/kennis/voor-pagina";
import { BLOKKADE_ZIN } from "@/lib/kennis/betwist";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wat we over het bedrijf weten" };

/**
 * Het kennisoverzicht van één merk (K7 van van-pijplijn-naar-kennissysteem.md).
 *
 * Alleen voor medewerkers (besluit V6); een klant krijgt een 404 en geen 403,
 * zelfde patroon als `admin/feiten`. Vervangen versies laten we weg: die zijn
 * geschiedenis, geen kennis.
 */
export default async function AdminKennisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  const admin = createAdminClient();
  const rijen = await alleRijen<OverzichtItem & { herkomst_tabel: string | null; herkomst_id: string | null }>((van, tot) =>
    admin
      .from("klantkennis")
      .select("id, domein, soort, bewering, status, bron, gebruik, bron_url, citaat, bevestigd_door, bevestigd_op, vastgelegd_door, vastgelegd_door_taak, vastgelegd_op, verloopt_op, vervangen_door, afgewezen_op, bewijskracht, herkomst_tabel, herkomst_id")
      .eq("profile_id", id)
      .is("vervangen_door", null)
      .order("vastgelegd_op")
      .order("id")
      .range(van, tot),
  );

  // Wat op de conflictlijst staat of daar verloor, krijgt de schrijver niet
  // (`betwist.ts`); de consultant ziet dat hier, met de reden.
  const blokkades = await blokkadesVoorMerk(admin, id, rijen);
  const items = rijen.map((r) => {
    const b = blokkades.get(r.id);
    return { ...r, blokkade: b ? BLOKKADE_ZIN[b] : null };
  });

  return (
    <div className="flex flex-col gap-6 wil-lezen">
      <PageHeader
        eyebrow="Admin"
        title="Wat we over het bedrijf weten"
        description="Alles wat het onderzoek en het gesprek opleverden, met waar het vandaan komt. Leg hier vast wat de klant in het gesprek bevestigt of verbetert."
      />
      <KennisOverzicht profileId={id} overzicht={maakOverzicht(items)} />
    </div>
  );
}
