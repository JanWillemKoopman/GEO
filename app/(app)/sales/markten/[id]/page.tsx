import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSalesAdmin } from "@/lib/sales/access";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { marktFase, isMarktStand } from "@/lib/sales/market";
import { Bedrijvenlijst, type BedrijfRegel } from "./bedrijvenlijst";
import { StartOnderzoek } from "./start-onderzoek";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Markt" };

/**
 * De motorkamer van één markt (plan §5.4), en het scherm waar poort 1 op staat.
 *
 * ── DE VOLGORDE OP DIT SCHERM IS NIET WILLEKEURIG ───────────────────────────
 *
 * Eerst de waarschuwing als er een klant van ons in deze markt zit, dan wat het
 * onderzoek zelf niet zeker wist, dan pas de lijst. Dat is de volgorde waarin
 * iemand het nodig heeft: wie onderaan begint met afvinken, leest de
 * waarschuwing pas als hij al door de lijst heen is.
 *
 * Lezen loopt via de sessie en dus mét RLS (migratie 0065 en 0066). De poort in
 * `../../layout.tsx` is het eerste slot, dit is het tweede.
 */
export default async function SalesMarktPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: markt } = await supabase
    .from("sales_markets")
    .select(
      "id, label, industry, location, radius_km, status, approved_at, conflict_note, discovery_note, failure_reason, is_public",
    )
    .eq("id", id)
    .maybeSingle();

  if (!markt) notFound();

  const [{ data: leden }, { data: uitsluitingen }, admin] = await Promise.all([
    supabase
      .from("sales_market_companies")
      .select(
        "company_id, confidence, included, excluded_reason, discovery_note, evidence_urls, " +
          "sales_companies (id, name, domain, city, crawl_status)",
      )
      .eq("market_id", id),
    supabase.from("sales_suppressions").select("company_id").not("company_id", "is", null),
    isSalesAdmin(user.id),
  ]);

  type Lid = {
    company_id: string;
    confidence: string;
    included: boolean | null;
    excluded_reason: string | null;
    discovery_note: string | null;
    evidence_urls: string[] | null;
    sales_companies: {
      id: string;
      name: string;
      domain: string | null;
      city: string | null;
      crawl_status: string;
    } | null;
  };

  // Bedrijven die op de uitsluitingslijst staan mag niemand terugzetten. Dat is
  // dezelfde regel als in de API-route; hier bepaalt hij alleen of de knop
  // verschijnt. De route is de garantie, dit is de beleefdheid.
  const geblokkeerd = new Set(
    ((uitsluitingen ?? []) as { company_id: string | null }[])
      .map((u) => u.company_id)
      .filter((c): c is string => Boolean(c)),
  );

  const bedrijven: BedrijfRegel[] = ((leden ?? []) as unknown as Lid[])
    .filter((l) => l.sales_companies)
    .map((l) => ({
      companyId: l.company_id,
      naam: l.sales_companies!.name,
      domein: l.sales_companies!.domain,
      plaats: l.sales_companies!.city,
      zekerheid: l.confidence,
      included: l.included,
      herkomst: l.discovery_note,
      vindplaatsen: (l.evidence_urls ?? []).filter((u) => /^https?:\/\//i.test(u)),
      uitgesloten: l.excluded_reason,
      geblokkeerd: geblokkeerd.has(l.company_id),
      crawlStatus: l.sales_companies!.crawl_status,
    }))
    // Meegenomen bovenaan, daarbinnen de zekerste eerst. Wie afvinkt wil eerst
    // zien wat erin zit, niet eerst wat er al uit is.
    .sort((a, b) => {
      const uit = (r: BedrijfRegel) => (r.included === false ? 1 : 0);
      const rang: Record<string, number> = { hoog: 0, middel: 1, laag: 2 };
      return (
        uit(a) - uit(b) ||
        (rang[a.zekerheid] ?? 3) - (rang[b.zekerheid] ?? 3) ||
        a.naam.localeCompare(b.naam, "nl")
      );
    });

  const status = markt.status as string;
  const fase = marktFase({ status, approved_at: markt.approved_at as string | null });
  const magStarten = admin && isMarktStand(status) && status === "concept";
  const magGoedkeuren = admin && status === "wacht_op_goedkeuring" && !markt.approved_at;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        backHref="/sales/markten"
        backLabel="Markten"
        eyebrow={fase.label}
        title={markt.label as string}
        description={`${markt.industry as string} in ${markt.location as string}, ${markt.radius_km as number} km eromheen. ${fase.uitleg}`}
      />

      {/* ⚠️ Bovenaan, vóór de lijst. Wie onderaan begint met afvinken, leest de
          waarschuwing pas als hij al door de lijst heen is (plan 9.5). */}
      {markt.conflict_note && (
        <div className="card card-warning">
          <p>{markt.conflict_note as string}</p>
        </div>
      )}

      {markt.failure_reason && (
        <div className="card card-danger">
          <p>{markt.failure_reason as string}</p>
        </div>
      )}

      {magStarten && <StartOnderzoek marketId={id} />}

      {markt.discovery_note && (
        <div className="card">
          <h2 className="text-lg font-semibold">Wat het onderzoek zelf niet zeker wist</h2>
          <p className="mt-1 text-secondary">{markt.discovery_note as string}</p>
        </div>
      )}

      {bedrijven.length === 0 ? (
        <EmptyState title="Nog geen bedrijven">
          {status === "concept"
            ? "Start het onderzoek, dan brengt ORBIT ENGINE de markt in kaart."
            : "ORBIT ENGINE is bezig. Ververs dit scherm over een paar minuten."}
        </EmptyState>
      ) : (
        <Bedrijvenlijst
          marketId={id}
          bedrijven={bedrijven}
          // Iedereen die dit scherm ziet is salesmedewerker (de poort staat in
          // de layout), en bijstellen kost niets. Goedkeuren is wél voorbehouden
          // aan de admin: dat is het besluit dat de keten verder laat lopen.
          magBewerken
          magGoedkeuren={Boolean(magGoedkeuren)}
        />
      )}
    </div>
  );
}
