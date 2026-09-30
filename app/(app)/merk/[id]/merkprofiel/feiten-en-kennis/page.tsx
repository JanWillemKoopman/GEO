import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { alleRijen } from "@/lib/supabase/pagineer";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/tabs";
import { CollapsibleSection } from "@/components/collapsible-section";
import {
  itemsVoorTab,
  leesTab,
  openPuntenUitOnderzoek,
  telPerFilter,
  werkgebiedPunten,
  herkomstZin,
  type OverzichtItem,
} from "@/lib/kennis/overzicht";
import { blokkadesVoorMerk } from "@/lib/kennis/voor-pagina";
import { BLOKKADE_ZIN } from "@/lib/kennis/betwist";
import { nogInTeDelen } from "@/lib/kennis/indelen";
import { geraaktOverzicht } from "@/lib/kansen/impact";
import { formatUsd, formatDateShort } from "@/lib/format";
import { KennisWerkblad } from "../../_components/kennis-werkblad";
import { KennisToevoegen } from "../../_components/kennis-toevoegen";
import { KennisConflictLijst, type KennisConflictWeergave } from "../../_components/kennisconflict-lijst";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feiten en kennis" };

const KANS_STATUS_LABEL: Record<"te_herzien" | "vervallen", string> = {
  te_herzien: "te herzien",
  vervallen: "vervallen",
};

/**
 * Alles wat ORBIT ENGINE over het bedrijf weet, op één plek (30 september 2026).
 *
 * Dit scherm vervangt twee Admin-schermen die geen menuregel hadden en alleen via
 * het onboardinggesprek te vinden waren: `admin/kennis` (het kennisoverzicht, K7)
 * en `admin/feiten` (de tegenstrijdigheden, K8 deel 2). Beide verwijzen door
 * (`lib/redirects.ts`). De gegevens, regels en handelingen zijn dezelfde; alleen
 * de indeling is nieuw: twee tabbladen, ingeklapte onderwerpen en een filter.
 *
 * ── WIE HET ZIET ────────────────────────────────────────────────────────────
 *
 * Medewerkers en de klant zelf. Besluit V6 en V11 (26 september 2026) hielden
 * het kennisoverzicht dicht voor de klant; de eigenaar heeft dat op 30
 * september 2026 omgekeerd. De klant leest dezelfde twee tabbladen, zonder
 * knoppen per regel en zonder de stukken voor de consultant (botsingen, open
 * punten, geraakte pagina's). De tabel `klantkennis` blijft in de database dicht
 * en de route om iets te wijzigen blijft alleen voor medewerkers. Eén knop is er
 * voor allebei: "Kennis toevoegen" rechtsboven (`KennisToevoegen`), een upload of
 * geplakte tekst waar het model feiten, kennis en vermoedens uit haalt, met als
 * bron Handmatige upload. Die route is open voor wie bij het merk hoort.
 *
 * ── DE BREEDTE ──────────────────────────────────────────────────────────────
 *
 * Geen `wil-lezen` (720 pixels): dat is voor een formulier of één stuk tekst. Dit
 * is een tabel met zes kolommen en zoekt de gewone werkbreedte van de app.
 *
 * ── WAT WAAR STAAT ──────────────────────────────────────────────────────────
 *
 * Een tegenstrijdigheid houdt een pagina tegen, dus staat die boven de tabbladen
 * zodra er een openstaat, en pas onderaan (ingeklapt) als er geen is. De open
 * punten van het onderzoek en wat een wijziging raakte staan onder de tabbladen,
 * ingeklapt: ze horen bij beide tabbladen en zijn naslag, geen hoofdzaak.
 */
export default async function FeitenEnKennisPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const profile = await getProfile(id);
  if (!profile) notFound();

  // ⚠️ `getProfile` draait onder de rechten van de gebruiker: een klant krijgt
  // hier alleen zijn eigen merk terug, en anders een 404. Daarna leest de server
  // met de admin-sleutel, want `klantkennis` is voor de klant zelf in de database
  // dicht (RLS, migratie 0116). Lezen is niet schrijven: de route om iets te
  // wijzigen blijft alleen voor medewerkers.
  const user = await requireUser();
  const staf = await isStaff(user.id);

  const tab = leesTab(tabParam);
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

  // Een klant krijgt de interne stukken niet: de botsingen, de open punten voor
  // het gesprek en wat een wijziging raakte zijn werk van de consultant.
  const leeg = { data: null as null };
  const [nogIndelen, blokkades, { data: facetten }, { data: profielRij }, { data: conflictRijen }, geraakt] = await Promise.all([
    staf ? nogInTeDelen(admin, id) : Promise.resolve(0),
    // Wat op de conflictlijst staat of daar verloor, krijgt de schrijver niet
    // (`betwist.ts`); de consultant ziet dat hier, met de reden.
    blokkadesVoorMerk(admin, id, rijen),
    // De open punten van het onderzoek (A3): sinds besluit V3 geen vragen aan de
    // klant meer, maar onderwerpen voor het gesprek.
    staf ? admin.from("profile_facets").select("facet, raw_json").eq("profile_id", id).in("facet", ["synthese", "aanbod"]) : Promise.resolve(leeg),
    staf ? admin.from("profiles").select("service_scope, service_regions, business_model").eq("id", id).maybeSingle() : Promise.resolve(leeg),
    // Alleen de open botsingen: de keuze zelf staat daarna in de kennislaag
    // (bevestigd en afgewezen, met wie en wanneer).
    staf
      ? admin
          .from("fact_conflicts")
          .select("id, soort, ernst, uitleg, kennis_ids")
          .eq("profile_id", id)
          .eq("echt_conflict", true)
          .eq("status", "open")
          .not("kennis_ids", "is", null)
          .order("created_at", { ascending: false })
      : Promise.resolve(leeg),
    // G3: wat een recente kenniswijziging raakte (afgewezen of aangepaste kennis).
    staf ? geraaktOverzicht(admin, id) : Promise.resolve({ kansen: [], paginas: [], geschatteKostenUsd: null }),
  ]);

  const items: OverzichtItem[] = rijen.map((r) => {
    const b = blokkades.get(r.id);
    return { ...r, blokkade: b ? BLOKKADE_ZIN[b] : null };
  });

  // V10: het werkgebied in plaatsen en een onbekend bedrijfsmodel eerst.
  const openPunten = [
    ...werkgebiedPunten(
      (profielRij ?? { service_scope: null, service_regions: [], business_model: null }) as {
        service_scope: string | null;
        service_regions: string[] | null;
        business_model: string | null;
      },
    ),
    ...openPuntenUitOnderzoek((facetten ?? []) as { facet: string; raw_json: unknown }[]),
  ];

  // De botsingen, met de tekst van de items erbij.
  const conflictRijenTyped = (conflictRijen ?? []) as { id: string; soort: string; ernst: string; uitleg: string | null; kennis_ids: string[] }[];
  const kennisIds = Array.from(new Set(conflictRijenTyped.flatMap((r) => r.kennis_ids)));
  const { data: conflictItemRijen } = kennisIds.length
    ? await admin.from("klantkennis").select("id, bewering, bron, vastgelegd_op, vervangen_door, afgewezen_op").eq("profile_id", id).in("id", kennisIds)
    : { data: [] };
  const conflictItems = new Map(
    ((conflictItemRijen ?? []) as { id: string; bewering: string; bron: string; vastgelegd_op: string; vervangen_door: string | null; afgewezen_op: string | null }[]).map((i) => [i.id, i]),
  );
  const conflicten: KennisConflictWeergave[] = conflictRijenTyped.map((r) => ({
    id: r.id,
    soort: r.soort,
    blokkerend: r.ernst === "blokkerend",
    uitleg: r.uitleg,
    items: r.kennis_ids.flatMap((kid) => {
      const i = conflictItems.get(kid);
      return i ? [{ id: i.id, bewering: i.bewering, herkomst: herkomstZin(i), actueel: !i.vervangen_door && !i.afgewezen_op }] : [];
    }),
  }));

  const feiten = itemsVoorTab(items, "feiten");
  const kennis = itemsVoorTab(items, "kennis");
  const basis = `/merk/${id}/merkprofiel/feiten-en-kennis`;
  const lijst = (
    <KennisConflictLijst profileId={id} conflicten={conflicten} nogIndelen={nogIndelen} />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={staf ? "Ook zichtbaar voor de klant, die alleen kan toevoegen" : undefined}
        action={<KennisToevoegen profileId={id} alleenLezen={!staf} />}
        title="Feiten en kennis"
        description={
          staf
            ? "Alles wat het onderzoek en het gesprek over het bedrijf opleverden, met de bron erbij. Wat hier staat wordt gebruikt bij het schrijven, tenzij je het afkeurt. Vermoedens van het onderzoek gaan pas mee nadat je ze bevestigt."
            : "Alles wat ORBIT ENGINE over je bedrijf weet, met de bron erbij. Wat hier bij Gebruikt op Ja staat, gebruikt ORBIT ENGINE bij het schrijven van je pagina's. Een vermoeden gebruikt het pas nadat het bevestigd is. Klopt er iets niet? Zeg het je consultant, die past het aan."
        }
      />

      {staf && conflicten.length > 0 && (
        <section className="card flex flex-col gap-3">
          <h2 className="text-base font-medium">
            {conflicten.length === 1 ? "Eén tegenstrijdigheid wacht op je keuze" : `${conflicten.length} tegenstrijdigheden wachten op je keuze`}
          </h2>
          <p className="text-sm text-secondary">
            Twee versies van hetzelfde gegeven die niet allebei waar kunnen zijn. Zolang er een open staat, gaat geen van beide op een pagina.
          </p>
          {lijst}
        </section>
      )}

      <div className="flex flex-col gap-4">
        <Tabs
          label="Feiten en kennis"
          items={[
            { label: "Feiten", href: `${basis}?tab=feiten`, actief: tab === "feiten", aantal: telPerFilter(feiten).alles },
            { label: "Kennis", href: `${basis}?tab=kennis`, actief: tab === "kennis", aantal: telPerFilter(kennis).alles },
          ]}
        />
        {/* De sleutel bevat het tabblad: het werkblad onthoudt zijn filter en zijn
            geopende regel, en die horen bij één tabblad. */}
        <KennisWerkblad key={tab} profileId={id} tab={tab} items={tab === "feiten" ? feiten : kennis} alleenLezen={!staf} />
      </div>

      {staf && conflicten.length === 0 && (
        <CollapsibleSection title="Tegenstrijdigheden" badge="geen" defaultOpen={false} compact card>
          {lijst}
        </CollapsibleSection>
      )}

      {staf && openPunten.length > 0 && (
        <CollapsibleSection title="Wat het onderzoek niet kon vaststellen" badge={String(openPunten.length)} defaultOpen={false} compact card>
          <p className="text-sm text-secondary">
            Onderwerpen voor het gesprek met de klant. Wat hij vertelt, leg je vast op het gespreksscherm of hierboven.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {openPunten.map((p) => (
              <li key={p.punt}>
                {p.punt}{" "}
                <span className="text-xs text-muted">
                  ({p.bron === "aanbod" ? "uit het aanbod" : p.bron === "werkgebied" ? "uit het merkonderzoek" : "uit de samenvatting"})
                </span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {staf && (geraakt.kansen.length > 0 || geraakt.paginas.length > 0) && (
        <CollapsibleSection
          title="Wat een wijziging raakte"
          badge={String(geraakt.kansen.length + geraakt.paginas.length)}
          defaultOpen={false}
          compact
          card
        >
          <p className="text-sm text-secondary">
            Deze kansen en pagina&apos;s leunden op kennis die net veranderd of afgewezen is. ORBIT ENGINE herschrijft niets vanzelf:
            bekijk ze en beslis zelf of ze opnieuw moeten.
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
              Zou je {geraakt.paginas.length === 1 ? "deze pagina" : "al deze pagina's"} laten herschrijven, dan kost dat naar schatting
              hooguit {formatUsd(geraakt.geschatteKostenUsd)}.
            </p>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}
