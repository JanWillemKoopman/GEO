import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { KennisConflictLijst, type KennisConflictWeergave } from "../../_components/kennisconflict-lijst";
import { herkomstZin } from "@/lib/kennis/overzicht";
import { nogInTeDelen } from "@/lib/kennis/indelen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tegenstrijdige feiten" };

/**
 * De conflictlijst van één merk (WP2 van contentpijplijn-publicatiewaardig.md, §8.3).
 *
 * Sinds K8 deel 2 alleen de botsingen in de kennislaag (besluit V14): twee
 * versies van hetzelfde gegeven, en de consultant kiest. Alleen voor
 * medewerkers; een klant krijgt een 404 en geen 403, zelfde patroon als
 * `admin/concurrenten`. De tabel `fact_conflicts` is voor de klant ook in de
 * database dicht (migratie 0113).
 */
export default async function AdminFeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  const admin = createAdminClient();
  const [nogIndelen, { data: kennisConflictRijen }] = await Promise.all([
    nogInTeDelen(admin, id),
    // Alleen de open botsingen: de keuze zelf staat daarna in de kennislaag
    // (bevestigd en afgewezen, met wie en wanneer).
    admin
      .from("fact_conflicts")
      .select("id, soort, ernst, uitleg, kennis_ids")
      .eq("profile_id", id)
      .eq("echt_conflict", true)
      .eq("status", "open")
      .not("kennis_ids", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const kennisRijen = (kennisConflictRijen ?? []) as { id: string; soort: string; ernst: string; uitleg: string | null; kennis_ids: string[] }[];
  const kennisIds = Array.from(new Set(kennisRijen.flatMap((r) => r.kennis_ids)));
  const { data: itemRijen } = kennisIds.length
    ? await admin.from("klantkennis").select("id, bewering, bron, vastgelegd_op, vervangen_door, afgewezen_op").eq("profile_id", id).in("id", kennisIds)
    : { data: [] };
  const items = new Map(
    ((itemRijen ?? []) as { id: string; bewering: string; bron: string; vastgelegd_op: string; vervangen_door: string | null; afgewezen_op: string | null }[]).map((i) => [i.id, i]),
  );
  const kennisConflicten: KennisConflictWeergave[] = kennisRijen.map((r) => ({
    id: r.id,
    soort: r.soort,
    blokkerend: r.ernst === "blokkerend",
    uitleg: r.uitleg,
    items: r.kennis_ids.flatMap((kid) => {
      const i = items.get(kid);
      return i ? [{ id: i.id, bewering: i.bewering, herkomst: herkomstZin(i), actueel: !i.vervangen_door && !i.afgewezen_op }] : [];
    }),
  }));

  return (
    <div className="flex flex-col gap-6 wil-lezen">
      <PageHeader
        eyebrow="Admin"
        title="Tegenstrijdige feiten"
        description="Twee versies van hetzelfde gegeven die niet allebei waar kunnen zijn. Zolang er een open staat, gaat geen van beide op een pagina."
      />
      <KennisConflictLijst profileId={id} conflicten={kennisConflicten} nogIndelen={nogIndelen} />
    </div>
  );
}
