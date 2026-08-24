import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ExternalLink } from "@/components/external-link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prospects" };

/**
 * Alle bedrijven over alle markten heen (plan §5.3).
 *
 * ── EÉN BEDRIJF, MEERDERE MARKTEN ───────────────────────────────────────────
 *
 * Dat is de reden dat dit scherm bestaat naast Markten. Een makelaar in
 * Eindhoven die ook onder "aankoopmakelaar Brabant" valt is één bedrijf met twee
 * marktlidmaatschappen, en die moet je op één plek kunnen terugvinden. Anders
 * benader je hem twee keer, en dat is de fout die het hele idee onderuit haalt
 * (plan §5.5).
 *
 * ── WAT ER BEWUST ZICHTBAAR IS ──────────────────────────────────────────────
 *
 * "Geen website" en "site niet te lezen" staan er allebei, en ze zijn niet
 * hetzelfde. Het eerste is een BEVINDING en juist een interessante prospect
 * (plan hoofdstuk 9); het tweede is een probleem met onze kant. Ze
 * dooreengooien zou de beste prospects tussen de storingen laten verdwijnen.
 *
 * Lezen loopt via de sessie en dus mét RLS (migratie 0065). De poort in
 * `../layout.tsx` is het eerste slot, dit is het tweede.
 */
export default async function SalesProspectsPage() {
  await requireUser();
  const supabase = await createClient();

  const [{ data: bedrijven }, { data: leden }, { data: uitsluitingen }] = await Promise.all([
    supabase
      .from("sales_companies")
      .select("id, name, domain, city, crawl_status, do_not_contact")
      .order("name")
      .limit(200),
    supabase.from("sales_market_companies").select("company_id, market_id"),
    supabase.from("sales_suppressions").select("company_id, reason").not("company_id", "is", null),
  ]);

  const rijen = (bedrijven ?? []) as {
    id: string;
    name: string;
    domain: string | null;
    city: string | null;
    crawl_status: string;
    do_not_contact: boolean;
  }[];

  // In hoeveel markten zit dit bedrijf? Dat is de vraag waarvoor dit scherm er is.
  const marktenPer = new Map<string, number>();
  for (const l of (leden ?? []) as { company_id: string }[]) {
    marktenPer.set(l.company_id, (marktenPer.get(l.company_id) ?? 0) + 1);
  }

  const redenPer = new Map<string, string>();
  for (const u of (uitsluitingen ?? []) as { company_id: string | null; reason: string }[]) {
    if (u.company_id && !redenPer.has(u.company_id)) redenPer.set(u.company_id, u.reason);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Sales"
        title="Prospects"
        description="Alle bedrijven die ORBIT ENGINE in een markt is tegengekomen. Eén bedrijf kan in meerdere markten zitten."
      />

      {rijen.length === 0 ? (
        <EmptyState title="Nog geen bedrijven" action={{ href: "/sales/markten", label: "Naar de markten" }}>
          Bedrijven komen binnen zodra ORBIT ENGINE een markt in kaart brengt. Maak eerst een markt
          aan en start het onderzoek.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {rijen.map((b) => {
            const markten = marktenPer.get(b.id) ?? 0;
            const reden = redenPer.get(b.id);
            return (
              <li key={b.id} className={`card flex flex-col gap-1 ${reden ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{b.name}</span>
                    {b.domain ? (
                      <ExternalLink href={`https://${b.domain}`}>{b.domain}</ExternalLink>
                    ) : (
                      <span className="chip chip-neutral">geen website</span>
                    )}
                    {b.city && <span className="text-sm text-muted">{b.city}</span>}
                  </div>
                  <span className="mono-label">
                    {markten === 1 ? "1 markt" : `${markten} markten`}
                  </span>
                </div>
                {b.crawl_status === "niet_gelukt" && (
                  <p className="text-sm text-muted">De site was niet te lezen.</p>
                )}
                {b.do_not_contact && (
                  <p className="text-sm text-[var(--intent-warning-text)]">
                    Dit bedrijf wil niet benaderd worden.
                  </p>
                )}
                {reden && <p className="text-sm text-secondary">{reden}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
