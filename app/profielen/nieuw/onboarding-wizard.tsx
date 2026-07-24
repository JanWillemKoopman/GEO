"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TagListEditor } from "@/components/tag-list-editor";

/**
 * Onboarding-wizard voor een nieuw klantprofiel (abcplan.md §12.24). Begeleide,
 * uitgebreide intake; alleen stap 1 (naam + website) is verplicht. Wat de klant
 * invult is leidend — de AI-research vult daarna aan. De extra velden (aliassen,
 * bereik/regio's, markt, klantvragen) worden ook doorgevoerd in de meting en
 * promptgeneratie.
 */

interface FormState {
  name: string;
  url: string;
  aliases: string[];
  intake_description: string;
  industry: string;
  products: string[];
  value_props: string[];
  service_scope: string;
  service_regions: string[];
  market_language: string;
  competitors: string[];
  intake_audience: string;
  tone_of_voice: string;
  customer_questions: string[];
  sitemap_url: string;
}

const STEP_TITLES = ["Bedrijf", "Wat je doet", "Markt & concurrentie", "Doelgroep & stijl", "Kennis & techniek"];
const SCOPES = [
  { value: "lokaal", label: "Lokaal" },
  { value: "landelijk", label: "Landelijk" },
  { value: "internationaal", label: "Internationaal" },
];
const MARKETS = ["Nederland", "Nederland + België", "Internationaal"];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    name: "",
    url: "",
    aliases: [],
    intake_description: "",
    industry: "",
    products: [],
    value_props: [],
    service_scope: "",
    service_regions: [],
    market_language: "",
    competitors: [],
    intake_audience: "",
    tone_of_voice: "",
    customer_questions: [],
    sitemap_url: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isLast = step === STEP_TITLES.length - 1;
  const canProceed = step > 0 || (form.name.trim() !== "" && form.url.trim() !== "");

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Er ging iets mis.");
        setPending(false);
        return;
      }
      router.push(`/profielen/${json.id}`);
    } catch {
      setError("Er ging iets mis. Controleer je verbinding en probeer opnieuw.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/profielen" className="mono-label transition-colors hover:text-[var(--text-primary)]">
          ← Terug naar Klantprofielen
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Nieuw klantprofiel</h1>
        <p className="mt-2 text-secondary">
          Vertel ons over het merk. Wat je zelf invult houden we aan; de rest zoeken we daarna
          automatisch voor je uit. Alleen bedrijfsnaam en website zijn verplicht — de rest mag je
          overslaan.
        </p>
      </div>

      {/* Voortgang */}
      <div className="flex flex-col gap-2">
        <span className="mono-label">
          Stap {step + 1} van {STEP_TITLES.length} — {STEP_TITLES[step]}
        </span>
        <div className="flex gap-1.5">
          {STEP_TITLES.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: i <= step ? "var(--accent-purple, #8511d9)" : "var(--border-subtle)" }}
            />
          ))}
        </div>
      </div>

      <div className="card flex flex-col gap-5">
        {step === 0 && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="mono-label">Bedrijfsnaam *</span>
              <input
                className="field"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="bijv. MediaMarkt"
                autoFocus
              />
              <span className="text-sm text-muted">De naam zoals klanten je kennen (niet het domein).</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="mono-label">Website *</span>
              <input
                className="field"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="mediamarkt.nl"
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="mono-label">Andere namen / schrijfwijzen</span>
              <TagListEditor
                items={form.aliases}
                onChange={(aliases) => set("aliases", aliases)}
                placeholder="bijv. afkorting of merknaam-variant…"
              />
              <span className="text-sm text-muted">
                Hoe wordt het merk nog meer genoemd? Dit maakt de meting nauwkeuriger.
              </span>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="mono-label">Korte omschrijving van het bedrijf</span>
              <textarea
                className="field"
                rows={4}
                value={form.intake_description}
                onChange={(e) => set("intake_description", e.target.value)}
                placeholder="Wat doen jullie, en wat maakt jullie uniek?"
                autoFocus
              />
              <span className="text-sm text-muted">Hoe meer context, hoe beter de AI het profiel invult.</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="mono-label">Branche</span>
              <input
                className="field"
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
                placeholder="bijv. consumentenelektronica"
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="mono-label">Belangrijkste producten / diensten</span>
              <TagListEditor
                items={form.products}
                onChange={(products) => set("products", products)}
                placeholder="Nieuw product…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="mono-label">Waarom kiezen klanten voor jou? (waardeproposities)</span>
              <TagListEditor
                items={form.value_props}
                onChange={(value_props) => set("value_props", value_props)}
                placeholder="Nieuwe reden…"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="mono-label">Bereik</span>
              <div className="flex flex-wrap gap-2">
                {SCOPES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set("service_scope", form.service_scope === s.value ? "" : s.value)}
                    className={form.service_scope === s.value ? "btn-primary" : "btn-outline"}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {form.service_scope === "lokaal" && (
              <div className="flex flex-col gap-1.5">
                <span className="mono-label">Plaatsen / regio&apos;s</span>
                <TagListEditor
                  items={form.service_regions}
                  onChange={(service_regions) => set("service_regions", service_regions)}
                  placeholder="bijv. Utrecht…"
                />
                <span className="text-sm text-muted">Gebruiken we voor lokale zoekvragen in de meting.</span>
              </div>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="mono-label">Markt &amp; taal</span>
              <select
                className="field"
                value={form.market_language}
                onChange={(e) => set("market_language", e.target.value)}
              >
                <option value="">— Kies (optioneel) —</option>
                {MARKETS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="mono-label">Bekende concurrenten</span>
              <TagListEditor
                items={form.competitors}
                onChange={(competitors) => set("competitors", competitors)}
                placeholder="Nieuwe concurrent…"
              />
              <span className="text-sm text-muted">De AI vult deze lijst aan tot 3–5 relevante concurrenten.</span>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="mono-label">Doelgroep</span>
              <textarea
                className="field"
                rows={3}
                value={form.intake_audience}
                onChange={(e) => set("intake_audience", e.target.value)}
                placeholder="Wie zijn jullie klanten? (bijv. B2C, particulieren in de regio)"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="mono-label">Gewenste tone of voice</span>
              <input
                className="field"
                value={form.tone_of_voice}
                onChange={(e) => set("tone_of_voice", e.target.value)}
                placeholder="bijv. toegankelijk, deskundig, informeel"
              />
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="mono-label">Veelgehoorde klantvragen</span>
              <TagListEditor
                items={form.customer_questions}
                onChange={(customer_questions) => set("customer_questions", customer_questions)}
                placeholder="bijv. 'Kan ik zonder afspraak langskomen?'"
              />
              <span className="text-sm text-muted">Vragen die klanten je vaak stellen — helpen bij content.</span>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="mono-label">Sitemap-URL (optioneel)</span>
              <input
                className="field"
                value={form.sitemap_url}
                onChange={(e) => set("sitemap_url", e.target.value)}
                placeholder="https://voorbeeld.nl/sitemap.xml"
              />
              <span className="text-sm text-muted">
                Weet je de sitemap-locatie? Vul die in voor een completere content-inventaris.
              </span>
            </label>
          </>
        )}

        {error && (
          <p className="text-sm text-[var(--status-error)]" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || pending}
            className="btn-outline disabled:opacity-40"
          >
            Terug
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={pending || !canProceed}
              className="btn-primary disabled:opacity-60"
            >
              {pending ? "Profiel aanmaken…" : "Profiel aanmaken"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed}
              className="btn-primary disabled:opacity-60"
            >
              Volgende
            </button>
          )}
        </div>
      </div>

      {!isLast && (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={pending || !canProceed}
          className="mono-label self-center transition-colors hover:text-[var(--text-primary)] disabled:opacity-40"
        >
          Overslaan en direct aanmaken →
        </button>
      )}
    </div>
  );
}
