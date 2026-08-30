import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { publiekeBedrijven, type RapportBedrijf } from "@/lib/sales/report";
import { engineLabel } from "@/lib/engines/label";

export const dynamic = "force-dynamic";

/**
 * De publieke marktpagina (`docs/tasks/geo-prospect-engine.md` hoofdstuk 20).
 *
 * ── DE ENIGE PAGINA VAN DE APP ZONDER INLOG ─────────────────────────────────
 *
 * "De verkoper zegt kijk zelf, en de prospect hoeft geen account." Deze pagina
 * staat daarom buiten de `(app)`-groep: geen `requireUser`, geen zijbalk, geen
 * merkkiezer.
 *
 * ⚠️ **Lezen gaat via de service-role key en niet via RLS**, met een expliciete
 * controle op drie dingen: de markt staat op publiek, er is een ronde aangewezen
 * om te tonen, en er is een rapport bij die ronde. Een anonieme selectpolicy op
 * `sales_market_reports` zou betekenen dat élk rapport leesbaar is zodra iemand
 * het adres raadt, ook een rapport dat nog niet gepubliceerd is of net is
 * ingetrokken. Dat is dezelfde afweging als bij de uitnodigingspagina.
 *
 * ── EN WAT ER OP DEZE PAGINA NOOIT STAAT ────────────────────────────────────
 *
 * Geen personen, geen contactgegevens, geen oordeel over een bedrijf, en geen
 * bedrijf dat om verwijdering vroeg. Die laatste regel is absoluut en zit in
 * `publiekeBedrijven()`, zodat er geen tweede plek is die hem anders uitlegt.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await leesPagina(slug);
  if (!pagina) return { title: "Marktrapport" };

  return {
    title: `${pagina.markt.label} in AI-antwoorden`,
    description:
      `Wat AI-assistenten antwoorden op vragen over ${pagina.markt.industry} in ` +
      `${pagina.markt.location}, gemeten op ${pagina.rapport.cijfers.vragen} vragen.`,
  };
}

export default async function PubliekeMarktPagina({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pagina = await leesPagina(slug);
  if (!pagina) notFound();

  const { markt, rapport } = pagina;
  const bedrijven = publiekeBedrijven(rapport.cijfers.bedrijven ?? []);
  const engines = rapport.cijfers.engines ?? [];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-12">
      <header className="flex flex-col gap-3">
        <span className="mono-label">Marktrapport</span>
        <h1 className="type-title">{markt.label} in AI-antwoorden</h1>
        <p className="text-secondary">{rapport.intro}</p>
      </header>

      <section className="card flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Hoe dit gemeten is</h2>
        <p className="text-secondary">{rapport.methode}</p>
        <p className="text-sm text-muted">
          {rapport.cijfers.vragen} vragen op{" "}
          {engines.map((e) => engineLabel(e)).join(" en ")}
          {rapport.cijfers.gemetenOp
            ? `, gemeten op ${new Date(rapport.cijfers.gemetenOp).toLocaleDateString("nl-NL")}`
            : ""}
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Wat eruit kwam</h2>
        <p className="text-secondary">{rapport.bevindingen}</p>

        <div className="card overflow-x-auto">
          <table className="w-full min-w-[24rem] text-left text-sm">
            <thead>
              <tr className="mono-label">
                <th className="py-2 pr-3 font-normal">Bedrijf</th>
                <th className="py-2 pr-3 font-normal">Genoemd bij</th>
              </tr>
            </thead>
            <tbody>
              {bedrijven.map((b) => (
                <tr key={b.companyId} className="border-t border-[var(--border-subtle)]">
                  <td className="py-2 pr-3">{b.naam}</td>
                  <td className="py-2 pr-3 text-secondary">
                    {b.vermeldingen} van de {b.vragen} vragen
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Plan hoofdstuk 20, laatste alinea: wie erafwil, gaat eraf. Dat hoort op
          de pagina zelf te staan en niet alleen in een privacyverklaring, want
          de ondernemer die dit leest is degene die het aangaat. */}
      <footer className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-6 text-sm text-muted">
        <p>
          Deze pagina zegt wat AI-assistenten antwoordden op vragen over deze markt. Het zegt niets
          over de kwaliteit van het werk van een bedrijf.
        </p>
        <p>
          Staat jouw bedrijf hier en wil je dat niet? Mail naar{" "}
          <a href="mailto:info@outerorbit.nl">info@outerorbit.nl</a> en het gaat eraf, zonder dat we
          erover in discussie gaan.
        </p>
      </footer>
    </main>
  );
}

interface Pagina {
  markt: { label: string; industry: string; location: string };
  rapport: {
    intro: string;
    methode: string;
    bevindingen: string;
    cijfers: {
      vragen?: number;
      engines?: string[];
      gemetenOp?: string | null;
      bedrijven?: RapportBedrijf[];
    };
  };
}

/**
 * De pagina ophalen, met de drie controles die haar publiek maken.
 *
 * Ontbreekt er één, dan bestaat de pagina niet. Geen foutmelding en geen
 * "binnenkort beschikbaar": een adres dat wel bestaat maar niets toont, is een
 * uitnodiging om te blijven proberen.
 */
async function leesPagina(slug: string): Promise<Pagina | null> {
  const admin = createAdminClient();

  const { data: markt } = await admin
    .from("sales_markets")
    .select("id, label, industry, location, is_public, published_run_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!markt || !markt.is_public || !markt.published_run_id) return null;

  const { data: rapport } = await admin
    .from("sales_market_reports")
    .select("intro, methode, bevindingen, cijfers")
    .eq("run_id", markt.published_run_id as string)
    .maybeSingle();

  if (!rapport) return null;

  return {
    markt: {
      label: markt.label as string,
      industry: markt.industry as string,
      location: markt.location as string,
    },
    rapport: {
      intro: (rapport.intro as string) ?? "",
      methode: (rapport.methode as string) ?? "",
      bevindingen: (rapport.bevindingen as string) ?? "",
      cijfers: (rapport.cijfers ?? {}) as Pagina["rapport"]["cijfers"],
    },
  };
}
