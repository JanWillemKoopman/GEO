import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { STAND_TEKST, isOutreachStand, type OutreachStand } from "@/lib/sales/workflow";
import { KANS_LABEL, type KansType } from "@/lib/sales/opportunity";
import { KANS_BEDRIJF } from "@/lib/sales/relaties";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sales" };

/**
 * Het startscherm van een salesmedewerker (plan §5.1).
 *
 * ── DIT SCHERM BEANTWOORDT ÉÉN VRAAG ────────────────────────────────────────
 *
 * Wie moet ik vandaag bellen. Geen marktcijfers, geen totalen over de database,
 * en geen leaderboard over collega's: dat laatste staat er bewust niet op, want
 * het verandert een werklijst in een wedstrijd.
 *
 * Vier blokken, van boven naar beneden: mijn werk vandaag, wat er te pakken
 * ligt, wat er terugkomt, en mijn eigen cijfers deze maand.
 *
 * ⚠️ **Tot 1 september 2026 was dit scherm een vaste lege staat.** Er stond
 * letterlijk "Er is nog geen markt gemeten", ook nadat er een markt gemeten
 * wás: het scherm haalde niets op. Dat is precies het soort belofte dat
 * `merkstrategie.md` §30 verbiedt, en het was het eerste dat een New business
 * manager te zien kreeg als hij de module opende.
 */
export default async function SalesOverzichtPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const beginMaand = new Date();
  beginMaand.setUTCDate(1);
  beginMaand.setUTCHours(0, 0, 0, 0);

  const [{ data: mijnRijen }, { data: vrijeKansen }, { data: maandRijen }] = await Promise.all([
    // Mijn werk: alles wat ik heb opgepakt en nog niet afgerond is.
    supabase
      .from("sales_outreach")
      .select(
        "id, status, company_id, follow_up_at, sent_at, reply_at, updated_at, " +
          "sales_companies(name), sales_markets(label), sales_opportunities(hook_text, score)",
      )
      .eq("owner_user_id", user.id)
      .not("status", "in", "(afgewezen,klant,niet_nu)")
      .order("updated_at", { ascending: true })
      .limit(25),

    // Wat er te pakken ligt: de hoogste kansen zonder eigenaar. De koppeling
    // met outreach gaat hieronder, want een kans weet zelf niet of iemand hem
    // heeft opgepakt: outreach hangt aan het BEDRIJF en niet aan de meting
    // (plan hoofdstuk 6, gevolg 3).
    supabase
      .from("sales_opportunities")
      .select(
        `id, score, type, tier, hook_text, company_id, ${KANS_BEDRIJF}(name, city), sales_markets(label)`,
      )
      .is("superseded_by", null)
      .gte("score", 45)
      .order("score", { ascending: false })
      .limit(40),

    // Mijn cijfers deze maand, en alleen de mijne.
    supabase
      .from("sales_outreach")
      .select("id, status, sent_at, reply_at, call_at, outcome")
      .eq("owner_user_id", user.id)
      .gte("updated_at", beginMaand.toISOString())
      .limit(500),
  ]);

  type MijnRij = {
    id: string;
    status: string;
    company_id: string;
    follow_up_at: string | null;
    sent_at: string | null;
    reply_at: string | null;
    sales_companies: { name: string } | null;
    sales_markets: { label: string } | null;
    sales_opportunities: { hook_text: string | null; score: number } | null;
  };
  type KansRij = {
    id: string;
    score: number;
    type: string;
    hook_text: string | null;
    company_id: string;
    sales_companies: { name: string; city: string | null } | null;
    sales_markets: { label: string } | null;
  };

  const mijnWerk = (mijnRijen ?? []) as unknown as MijnRij[];
  const alleKansen = (vrijeKansen ?? []) as unknown as KansRij[];
  const maand = (maandRijen ?? []) as {
    status: string;
    sent_at: string | null;
    reply_at: string | null;
    call_at: string | null;
    outcome: string | null;
  }[];

  // Welke bedrijven heeft iemand al opgepakt? Eén query over alle actieve
  // outreach, want anders staat een kans in dit blok die een collega al heeft.
  const { data: bezetteRijen } = await supabase
    .from("sales_outreach")
    .select("company_id")
    .not("status", "in", "(afgewezen,klant,niet_nu)")
    .limit(1000);
  const bezet = new Set(((bezetteRijen ?? []) as { company_id: string }[]).map((r) => r.company_id));

  const tePakken = alleKansen.filter((k) => !bezet.has(k.company_id)).slice(0, 8);
  const reacties = mijnWerk.filter((r) => r.reply_at);
  const vandaag = new Date().toISOString().slice(0, 10);

  const cijfers = [
    { label: "Opgepakt", waarde: maand.length },
    { label: "Verstuurd", waarde: maand.filter((r) => r.sent_at).length },
    { label: "Reactie", waarde: maand.filter((r) => r.reply_at).length },
    { label: "Gebeld", waarde: maand.filter((r) => r.call_at).length },
    { label: "Gesprek", waarde: maand.filter((r) => r.status === "gesprek" || r.status === "gekwalificeerd" || r.status === "klant").length },
    { label: "Klant", waarde: maand.filter((r) => r.status === "klant").length },
  ];

  const leeg = mijnWerk.length === 0 && tePakken.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Sales"
        title="Wat moet je vandaag doen?"
        description="Je eigen werk, de kansen die niemand heeft opgepakt en wat er terugkomt op je mails. Dit scherm ziet alleen Outer Orbit."
      />

      {leeg ? (
        <EmptyState title="Er staat nog geen werk klaar" action={{ href: "/sales/markten", label: "Naar de markten" }}>
          Er is nog geen gemeten markt met kansen erin. Begin met een markt: een branche, een plaats
          en de straal eromheen.
        </EmptyState>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="font-semibold">Jouw werk vandaag</h2>
              <p className="text-secondary">
                Wat je hebt opgepakt en waar een volgende stap op wacht. De oudste staat bovenaan.
              </p>
            </div>
            {mijnWerk.length === 0 ? (
              <p className="card text-secondary">
                Je hebt niets openstaan. Pak hieronder een kans op, dan zet ORBIT ENGINE de
                contactpersoon en het concept klaar.
              </p>
            ) : (
              mijnWerk.map((rij) => (
                <article key={rij.id} className="card flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-semibold">{rij.sales_companies?.name ?? "Onbekend bedrijf"}</h3>
                      <span className="mono-label">{rij.sales_markets?.label ?? ""}</span>
                    </div>
                    <span className="chip chip-neutral">
                      {isOutreachStand(rij.status) ? STAND_TEKST[rij.status as OutreachStand].label : rij.status}
                    </span>
                  </div>
                  <p className="text-secondary">{rij.sales_opportunities?.hook_text ?? ""}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* De volgende stap staat in gewone taal, want dat is de
                        vraag die dit scherm beantwoordt. */}
                    <span className="text-sm">
                      {isOutreachStand(rij.status) ? STAND_TEKST[rij.status as OutreachStand].uitleg : ""}
                    </span>
                    {rij.follow_up_at && rij.follow_up_at.slice(0, 10) <= vandaag && (
                      <span className="chip chip-warning">opvolging staat vandaag</span>
                    )}
                    <Link href={`/sales/prospects/${rij.company_id}`} className="ml-auto btn-ghost">
                      Naar het dossier
                    </Link>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="font-semibold">Nog niet opgepakt</h2>
              <p className="text-secondary">
                De hoogste kansen waar nog niemand mee bezig is. Wie hem oppakt, krijgt hem: een
                bedrijf kan maar één actieve benadering tegelijk hebben.
              </p>
            </div>
            {tePakken.length === 0 ? (
              <p className="card text-secondary">
                Alles met een score van 45 of hoger is opgepakt. Meet een nieuwe markt, of hermeet
                een bestaande om te zien wat er veranderd is.
              </p>
            ) : (
              tePakken.map((kans) => (
                <article key={kans.id} className="card flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-semibold">{kans.sales_companies?.name ?? "Onbekend bedrijf"}</h3>
                      <span className="mono-label">{kans.sales_markets?.label ?? ""}</span>
                    </div>
                    <span className="chip chip-neutral">{kans.score}</span>
                  </div>
                  <p className="text-secondary">{kans.hook_text ?? ""}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip chip-neutral">
                      {KANS_LABEL[kans.type as KansType] ?? kans.type}
                    </span>
                    {kans.sales_companies?.city && (
                      <span className="mono-label">{kans.sales_companies.city}</span>
                    )}
                    <Link href={`/sales/prospects/${kans.company_id}`} className="ml-auto btn-ghost">
                      Bekijk en pak op
                    </Link>
                  </div>
                </article>
              ))
            )}
          </section>

          {reacties.length > 0 && (
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="font-semibold">Hier kwam een reactie op</h2>
                <p className="text-secondary">Bellen is nu de volgende stap, niet nog een mail.</p>
              </div>
              {reacties.map((rij) => (
                <article key={`reactie-${rij.id}`} className="card flex items-center justify-between gap-2">
                  <span className="font-semibold">{rij.sales_companies?.name ?? "Onbekend bedrijf"}</span>
                  <Link href={`/sales/prospects/${rij.company_id}`} className="btn-ghost">
                    Naar het dossier
                  </Link>
                </article>
              ))}
            </section>
          )}

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="font-semibold">Jouw cijfers deze maand</h2>
              {/* ⚠️ Alleen de eigen cijfers, en geen vergelijking met collega's
                  (plan §5.1, laatste zin). Het eerste cijfer dat echt telt is
                  Gesprek, niet Verstuurd. */}
              <p className="text-secondary">
                Alleen die van jou. Het cijfer dat telt is Gesprek: alles daarboven is een
                tussenstap.
              </p>
            </div>
            <div className="card flex flex-wrap gap-6">
              {cijfers.map((c) => (
                <div key={c.label}>
                  <span className="mono-label">{c.label}</span>
                  <p className="text-xl font-semibold">{c.waarde}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
