import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSalesAdmin } from "@/lib/sales/access";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import { marktFase } from "@/lib/sales/market";
import { NieuweMarkt } from "./nieuwe-markt";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Markten" };

/** Datum zonder tijd, met een vaste locale: de server in Vercel staat niet op Nederlands. */
function datum(waarde: string | null): string {
  if (!waarde) return "onbekend";
  const d = new Date(waarde);
  if (Number.isNaN(d.getTime())) return "onbekend";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * De motorkamer: welke markten lopen er, en hoe ver zijn ze (plan §5.4).
 *
 * ── WAAROM ALLEEN EEN SALES ADMIN HIER IETS KAN STARTEN ─────────────────────
 *
 * Een markt onderzoeken kost geld en kan tot een publieke pagina leiden. Dat is
 * dezelfde afweging als besluit 18 aan de klantkant: wie de rekening draagt,
 * beslist wanneer er betaald wordt. Een salesmedewerker ziet de markten wel,
 * want hij moet weten waar zijn kansen vandaan komen, maar hij start ze niet.
 *
 * ⚠️ De knop is verborgen voor wie hem niet mag indrukken, en de API-route
 * weigert hem daarnaast ook zelf. Verbergen alleen is geen slot: de route is de
 * garantie, dit is de beleefdheid.
 */
export default async function SalesMarktenPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Lezen loopt via de sessie en dus mét RLS (migratie 0065). De poort in
  // `layout.tsx` heeft hier al gestaan; dit is het tweede slot op dezelfde deur.
  const [{ data: markten }, admin] = await Promise.all([
    supabase
      .from("sales_markets")
      .select(
        "id, slug, label, industry, location, radius_km, status, is_public, created_at, approved_at, conflict_note",
      )
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    isSalesAdmin(user.id),
  ]);

  const rijen = markten ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Sales"
        title="Markten"
        description="De markten die ORBIT ENGINE onderzoekt, en hoe ver ze zijn. Elke meting is een eigen ronde, en de vorige rondes blijven staan."
      />

      {admin && <NieuweMarkt />}

      {rijen.length === 0 ? (
        <EmptyState title="Nog geen markten">
          {admin
            ? "Begin met een branche en een plaats. Daarna brengt ORBIT ENGINE de bedrijven in kaart."
            : "Er is nog geen markt aangemaakt. Een sales admin zet de eerste klaar."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {rijen.map((m) => {
            // Conventie 3: een stand die we niet kennen is geen stand. `marktFase`
            // geeft dan "onbekend" terug in plaats van de eerste uit de lijst te
            // tonen alsof hij klopt.
            const fase = marktFase({
              status: m.status as string,
              approved_at: m.approved_at as string | null,
            });
            return (
              <li key={m.id as string} className="card-interactive card flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    <Link href={`/sales/markten/${m.id as string}`} className="hover:underline">
                      {m.label as string}
                    </Link>
                  </h2>
                  <span className="mono-label">
                    {fase.label}
                    {m.is_public ? " · openbaar" : ""}
                  </span>
                </div>
                <p className="text-secondary">{fase.uitleg}</p>
                {/* De waarschuwing hoort ook in de lijst te staan en niet alleen op
                    het detailscherm: wie hier een markt uitkiest om aan te werken,
                    moet nu al weten dat er een klant van ons in zit (plan 9.5). */}
                {m.conflict_note && (
                  <p className="text-sm text-[var(--intent-warning-text)]">
                    {m.conflict_note as string}
                  </p>
                )}
                <p className="text-sm text-muted">
                  {m.industry as string} in {m.location as string}, {m.radius_km as number} km eromheen
                  {" · "}
                  aangemaakt op {datum(m.created_at as string)}
                  {" · "}
                  {m.slug as string}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
