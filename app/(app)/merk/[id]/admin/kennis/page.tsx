import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { alleRijen } from "@/lib/supabase/pagineer";
import { PageHeader } from "@/components/page-header";
import { maakOverzicht, openPuntenUitOnderzoek, type OverzichtItem } from "@/lib/kennis/overzicht";
import { KennisOverzicht } from "../../_components/kennis-overzicht";
import { blokkadesVoorMerk } from "@/lib/kennis/voor-pagina";
import { BLOKKADE_ZIN } from "@/lib/kennis/betwist";
import { geraaktOverzicht } from "@/lib/kansen/impact";
import { formatUsd, formatDateShort } from "@/lib/format";

const KANS_STATUS_LABEL: Record<"te_herzien" | "vervallen", string> = {
  te_herzien: "te herzien",
  vervallen: "vervallen",
};

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
  const [blokkades, { data: facetten }] = await Promise.all([
    blokkadesVoorMerk(admin, id, rijen),
    // De open punten van het onderzoek (A3): sinds besluit V3 geen vragen aan de
    // klant meer, maar onderwerpen voor het gesprek.
    admin.from("profile_facets").select("facet, raw_json").eq("profile_id", id).in("facet", ["synthese", "aanbod"]),
  ]);
  const openPunten = openPuntenUitOnderzoek((facetten ?? []) as { facet: string; raw_json: unknown }[]);
  const items = rijen.map((r) => {
    const b = blokkades.get(r.id);
    return { ...r, blokkade: b ? BLOKKADE_ZIN[b] : null };
  });
  // G3: wat een recente kenniswijziging raakte (afgewezen of aangepaste kennis).
  const geraakt = await geraaktOverzicht(admin, id);

  return (
    <div className="flex flex-col gap-6 wil-lezen">
      <PageHeader
        eyebrow="Admin"
        title="Wat we over het bedrijf weten"
        description="Alles wat het onderzoek en het gesprek opleverden, met waar het vandaan komt. Leg hier vast wat de klant in het gesprek bevestigt of verbetert."
      />
      {(geraakt.kansen.length > 0 || geraakt.paginas.length > 0) && (
        <section className="card flex flex-col gap-2">
          <h2 className="text-base font-medium">Wat een wijziging raakte</h2>
          <p className="text-sm text-secondary">
            Deze kansen en pagina&apos;s leunden op kennis die net veranderd of afgewezen is. ORBIT ENGINE
            herschrijft niets vanzelf: bekijk ze en beslis zelf of ze opnieuw moeten.
          </p>
          {geraakt.kansen.length > 0 && (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {geraakt.kansen.map((k) => (
                <li key={k.id}>
                  {k.titel} <span className="text-xs text-muted">({KANS_STATUS_LABEL[k.status]})</span>
                </li>
              ))}
            </ul>
          )}
          {geraakt.paginas.length > 0 && (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {geraakt.paginas.map((p) => (
                <li key={p.id}>
                  {p.titel} <span className="text-xs text-muted">(kennis gewijzigd op {formatDateShort(p.kennisGewijzigdOp)})</span>
                </li>
              ))}
            </ul>
          )}
          {geraakt.geschatteKostenUsd != null && (
            <p className="text-xs text-muted">
              Zou je {geraakt.paginas.length === 1 ? "deze pagina" : "al deze pagina's"} laten herschrijven, dan
              kost dat naar schatting hooguit {formatUsd(geraakt.geschatteKostenUsd)}.
            </p>
          )}
        </section>
      )}
      {openPunten.length > 0 && (
        <section className="card flex flex-col gap-2">
          <h2 className="text-base font-medium">Wat het onderzoek niet kon vaststellen</h2>
          <p className="text-sm text-secondary">
            Onderwerpen voor het gesprek met de klant. Wat hij vertelt, leg je vast op het gespreksscherm of hieronder.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {openPunten.map((p) => (
              <li key={p.punt}>
                {p.punt} <span className="text-xs text-muted">({p.bron === "aanbod" ? "uit het aanbod" : "uit de samenvatting"})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <KennisOverzicht profileId={id} overzicht={maakOverzicht(items)} />
    </div>
  );
}
