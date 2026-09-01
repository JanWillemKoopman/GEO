import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  STAND_TEKST,
  AFWIJS_LABEL,
  rekenTrechter,
  isOutreachStand,
  isAfwijsReden,
} from "@/lib/sales/workflow";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Outreach" };

/**
 * Wat er verstuurd is en wat eruit kwam (plan §5.5 en hoofdstuk 18).
 *
 * ── DIT SCHERM IS EEN LOGBOEK EN GEEN VERZENDCENTRALE ───────────────────────
 *
 * De openingsmail wordt altijd door de medewerker zelf verstuurd, vanuit zijn
 * eigen mailbox, onder zijn eigen naam (plan 16.3). ORBIT ENGINE zet het concept
 * klaar en registreert dat het eruit is. Er staat op dit scherm dus geen knop
 * "verzenden", en die komt er ook niet.
 *
 * ── DE TRECHTER TELT CUMULATIEF ─────────────────────────────────────────────
 *
 * Wie op "gesprek" staat is ook gemaild geweest. Zou de trechter op de huidige
 * stand tellen, dan zakt elke stap zodra iemand doorschuift, en dan daalt
 * "gemaild" terwijl er méér gemaild is. Dat is de klassieke fout in een
 * trechtergrafiek, en `lib/sales/workflow.ts` rekent hem daarom cumulatief.
 */
export default async function SalesOutreachPage() {
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("sales_outreach")
    .select(
      "id, status, subject, sent_at, reply_at, follow_up_at, lost_reason, company_id, " +
        "sales_companies(name), sales_markets(label), sales_opportunities(hook_text, score)",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  type Rij = {
    id: string;
    status: string;
    subject: string | null;
    sent_at: string | null;
    reply_at: string | null;
    follow_up_at: string | null;
    lost_reason: string | null;
    company_id: string;
    sales_companies: { name: string } | null;
    sales_markets: { label: string } | null;
    sales_opportunities: { hook_text: string | null; score: number } | null;
  };

  const rijen = (data ?? []) as unknown as Rij[];
  const trechter = rekenTrechter(rijen.map((r) => r.status));
  const vandaag = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Sales"
        title="Outreach"
        description="Wat je hebt uitstaan, wat erop terugkwam en welke soort aanleiding het beste werkt. Versturen doe je zelf, vanuit je eigen mailbox."
      />

      {rijen.length === 0 ? (
        <EmptyState
          title="Nog niets verstuurd"
          action={{ href: "/sales/opportunities", label: "Naar de kansen" }}
        >
          Pak een kans op, dan zet ORBIT ENGINE een conceptmail klaar. Jij leest hem, past hem aan
          en verstuurt hem zelf.
        </EmptyState>
      ) : (
        <>
          <section className="card flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold">De trechter</h2>
              <p className="mt-1 text-secondary">
                Cumulatief geteld: wie een gesprek had, is ook gemaild geweest. Het eerste cijfer
                dat echt telt is Gesprek gehad.
              </p>
            </div>
            <ul className="flex flex-col gap-1 text-sm">
              {trechter.map((stap) => (
                <li key={stap.stand} className="flex justify-between gap-4">
                  <span>{stap.label}</span>
                  <span className="text-secondary">
                    {stap.aantal}
                    {stap.conversie !== null ? ` (${Math.round(stap.conversie * 100)}%)` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-col gap-3">
            {rijen.map((rij) => {
              const stand = isOutreachStand(rij.status) ? STAND_TEKST[rij.status] : null;
              const teLaat =
                rij.follow_up_at && rij.follow_up_at.slice(0, 10) <= vandaag;
              return (
                <article key={rij.id} className="card flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-semibold">
                        {rij.sales_companies?.name ?? "Onbekend bedrijf"}
                      </h3>
                      <span className="mono-label">{rij.sales_markets?.label ?? ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {teLaat && <span className="chip chip-warning">follow-up vandaag</span>}
                      <span className="chip chip-neutral">{stand?.label ?? rij.status}</span>
                    </div>
                  </div>

                  {rij.sales_opportunities?.hook_text && (
                    <p className="text-secondary">{rij.sales_opportunities.hook_text}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                    {rij.sent_at && (
                      <span>verstuurd op {new Date(rij.sent_at).toLocaleDateString("nl-NL")}</span>
                    )}
                    {rij.reply_at && (
                      <span>
                        reactie op {new Date(rij.reply_at).toLocaleDateString("nl-NL")}
                      </span>
                    )}
                    {rij.lost_reason && isAfwijsReden(rij.lost_reason) && (
                      <span>reden: {AFWIJS_LABEL[rij.lost_reason].toLowerCase()}</span>
                    )}
                    <Link href={`/sales/prospects/${rij.company_id}`} className="ml-auto btn-ghost">
                      Naar het dossier
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
