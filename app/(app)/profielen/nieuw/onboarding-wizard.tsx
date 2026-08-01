"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TagListEditor } from "@/components/tag-list-editor";
import { checkUrlFormat } from "@/lib/url";

/**
 * Onboarding voor een nieuw merk (abcplan.md §12.24).
 *
 * ── WAARDE VÓÓR INSPANNING (optimalisatie.md bijlage A9) ────────────────────
 *
 * Dit was een wizard van vijf stappen vóórdat de klant iets terugzag, met als
 * uitweg een onopvallend grijs regeltje onderaan ("Overslaan en direct
 * aanmaken"). Dat is de verkeerde volgorde: je vraagt iemand om tien minuten
 * werk voordat hij weet of dit product iets voor hem is.
 *
 * Nu is het omgedraaid. Naam en website, en dan meteen beginnen — dat is genoeg
 * om het onderzoek te starten. De extra vragen zijn een GELIJKWAARDIGE knop
 * ernaast, geen grijze uitweg, en de rest vragen we later op het moment dat
 * duidelijk is waarom het helpt (zie `ProfileGaps` op de profielpagina).
 *
 * Wat de klant zelf invult blijft leidend; de AI-research vult alleen aan.
 *
 * ── VERPLICHT ZODRA JE VOOR "MEER VERTELLEN" KIEST ──────────────────────────
 * Kiest de klant voor de snelle start (alleen naam + website), dan blijft
 * alles hierboven van kracht: de uitgebreide vragen worden overgeslagen. Kiest
 * hij bewust voor "Eerst meer vertellen", dan voelde het invullen daarna te
 * vrijblijvend aan — terwijl juist deze velden de kwaliteit van de meting en
 * gegenereerde content grotendeels bepalen. Vandaar: per stap een expliciete
 * verplicht/optioneel-markering (isStepValid hieronder), geen tussentijdse
 * "sla de rest maar over"-knop meer, en niet vooruit kunnen zonder de
 * verplichte velden van de huidige stap.
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
  sitemap_url: string;
}

// Vier stappen, niet vijf. De laatste stap bevatte één optioneel veld
// (sitemap-URL) met een volledige stap, terug/volgende-knop en een kwart
// voortgangsbalk eromheen. Dat veld staat nu onderaan stap 4.
const STEP_TITLES = ["Bedrijf", "Wat je doet", "Markt & concurrentie", "Doelgroep, stijl & techniek"];
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
    sitemap_url: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [urlTouched, setUrlTouched] = useState(false);

  // ── Wat er vóór de hydratie getypt is, overnemen ──────────────────────────
  //
  // De server rendert dit formulier als HTML; React neemt het pas over zodra de
  // JS-bundel geladen én uitgevoerd is. In dat gat is het veld gewoon te
  // gebruiken — en het naamveld heeft `autoFocus`, dus het NODIGT UIT om er
  // meteen in te typen. Wie dat deed, zag zijn invoer bij de eerste re-render
  // spoorloos verdwijnen: de controlled input schreef de lege React-state terug
  // over de DOM-waarde heen. Gemeten op 1 augustus 2026 tegen productie: naam
  // én webadres, allebei leeg, zonder enige melding.
  //
  // Eén effect bij het aankoppelen, dus dit draait vóór de eerste re-render die
  // de waarde zou wissen. Alleen niet-lege velden overnemen — anders zou dit
  // een waarde die React al kent kunnen leegmaken.
  const nameRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const name = nameRef.current?.value ?? "";
    const url = urlRef.current?.value ?? "";
    if (!name && !url) return;
    setForm((f) => ({ ...f, name: name || f.name, url: url || f.url }));
  }, []);
  // Server meldde "site onbereikbaar": we tonen de waarschuwing én de
  // mogelijkheid om toch door te gaan (optimalisatie.md 0.12).
  const [canForce, setCanForce] = useState(false);
  const [pending, setPending] = useState(false);

  const isLast = step === STEP_TITLES.length - 1;

  // Webadres controleren op het formulier zelf (optimalisatie.md 0.12). Pas
  // tonen zodra het veld verlaten is: meetypen met een foutmelding onder je
  // vingers is vervelend, en het adres is halverwege nooit geldig.
  const urlCheck = checkUrlFormat(form.url);
  const showUrlError = urlTouched && form.url.trim() !== "" && !urlCheck.ok;

  // Per stap: welke velden zijn verplicht om verder te mogen? Alleen de
  // velden die de kwaliteit van meting/content het meest bepalen — de rest
  // (aliassen, bereik/regio's, markt & taal, sitemap) blijft optioneel.
  function isStepValid(s: number): boolean {
    switch (s) {
      case 0:
        return form.name.trim() !== "" && form.url.trim() !== "" && urlCheck.ok;
      case 1:
        return (
          form.intake_description.trim() !== "" &&
          form.industry.trim() !== "" &&
          form.products.length > 0
        );
      case 2:
        return form.competitors.length > 0;
      case 3:
        return form.intake_audience.trim() !== "" && form.tone_of_voice.trim() !== "";
      default:
        return true;
    }
  }

  const canProceed = isStepValid(step);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(force = false) {
    // Ook de overslaan-route loopt hierlangs: een ongeldig adres mag nergens door.
    if (!urlCheck.ok) {
      setUrlTouched(true);
      setStep(0);
      setError(urlCheck.message ?? "Controleer het webadres.");
      return;
    }
    setError(null);
    setCanForce(false);
    setPending(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, force }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Er ging iets mis.");
        setCanForce(Boolean(json.canForce));
        // Fout op het webadres? Terug naar stap 1, waar dat veld staat — anders
        // leest de klant een melding over een veld dat hij niet ziet.
        if (json.field === "url") {
          setStep(0);
          setUrlTouched(true);
        }
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
          ← Merken
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Nieuw merk</h1>
        <p className="mt-2 text-secondary">
          {step === 0
            ? "Twee velden en we gaan aan de slag. We zoeken zelf uit wat je aanbiedt, wie je concurrenten zijn en hoe zichtbaar je bent in AI-assistenten."
            : "Wat je hier invult houden we aan; de AI vult alleen aan wat je openlaat. Velden met een * zijn verplicht — ze bepalen grotendeels de kwaliteit van de meting en de content. De rest is optioneel en kun je ook later nog aanvullen."}
        </p>
      </div>

      {/* Voortgang — alleen zodra de klant zélf voor de uitgebreide intake koos.
          Een balk met "stap 1 van 5" op het eerste scherm belooft vier stappen
          werk die er helemaal niet hoeven te zijn. */}
      {step > 0 && (
        <div className="flex flex-col gap-2">
          <span className="mono-label">
            Extra vraag {step} van {STEP_TITLES.length - 1} — {STEP_TITLES[step]}
          </span>
          <div className="flex gap-1.5">
            {STEP_TITLES.slice(1).map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  background: i < step ? "var(--accent-purple, #8511d9)" : "var(--border-subtle)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="card flex flex-col gap-5">
        {step === 0 && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="mono-label">Bedrijfsnaam *</span>
              <input
                ref={nameRef}
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
                ref={urlRef}
                className="field"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                onBlur={() => setUrlTouched(true)}
                placeholder="mediamarkt.nl"
                aria-invalid={showUrlError}
                aria-describedby={showUrlError ? "url-error" : undefined}
                style={showUrlError ? { borderColor: "var(--status-error)" } : undefined}
              />
              {showUrlError ? (
                <span id="url-error" className="text-sm text-[var(--status-error)]" role="alert">
                  {urlCheck.message}
                </span>
              ) : (
                <span className="text-sm text-muted">
                  Het adres van de website, bijvoorbeeld voorbeeld.nl — met of zonder https://.
                </span>
              )}
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="mono-label">Andere namen / schrijfwijzen (optioneel)</span>
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
              <span className="mono-label">Korte omschrijving van het bedrijf *</span>
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
              <span className="mono-label">Branche *</span>
              <input
                className="field"
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
                placeholder="bijv. consumentenelektronica"
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="mono-label">Belangrijkste producten / diensten * (minimaal 1)</span>
              <TagListEditor
                items={form.products}
                onChange={(products) => set("products", products)}
                placeholder="Nieuw product…"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="mono-label">Waarom kiezen klanten voor jou? (waardeproposities, optioneel)</span>
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
              <span className="mono-label">Bereik (optioneel)</span>
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
                <span className="mono-label">Plaatsen / regio&apos;s (optioneel)</span>
                <TagListEditor
                  items={form.service_regions}
                  onChange={(service_regions) => set("service_regions", service_regions)}
                  placeholder="bijv. Utrecht…"
                />
                <span className="text-sm text-muted">Gebruiken we voor lokale zoekvragen in de meting.</span>
              </div>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="mono-label">Markt &amp; taal (optioneel)</span>
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
              <span className="mono-label">Bekende concurrenten * (minimaal 1)</span>
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
              <span className="mono-label">Doelgroep *</span>
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
              <span className="mono-label">Gewenste tone of voice *</span>
              <input
                className="field"
                value={form.tone_of_voice}
                onChange={(e) => set("tone_of_voice", e.target.value)}
                placeholder="bijv. toegankelijk, deskundig, informeel"
              />
            </label>
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
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--status-error)]" role="alert">
              {error}
            </p>
            {canForce && (
              <button
                type="button"
                onClick={() => void submit(true)}
                disabled={pending}
                className="btn-outline w-fit disabled:opacity-60"
              >
                Adres klopt — ga toch door
              </button>
            )}
          </div>
        )}

        {/* Op het EERSTE scherm twee gelijkwaardige knoppen (bijlage A9).
            Beginnen is de hoofdactie; meer vertellen is een echte keuze en geen
            grijs regeltje dat je over het hoofd ziet. */}
        {step === 0 ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void submit(false)}
              disabled={pending || !canProceed}
              className="btn-primary disabled:opacity-60"
            >
              {pending ? "Onderzoek starten…" : "Start het onderzoek"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={pending || !canProceed}
              className="btn-outline disabled:opacity-40"
            >
              Eerst meer vertellen ({STEP_TITLES.length - 1} korte vragen)
            </button>
            <span className="text-sm text-muted">
              Meer vertellen maakt de meting nauwkeuriger, maar het hoeft niet nu — je kunt het
              later aanvullen. Het onderzoek duurt ongeveer een minuut. Kies je hiervoor, dan zijn
              de velden met een * verplicht.
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={pending}
              className="btn-outline disabled:opacity-40"
            >
              Terug
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={() => void submit(false)}
                disabled={pending || !canProceed}
                className="btn-primary disabled:opacity-60"
              >
                {pending ? "Onderzoek starten…" : "Opslaan en onderzoek starten"}
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
        )}
      </div>
    </div>
  );
}
