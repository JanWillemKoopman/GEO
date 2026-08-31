"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TagListEditor } from "@/components/tag-list-editor";
import { checkUrlFormat } from "@/lib/url";
import {
  PACKAGE_SIZES,
  DEFAULT_PACKAGE_SIZE,
  type PackageSize,
} from "@/lib/package-sizes";
import { Icon } from "@/components/icon";

/**
 * Nieuw merk aanmaken (docs/tasks/onboarding-2.0.md, blok C).
 *
 * ── WAAROM DIT NOG MAAR ÉÉN SCHERM IS ───────────────────────────────────────
 *
 * Hier stond een wizard van vier stappen: bedrijf, wat je doet, markt &
 * concurrentie, doelgroep, stijl en techniek. Elf velden, waarvan zeven verplicht
 * zodra je voor de uitgebreide route koos.
 *
 * Dat was de juiste oplossing bij een profielonderzoek dat één AI-aanroep op de
 * homepage deed: wat het model niet kon weten, moest de klant typen. Sinds fase
 * 0 tot 150 pagina's uitkamt, de gestructureerde data oogst en de hele
 * onderzoeksketen erachteraan draait, is die redenering omgedraaid. De pijplijn
 * weet het beter, sneller en met bronvermelding, en de klant die "branche" moet
 * invullen levert doorgaans één woord waar het onderzoek een alinea van maakt.
 *
 * Wat overblijft is wat de pijplijn ECHT niet kan afleiden:
 *
 *   • het webadres    , het anker van alle onderzoek
 *   • de bedrijfsnaam , zoals klanten hem kennen, niet zoals het domein heet
 *   • andere namen    , afkortingen en schrijfwijzen die de meting anders mist
 *
 * De kolommen voor de oude velden bestaan nog (additief principe) en worden nu
 * door het onderzoek gevuld. Corrigeren gebeurt op de profielpagina, ná afloop,
 * als er iets te corrigeren VALT: in plaats van vooraf, als huiswerk.
 */

interface FormState {
  name: string;
  url: string;
  aliases: string[];
  /**
   * Het contentpakket, alleen gevraagd aan de beheerder.
   *
   * ⚠️ Staat hier naast naam en webadres, en niet ergens verderop in de app,
   * omdat het planscherm er hard op blokkeert. Tot 31 augustus 2026 was er
   * geen enkel scherm waar deze waarde te zetten viel; een nieuwe klant liep
   * daardoor vast op zijn eigen contentplan. Zie `lib/package-sizes.ts`.
   */
  packagePagesPerMonth: PackageSize;
}

export function OnboardingWizard({ isStaff = false }: { isStaff?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    url: "",
    aliases: [],
    packagePagesPerMonth: DEFAULT_PACKAGE_SIZE,
  });
  const [error, setError] = useState<string | null>(null);
  const [urlTouched, setUrlTouched] = useState(false);
  const [canForce, setCanForce] = useState(false);
  const [pending, setPending] = useState(false);

  // ── Wat er vóór de hydratie getypt is, overnemen ──────────────────────────
  //
  // De server rendert dit formulier als HTML; React neemt het pas over zodra de
  // JS-bundel geladen én uitgevoerd is. In dat gat is het veld gewoon te
  // gebruiken, en het naamveld heeft `autoFocus`, dus het NODIGT UIT om er
  // meteen in te typen. Wie dat deed, zag zijn invoer bij de eerste re-render
  // spoorloos verdwijnen: de controlled input schreef de lege React-state terug
  // over de DOM-waarde heen. Gemeten op 1 augustus 2026 tegen productie: naam
  // én webadres, allebei leeg, zonder enige melding.
  const nameRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const name = nameRef.current?.value ?? "";
    const url = urlRef.current?.value ?? "";
    if (!name && !url) return;
    setForm((f) => ({ ...f, name: name || f.name, url: url || f.url }));
  }, []);

  // Webadres controleren op het formulier zelf (optimalisatie.md 0.12). Pas
  // tonen zodra het veld verlaten is: meetypen met een foutmelding onder je
  // vingers is vervelend, en het adres is halverwege nooit geldig.
  const urlCheck = checkUrlFormat(form.url);
  const showUrlError = urlTouched && form.url.trim() !== "" && !urlCheck.ok;
  const canSubmit = form.name.trim() !== "" && form.url.trim() !== "" && urlCheck.ok;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(force = false) {
    if (!urlCheck.ok) {
      setUrlTouched(true);
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
        // Een klant stuurt het pakket niet mee. De route weigert het ook van
        // hem (verkoopafspraak, geen instelling), maar het niet meesturen
        // scheelt een foutmelding die hij niet kan oplossen.
        body: JSON.stringify(
          isStaff ? { ...form, force } : { ...form, packagePagesPerMonth: undefined, force },
        ),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Er ging iets mis.");
        setCanForce(Boolean(json.canForce));
        if (json.field === "url") setUrlTouched(true);
        setPending(false);
        return;
      }
      router.push(`/merk/${json.id}/merkprofiel`);
    } catch {
      setError("We konden ORBIT ENGINE niet bereiken. Controleer je verbinding en probeer het opnieuw.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <Link
          href="/merk"
          className="mono-label flex w-fit items-center gap-1.5 transition-colors hover:text-[var(--text-primary)]"
        >
          <Icon naam="terug" size={14} />
          Merken
        </Link>
        <h1 className="type-title">Nieuw merk</h1>
        <p className="mt-2 text-secondary">
          Twee velden, en ORBIT ENGINE gaat aan de slag. Het leest de hele website uit, brengt het aanbod in
          kaart, zoekt uit wie de concurrenten zijn en test wat AI-assistenten nu al over je merk
          weten.
        </p>
      </div>

      <div className="card flex flex-col gap-5">
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
          <span className="text-sm text-muted">De naam zoals klanten je kennen, niet het domein.</span>
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
              Het adres van de website, bijvoorbeeld voorbeeld.nl, met of zonder https ervoor.
            </span>
          )}
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="mono-label">Andere namen en schrijfwijzen (optioneel)</span>
          <TagListEditor
            items={form.aliases}
            onChange={(aliases) => set("aliases", aliases)}
            placeholder="bijv. afkorting of merknaam-variant…"
          />
          <span className="text-sm text-muted">
            Wordt je merk ook anders geschreven? Zonder die varianten telt een vermelding niet mee
            en valt je score te laag uit.
          </span>
        </div>

        {isStaff && (
          <label className="flex flex-col gap-1.5">
            <span className="mono-label">Contentpakket *</span>
            <select
              className="field"
              value={form.packagePagesPerMonth}
              onChange={(e) =>
                set("packagePagesPerMonth", Number(e.target.value) as PackageSize)
              }
            >
              {PACKAGE_SIZES.map((maat) => (
                <option key={maat} value={maat}>
                  {maat} pagina&apos;s per maand
                </option>
              ))}
            </select>
            <span className="text-sm text-muted">
              Alleen jij ziet dit veld. Het bepaalt hoeveel pagina&apos;s er per maand in het
              contentplan komen, en je past het later aan bij Toewijzen.
            </span>
          </label>
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
                Adres klopt, ga toch door
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void submit(false)}
            disabled={pending || !canSubmit}
            className="btn-primary btn-lg disabled:opacity-60"
          >
            {pending ? "Onderzoek starten…" : "Start het onderzoek"}
          </button>
          <span className="text-sm text-muted">
            Het onderzoek duurt ongeveer tien minuten en loopt door als je dit scherm sluit. Verder
            invullen hoeft niet. Wat ORBIT ENGINE vindt kun je daarna nog corrigeren.
          </span>
        </div>
      </div>
    </div>
  );
}
