import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { ConflictLijst, type ConflictWeergave } from "../../_components/conflict-lijst";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tegenstrijdige feiten" };

/**
 * De conflictlijst van één merk (WP2 van contentpijplijn-publicatiewaardig.md, §8.3).
 *
 * Per conflict de twee zinnen met bron en datum, het voorstel van L2, en drie
 * keuzes: dit geldt, dat geldt, vraag het de ondernemer. Alleen voor
 * medewerkers; een klant krijgt een 404 en geen 403, zelfde patroon als
 * `admin/concurrenten`. De klant ziet dit scherm nooit, en de tabel
 * `fact_conflicts` is voor hem ook in de database dicht (migratie 0113).
 */
export default async function AdminFeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  const admin = createAdminClient();
  const [{ data: conflictRijen }, { count: nogIndelen }] = await Promise.all([
    admin
      .from("fact_conflicts")
      .select("id, feit_ids, soort, ernst, uitleg, voorstel, voorstel_feit_id, status, gekozen_feit_id, oplossing, created_at")
      .eq("profile_id", id)
      .eq("echt_conflict", true)
      // Conflicten van de kennislaag (K2, V14) hebben geen feiten om te tonen.
      .is("kennis_ids", null)
      .order("created_at", { ascending: false }),
    admin
      .from("brand_facts")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id)
      .is("superseded_by", null)
      .is("ingedeeld_at", null),
  ]);

  const rijen = (conflictRijen ?? []) as {
    id: string;
    feit_ids: string[];
    soort: string;
    ernst: string;
    uitleg: string | null;
    voorstel: string | null;
    voorstel_feit_id: string | null;
    status: string;
    gekozen_feit_id: string | null;
    oplossing: string | null;
    created_at: string;
  }[];

  const feitIds = Array.from(new Set(rijen.flatMap((r) => r.feit_ids)));
  const { data: feitRijen } = feitIds.length
    ? await admin.from("brand_facts").select("id, text, source, created_at").in("id", feitIds)
    : { data: [] };
  const feiten = new Map(
    ((feitRijen ?? []) as { id: string; text: string; source: string; created_at: string }[]).map((f) => [f.id, f]),
  );

  const conflicten: ConflictWeergave[] = rijen.map((r) => ({
    id: r.id,
    soort: r.soort,
    blokkerend: r.ernst === "blokkerend",
    uitleg: r.uitleg,
    voorstel: r.voorstel,
    voorstelFeitId: r.voorstel_feit_id,
    status: r.status,
    gekozenFeitId: r.gekozen_feit_id,
    oplossing: r.oplossing,
    feiten: r.feit_ids.flatMap((fid) => {
      const f = feiten.get(fid);
      return f ? [{ id: f.id, tekst: f.text, bron: f.source, datum: f.created_at }] : [];
    }),
  }));

  return (
    <div className="flex flex-col gap-6 wil-lezen">
      <PageHeader
        eyebrow="Admin"
        title="Tegenstrijdige feiten"
        description="Twee feiten over hetzelfde die niet allebei waar kunnen zijn. Zolang er een open staat, gaat geen van beide op een pagina."
      />
      <ConflictLijst profileId={id} conflicten={conflicten} nogIndelen={nogIndelen ?? 0} />
    </div>
  );
}
