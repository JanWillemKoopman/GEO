import { notFound } from "next/navigation";
import { getProfile } from "@/lib/profiles";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { CollapsibleSection } from "@/components/collapsible-section";
import { LastUpdated } from "@/components/last-updated";
import { ONBOARDING_TAKEN, doorlooptijden, ADMIN_SECTIES } from "@/lib/onboarding-insight";
import { TAAK_TEKST } from "@/lib/activity";
import type { JobType } from "@/lib/jobs/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Diagnose" };

/**
 * DIAGNOSE: wat er technisch gebeurde, alleen voor jou.
 *
 * ── ⚠️ DIT SCHERM WORDT NIET GEDEELD ────────────────────────────────────────
 *
 * Sinds onboarding 3.0 (19 augustus 2026) is de scheiding scherp en zonder
 * overlap: de ONBOARDINGSESSIE (`admin/onboarding`) is het werk mét de klant en
 * is het enige stafscherm dat gedeeld wordt; dit scherm is techniek. Welke taken
 * draaiden, hoe lang, wat er faalde, wat het kostte.
 *
 * Daarom zijn de volledigheidsmeter en het gespreksblok hier weg: dat is werk en
 * geen diagnose, en ze staan nu op de sessie. Het scherm heette hiervoor
 * "Onboarding-inzicht", en dat leek te veel op "Onboardingsessie" om tijdens een
 * gedeeld scherm nog uit elkaar te houden.
 *
 * ── ⚠️ EEN 404 EN GEEN 403 ──────────────────────────────────────────────────
 *
 * Een 403 bevestigt dat het scherm bestaat, en dat is precies wat een klant niet
 * hoort te weten. Zelfde patroon als `app/(app)/beheer/page.tsx`.
 *
 * ── WAAROM DIT SCHERM ER IS ─────────────────────────────────────────────────
 *
 * Besluit 4 van 17 augustus 2026: de klant ziet wat ORBIT ENGINE weet en hoe
 * zeker dat is, niet hoe ORBIT ENGINE eraan kwam. Alles wat daarbuiten valt
 * stond verspreid over de klantschermen, weggevouwen maar bereikbaar. Wegvouwen
 * is niet afschermen: de klant kan het dan nog steeds tegenkomen, en dan zit je
 * in een demo een ruwe modeloutput uit te leggen.
 *
 * ── DE INDELING IS DIE VAN DE KLANT ZELF ────────────────────────────────────
 *
 * De negen secties bovenaan (Bedrijf, Contact, Talen, Positionering, Doelgroep,
 * Stem, Woorden, Auteur, Onderwerpen) staan in dezelfde volgorde als Nova ze
 * aan zijn klant toont. In een demo weet je daardoor precies welk scherm de
 * klant voor zich heeft, met de ruwe laag eronder.
 */
export default async function AdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const user = await requireUser();
  if (!(await isStaff(user.id))) notFound();

  const admin = createAdminClient();
  const [
    { data: jobRijen },
    { data: facetRijen },
    { data: auditRij },
    { data: kostenRijen },
    { data: bronRijen },
    { data: onderzoekRijen },
    { data: clusterRijen },
  ] = await Promise.all([
    admin
      .from("jobs")
      .select("type, status, started_at, finished_at, attempts, last_error")
      .eq("profile_id", id)
      .order("created_at"),
    admin.from("profile_facets").select("facet, raw_json, confidence, model_used, researched_at").eq("profile_id", id),
    admin
      .from("technical_audits")
      .select("raw_json, checked_at")
      .eq("profile_id", id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("ai_calls")
      .select("kind, model, input_tokens, output_tokens, cost_usd, web_search, created_at")
      .eq("profile_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("profile_field_sources")
      .select("field, source, confidence, evidence_url, evidence_quote")
      .eq("profile_id", id)
      .order("field"),
    admin.from("analyses").select("id, name").eq("profile_id", id),
    admin.from("profile_topics").select("id").eq("profile_id", id),
  ]);

  const taken = (jobRijen ?? []) as {
    type: string;
    status: string;
    started_at: string | null;
    finished_at: string | null;
    attempts: number;
    last_error: string | null;
  }[];
  const tijden = doorlooptijden(taken);

  const kosten = (kostenRijen ?? []) as {
    kind: string;
    model: string;
    input_tokens: number | null;
    output_tokens: number | null;
    cost_usd: number | null;
    web_search: boolean;
    created_at: string;
  }[];
  const totaalKosten = kosten.reduce((s, k) => s + (k.cost_usd ?? 0), 0);

  const facetten = (facetRijen ?? []) as {
    facet: string;
    raw_json: unknown;
    confidence: number | null;
    model_used: string | null;
    researched_at: string;
  }[];

  const bronnen = (bronRijen ?? []) as {
    field: string;
    source: string;
    confidence: number | null;
    evidence_url: string | null;
    evidence_quote: string | null;
  }[];

  // Het onderwerp-onderzoek hangt aan een cluster, niet aan het merk. Zonder
  // clusters is er niets op te halen.
  const clusters = ((onderzoekRijen ?? []) as { id: string; name: string }[]) ?? [];
  let onderzoek: { naam: string; samenvatting: string | null; concurrenten: string[] }[] = [];
  if (clusters.length > 0) {
    const { data: trRijen } = await admin
      .from("topic_research")
      .select("analysis_id, content_summary, competitors")
      .in(
        "analysis_id",
        clusters.map((c) => c.id),
      );
    const naamVan = new Map(clusters.map((c) => [c.id, c.name]));
    onderzoek = ((trRijen ?? []) as {
      analysis_id: string;
      content_summary: string | null;
      competitors: string[];
    }[]).map((r) => ({
      naam: naamVan.get(r.analysis_id) ?? "Onbekend cluster",
      samenvatting: r.content_summary,
      concurrenten: r.competitors ?? [],
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin · alleen jij"
        title="Diagnose"
        backHref={`/merk/${id}`}
        backLabel="Overzicht"
        description="Wat er technisch gebeurde: welke taken draaiden, hoe lang, wat er faalde en wat het kostte. De klant ziet dit scherm niet en kan het adres niet raden: hij krijgt een 404. Het werk mét de klant staat op Onboarding."
      />

      {/* ── De negen secties die de klant zelf ziet ─────────────────────────
          In zijn volgorde, zodat je in een demo weet welk scherm hij voor zich
          heeft. Puur een inhoudsopgave: elke regel wijst naar het klantscherm. */}
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Wat de klant ziet, in zijn volgorde</span>
        <ol className="flex flex-wrap gap-2">
          {ADMIN_SECTIES.map((s, i) => (
            <li key={s.naam} className="chip">
              <span className="text-muted">{String(i + 1).padStart(2, "0")}</span> {s.naam}
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">
          Deze volgorde is die van Nova en die van ons merkdossier. Alles hieronder ziet de klant
          níet.
        </p>
      </div>

      {/* ── 2. De onboardingtaken ────────────────────────────────────────── */}
      <CollapsibleSection title={`De onboardingtaken (${tijden.length} van de ${ONBOARDING_TAKEN.length})`}>
        {tijden.length === 0 ? (
          <p className="text-secondary">Er staan nog geen taken voor dit merk.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tijden.map((t) => (
              <li key={t.type} className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  <span className="font-medium">{TAAK_TEKST[t.type as JobType] ?? t.type}</span>{" "}
                  <span className="mono-label">{t.type}</span>
                </span>
                <span className="flex items-baseline gap-3">
                  {t.pogingen > 1 && (
                    <span className="chip chip-warning">poging {t.pogingen}</span>
                  )}
                  <span
                    className={
                      t.status === "done"
                        ? "chip chip-success"
                        : t.status === "error"
                          ? "chip chip-danger"
                          : "chip chip-neutral"
                    }
                  >
                    {t.status}
                  </span>
                  <span className="stat-value text-sm">
                    {t.secondenr === null ? "-" : `${t.secondenr}s`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      {/* ── 3. Ruwe modeloutput per stap ─────────────────────────────────── */}
      <CollapsibleSection title={`Ruwe modeloutput per stap (${facetten.length})`}>
        {facetten.length === 0 && !auditRij ? (
          <p className="text-secondary">Er is nog geen modeloutput opgeslagen.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {facetten.map((f) => (
              <div key={f.facet} className="flex flex-col gap-1">
                <span className="mono-label">
                  {f.facet} · {f.model_used ?? "onbekend model"} ·{" "}
                  <LastUpdated at={f.researched_at} className="" />
                  {f.confidence !== null && ` · zekerheid ${f.confidence}`}
                </span>
                <Json waarde={f.raw_json} />
              </div>
            ))}
            {auditRij && (
              <div className="flex flex-col gap-1">
                <span className="mono-label">technische audit</span>
                <Json waarde={(auditRij as { raw_json: unknown }).raw_json} />
              </div>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* ── 4. Kostenlogboek ─────────────────────────────────────────────── */}
      <CollapsibleSection
        title={`Kostenlogboek (${kosten.length} aanroepen, $${totaalKosten.toFixed(3)})`}
      >
        {kosten.length === 0 ? (
          <p className="text-secondary">Er zijn nog geen AI-aanroepen voor dit merk.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="py-1 pr-4 font-normal">Stap</th>
                  <th className="py-1 pr-4 font-normal">Model</th>
                  <th className="py-1 pr-4 font-normal">Tokens</th>
                  <th className="py-1 pr-4 font-normal">Zoeken</th>
                  <th className="py-1 font-normal">Kosten</th>
                </tr>
              </thead>
              <tbody>
                {kosten.map((k, i) => (
                  <tr key={i} className="border-t border-[var(--border-subtle)]">
                    <td className="py-1 pr-4">{k.kind}</td>
                    <td className="py-1 pr-4 mono-label">{k.model}</td>
                    <td className="py-1 pr-4 stat-value">
                      {(k.input_tokens ?? 0) + (k.output_tokens ?? 0)}
                    </td>
                    <td className="py-1 pr-4">{k.web_search ? "ja" : "nee"}</td>
                    <td className="py-1 stat-value">
                      {k.cost_usd === null ? "-" : `$${k.cost_usd.toFixed(4)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* ── 5. Herkomst per veld ─────────────────────────────────────────── */}
      <CollapsibleSection title={`Herkomst per veld (${bronnen.length})`}>
        {bronnen.length === 0 ? (
          <p className="text-secondary">Nog geen herkomst vastgelegd.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bronnen.map((b) => (
              <li key={b.field} className="flex flex-col gap-0.5">
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="mono-label">{b.field}</span>
                  <span className="chip">{b.source}</span>
                  {b.confidence !== null && (
                    <span className="mono-label text-muted">zekerheid {b.confidence}</span>
                  )}
                </span>
                {b.evidence_quote && (
                  <span className="text-sm text-secondary">&ldquo;{b.evidence_quote}&rdquo;</span>
                )}
                {b.evidence_url && (
                  <span className="mono-label break-url text-muted">{b.evidence_url}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      {/* ── 6. Bronnenonderzoek ──────────────────────────────────────────── */}
      <CollapsibleSection title={`Bronnenonderzoek (${onderzoek.length})`}>
        {onderzoek.length === 0 ? (
          <p className="text-secondary">Nog geen onderwerp-onderzoek voor dit merk.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {onderzoek.map((o) => (
              <li key={o.naam} className="flex flex-col gap-1">
                <span className="mono-label">{o.naam}</span>
                {o.samenvatting && <p className="text-sm text-secondary">{o.samenvatting}</p>}
                {o.concurrenten.length > 0 && (
                  <span className="mono-label text-muted">
                    concurrenten: {o.concurrenten.join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

    </div>
  );
}

/**
 * Ruwe JSON, ingeklapt en met een scrollbaan.
 *
 * ⚠️ `overflow-x: auto` is hier geen sier: een `raw_json` van een
 * onderzoeksstap bevat regels van honderden tekens zonder spatie, en die duwen
 * anders de hele pagina breder dan het scherm (`docs/ux-design.md` §7).
 */
function Json({ waarde }: { waarde: unknown }) {
  return (
    <pre
      className="max-h-64 overflow-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-xs"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {JSON.stringify(waarde, null, 2)}
    </pre>
  );
}
