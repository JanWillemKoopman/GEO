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
import { Vragenlijst, type VraagRegel } from "./vragenlijst";
import { Meetuitkomst, type ScoreRegel } from "./meetuitkomst";
import { Marktacties } from "./marktacties";
import { Procesbalk } from "./procesbalk";
import { HermetingPlannen } from "./hermeting-plannen";
import { OnbekendeNamen } from "./onbekende-namen";
import { EUR_TO_USD, besteedAanMarkt, raamMeetronde } from "@/lib/sales/budget";
import { bouwFases, procesSamenvatting, loopterIets, type TaakTelling } from "@/lib/sales/proces";
import { groepeerOnbekend } from "@/lib/sales/onbekend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Intentie } from "@/lib/sales/intents";

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
 * Lezen loopt via de sessie en dus mét RLS (migratie 0068 en 0069). De poort in
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
      "id, slug, label, industry, location, radius_km, status, approved_at, conflict_note, discovery_note, failure_reason, is_public, published_run_id, remeasure_at, remeasure_note",
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

  // ── De jongste meetronde, en wat eruit kwam ─────────────────────────────
  //
  // Eén query voor de ronde, en daarna pas de vragen of de scores: welke van de
  // twee er nodig is, hangt af van de stand van die ronde. Beide altijd ophalen
  // zou bij een markt van dertig bedrijven maal veertig vragen maal twee engines
  // een paar duizend rijen kosten voor een scherm dat er de helft van toont.
  const { data: runRijen } = await supabase
    .from("sales_runs")
    .select("id, round_no, status, engines, question_count, estimate_usd, intents_json, notes, approved_at")
    .eq("market_id", id)
    .order("round_no", { ascending: false })
    .limit(1);

  const run = (runRijen ?? [])[0] as
    | {
        id: string;
        round_no: number;
        status: string;
        engines: string[] | null;
        question_count: number;
        estimate_usd: number | null;
        intents_json: { intenties?: Intentie[]; kanttekening?: string } | null;
        notes: string | null;
        approved_at: string | null;
      }
    | undefined;

  let vragen: VraagRegel[] = [];
  let scores: ScoreRegel[] = [];
  let onbekendeNamen: string[] = [];
  let heeftRapport = false;

  if (run?.status === "vragen_klaar") {
    const { data } = await supabase
      .from("sales_questions")
      .select("id, text, intent_label, intent_stage, weight, active")
      .eq("run_id", run.id)
      .order("position");

    const namen = new Map(
      (run.intents_json?.intenties ?? []).map((i) => [i.label, i.naam] as const),
    );

    vragen = ((data ?? []) as Record<string, unknown>[]).map((v) => ({
      id: v.id as string,
      tekst: v.text as string,
      intentLabel: v.intent_label as string,
      // Valt de naam weg, dan is het etiket zelf nog altijd leesbaarder dan een
      // lege kop. Conventie 3: onbekend is een betere waarde dan een verkeerde.
      intentNaam: namen.get(v.intent_label as string) ?? (v.intent_label as string),
      fase: v.intent_stage as string,
      gewicht: Number(v.weight ?? 0),
      actief: v.active !== false,
    }));
  }

  if (run?.status === "klaar") {
    const { data: rapport } = await supabase
      .from("sales_market_reports")
      .select("id")
      .eq("run_id", run.id)
      .maybeSingle();
    heeftRapport = Boolean(rapport);
  }

  if (run && (run.status === "klaar" || run.status === "meet")) {
    const [{ data: scoreRijen }, { data: antwoordRijen }] = await Promise.all([
      supabase
        .from("sales_company_scores")
        .select("company_id, engine, questions_total, mentions, share, weighted_share, stderr")
        .eq("run_id", run.id),
      supabase.from("sales_answers").select("unknown_names").eq("run_id", run.id),
    ]);

    const naamPerBedrijf = new Map(bedrijven.map((b) => [b.companyId, b.naam] as const));

    scores = ((scoreRijen ?? []) as Record<string, unknown>[]).map((s) => ({
      companyId: s.company_id as string,
      naam: naamPerBedrijf.get(s.company_id as string) ?? "Onbekend bedrijf",
      engine: s.engine as string,
      vragen: Number(s.questions_total ?? 0),
      vermeldingen: Number(s.mentions ?? 0),
      share: Number(s.share ?? 0),
      weightedShare: Number(s.weighted_share ?? 0),
      stderr: Number(s.stderr ?? 0),
    }));

    // ⚠️ NIET ontdubbeld: hoe vaak een naam genoemd is, is het signaal.
    // `groepeerOnbekend()` telt en sorteert, en zet fabrikanten en platforms
    // apart. Feenstra werd drie keer genoemd en verdween tussen de rest.
    onbekendeNamen = ((antwoordRijen ?? []) as { unknown_names: string[] | null }[]).flatMap(
      (a) => a.unknown_names ?? [],
    );
  }

  // ── Wat er op dit moment draait ─────────────────────────────────────────
  //
  // De taken staan in `jobs`, en die tabel heeft nul leesregels: hij is alleen
  // via de service-role te lezen (migratie 0013). Dat is hier geen omweg maar
  // precies de bedoeling: een klant hoort nooit te kunnen zien welke taken er
  // draaien, en dit scherm zit al achter de salespoort in de layout.
  const service = createAdminClient();
  const [{ data: taakRijen }, kostenUsd] = await Promise.all([
    service.from("jobs").select("type, status").eq("sales_market_id", id).limit(2000),
    besteedAanMarkt(service, id),
  ]);

  const taken: Record<string, TaakTelling> = {};
  for (const rij of (taakRijen ?? []) as { type: string; status: string }[]) {
    const t = (taken[rij.type] ??= { wachtend: 0, bezig: 0, klaar: 0, mislukt: 0 });
    if (rij.status === "queued") t.wachtend++;
    else if (rij.status === "running") t.bezig++;
    else if (rij.status === "done") t.klaar++;
    else if (rij.status === "failed") t.mislukt++;
  }

  const kansenTotaal = scores.length > 0 || run?.status === "klaar" ? await telKansen(service, id) : null;
  const antwoordenTeller =
    run && (run.status === "meet" || run.status === "klaar")
      ? await telAntwoorden(service, run.id)
      : 0;

  const fases = bouwFases({
    marktStatus: markt.status as string,
    rondeStatus: run?.status ?? null,
    rondeNr: run?.round_no ?? 1,
    bedrijvenGevonden: bedrijven.length,
    bedrijvenMee: bedrijven.filter((b) => b.included !== false).length,
    bedrijvenOnbeoordeeld: bedrijven.filter((b) => b.included === null).length,
    crawlKlaar: bedrijven.filter((b) => b.crawlStatus === "gelukt").length,
    crawlMislukt: bedrijven.filter((b) => b.crawlStatus === "niet_gelukt").length,
    vragen: run?.question_count ?? 0,
    antwoorden: antwoordenTeller,
    antwoordenVerwacht:
      (run?.question_count ?? 0) * Math.max(1, (run?.engines ?? []).filter((e) => e !== "alle").length),
    kansen: kansenTotaal?.totaal ?? 0,
    kansenGeschreven: kansenTotaal?.geschreven ?? 0,
    taken,
    isPublic: Boolean(markt.is_public),
    heeftRapport,
  });

  const status = markt.status as string;
  const fase = marktFase({ status, approved_at: markt.approved_at as string | null });
  const magStarten = admin && isMarktStand(status) && status === "concept";
  const magGoedkeuren = admin && status === "wacht_op_goedkeuring" && !markt.approved_at;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={fase.label}
        title={markt.label as string}
        description={`${markt.industry as string} in ${markt.location as string}, ${markt.radius_km as number} km eromheen. ${fase.uitleg}`}
      />

      {/* Wat er nu gebeurt, en waar het op wacht. Bovenaan, want dat is de
          vraag waarmee iemand dit scherm opent. */}
      <Procesbalk
        fases={fases}
        samenvatting={procesSamenvatting(fases)}
        actief={loopterIets(fases)}
        kostenUsd={kostenUsd}
        ronde={run?.round_no ?? 1}
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

      {run?.status === "vragen_klaar" && vragen.length > 0 && (
        <Vragenlijst
          marketId={id}
          vragen={vragen}
          ramingEur={Number((((run.estimate_usd ?? 0) as number) / EUR_TO_USD).toFixed(2))}
          engines={run.engines ?? []}
          kanttekening={
            [run.intents_json?.kanttekening, run.notes].filter(Boolean).join(" ") || null
          }
          magGoedkeuren={Boolean(admin)}
        />
      )}

      {run?.status === "klaar" && (
        <div className="flex flex-col gap-4">
          <Marktacties
            marketId={id}
            slug={markt.slug as string}
            isPublic={Boolean(markt.is_public)}
            heeftRapport={heeftRapport}
            magHermeten={Boolean(admin)}
          />
          {admin && (
            <div className="card">
              <HermetingPlannen
                marketId={id}
                gepland={
                  markt.remeasure_at ? (markt.remeasure_at as string).slice(0, 10) : null
                }
                notitie={(markt.remeasure_note as string | null) ?? null}
                ramingEur={Number(
                  (
                    raamMeetronde(
                      run.question_count ?? 0,
                      Math.max(1, (run.engines ?? []).filter((e) => e !== "alle").length),
                    ) / EUR_TO_USD
                  ).toFixed(2),
                )}
              />
            </div>
          )}
        </div>
      )}

      {scores.length > 0 && (
        <Meetuitkomst
          scores={scores}
          engines={(run?.engines ?? []).filter((e) => e !== "alle")}
          notitie={run?.notes ?? null}
          onbekendeNamen={[]}
        />
      )}

      {/* Apart van de meetuitkomst, want hier valt iets te DOEN: een gemist
          bedrijf alsnog meenemen. */}
      <OnbekendeNamen marketId={id} namen={groepeerOnbekend(onbekendeNamen)} />

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

/** Hoeveel kansen heeft deze markt, en hoeveel daarvan hebben een geschreven reden? */
async function telKansen(
  service: ReturnType<typeof createAdminClient>,
  marketId: string,
): Promise<{ totaal: number; geschreven: number }> {
  const { data } = await service
    .from("sales_opportunities")
    .select("hook_source")
    .eq("market_id", marketId)
    .is("superseded_by", null);

  const rijen = (data ?? []) as { hook_source: string | null }[];
  return {
    totaal: rijen.length,
    geschreven: rijen.filter((r) => r.hook_source === "model").length,
  };
}

/** Hoeveel antwoorden zijn er al binnen voor deze ronde? */
async function telAntwoorden(
  service: ReturnType<typeof createAdminClient>,
  runId: string,
): Promise<number> {
  const { count } = await service
    .from("sales_answers")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId);
  return count ?? 0;
}
