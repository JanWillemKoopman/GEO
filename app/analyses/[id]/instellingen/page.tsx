import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { PROMPT_CATEGORIES } from "@/lib/types/database";
import type { BrandDna, Prompt, Persona } from "@/lib/types/database";

/**
 * Instellingen = het concept-/review-scherm (abcplan.md §3.6). In Sprint 2B tonen
 * we het gegenereerde Brand DNA + de prompts READ-ONLY. Volledige CRUD + de knop
 * "Bevestig en start meting" (de review-gate) komen in Sprint 3.
 */
export default async function InstellingenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const supabase = await createClient();
  const [{ data: dnaRow }, { data: promptRows }] = await Promise.all([
    supabase.from("brand_dna").select("*").eq("analysis_id", id).maybeSingle(),
    supabase.from("prompts").select("*").eq("analysis_id", id).order("category"),
  ]);

  const dna = dnaRow as BrandDna | null;
  const prompts = (promptRows ?? []) as Prompt[];

  // Prompts groeperen per categorie (bekende categorieën eerst, dan de rest).
  const knownOrder = [...PROMPT_CATEGORIES] as string[];
  const categories = Array.from(new Set(prompts.map((p) => p.category))).sort(
    (a, b) => (knownOrder.indexOf(a) + 1 || 99) - (knownOrder.indexOf(b) + 1 || 99),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Basisgegevens (read-only, niet wijzigbaar na start — §3.3) */}
      <div className="card flex flex-col gap-3">
        <span className="mono-label">Analyse</span>
        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
          <span className="text-secondary">Website</span>
          <span className="font-medium">{analysis.url}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-secondary">Onderwerp</span>
          <span className="font-medium">{analysis.topic ?? "Hele website"}</span>
        </div>
      </div>

      {/* Brand DNA */}
      {dna ? (
        <div className="card flex flex-col gap-5">
          <span className="mono-label">Brand DNA</span>

          {dna.summary && <p className="text-secondary">{dna.summary}</p>}

          <Field label="Branche" value={dna.industry} />
          <Field label="Tone of voice" value={dna.tone_of_voice} />
          <ChipList label="Producten / diensten" items={dna.products} />
          <ChipList label="Waardeproposities" items={dna.value_props} />
          <ChipList label="Concurrenten" items={dna.competitors} tone="green" />

          {dna.personas?.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="mono-label">Persona&apos;s</span>
              <div className="flex flex-col gap-2">
                {(dna.personas as Persona[]).map((p, i) => (
                  <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
                    <p className="font-medium">{p.name}</p>
                    {p.needs?.length > 0 && (
                      <p className="mt-1 text-sm text-secondary">{p.needs.join(" · ")}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <p className="text-secondary">Brand DNA wordt nog voorbereid…</p>
        </div>
      )}

      {/* Prompts */}
      {prompts.length > 0 && (
        <div className="card flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="mono-label">Prompts</span>
            <span className="mono-label">{prompts.length} totaal</span>
          </div>
          {categories.map((cat) => {
            const items = prompts.filter((p) => p.category === cat);
            return (
              <div key={cat} className="flex flex-col gap-2">
                <span className="chip w-fit">{cat}</span>
                <ul className="flex flex-col gap-2">
                  {items.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm"
                    >
                      {p.text}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Sprint 3 vooruitblik */}
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Volgende stap</span>
        <p className="text-secondary">
          Binnenkort kun je hier het Brand DNA en de prompts <strong>bewerken</strong> en met de
          knop <span className="font-medium text-[var(--text-primary)]">&quot;Bevestig en start meting&quot;</span>{" "}
          de meting starten. Nu is dit een leesbare weergave van wat het systeem heeft afgeleid.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="mono-label">{label}</span>
      <span className="text-secondary">{value}</span>
    </div>
  );
}

function ChipList({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[] | null;
  tone?: "green";
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="mono-label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <span key={i} className={tone === "green" ? "chip chip-green" : "chip"}>
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}
