"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import {
  BRAND_FIELDS,
  CLIENT_STEPS,
  STEP_META,
  fieldsOfStep,
  overallProgress,
  stepProgress,
  type BrandStep,
} from "@/lib/pipeline/brand-fields";
import { BrandFieldInput } from "./brand-field-input";
import { examplesFor } from "@/lib/pipeline/brand-examples";
import type { Profile } from "@/lib/types/database";

/**
 * Het merkprofiel invullen, in zeven stappen.
 *
 * ── WAAROM DIT GEEN LEEG FORMULIER IS ───────────────────────────────────────
 *
 * Nova laat hun klant twintig minuten uittrekken (`landingTimeNote`) voor een
 * onboarding van dertig velden die hij van nul invult. ORBIT ENGINE kan dat korter,
 * omdat het onderzoek hier vóór de kennismaking draait in plaats van erna: van
 * de 41 velden staat het merendeel er al, gevonden op de site van de klant.
 *
 * Vandaar het label **"uit je website gehaald"** (Nova's `draftedBadge`) bij
 * elk veld dat de pijplijn zelf vulde. De klant vult niets in, hij kijkt na. Dat
 * is een wezenlijk andere handeling, en het scherm zegt dat ook.
 *
 * ── DIT IS SINDS 17 AUGUSTUS 2026 HET ENIGE MERKFORMULIER ───────────────────
 *
 * Er was een tweede: een platte editor met alle 41 velden op één pagina, met een
 * eigen opslagroute. De wizard had er 27, dus wie de wizard gebruikte kon de
 * andere veertien niet vinden, en wie beide gebruikte wist niet welk scherm won.
 * De wizardvorm heeft gewonnen omdat hij op klantfeedback is ontworpen: hij
 * toont per veld waar de waarde vandaan komt. De veertien losse velden hebben
 * een stap gekregen, zie `lib/pipeline/brand-fields.ts`.
 *
 * ── WAAROM ÉÉN ROUTE EN GEEN ZEVEN ──────────────────────────────────────────
 *
 * De stap staat in de state en niet in de URL. Een half ingevuld formulier over
 * zeven routes verdelen betekent dat elke stapwissel een opslagmoment moet zijn,
 * anders ben je je invoer kwijt bij een misklik. Nu is opslaan een eigen
 * handeling met een eigen knop, en de stappen zijn alleen een indeling.
 *
 * ⚠️ Er staat daarom één waarschuwing tegenover: wie wegnavigeert met
 * openstaande wijzigingen, verliest ze. `onbeforeunload` vangt de harde variant.
 */
export function BrandWizard({
  profileId,
  initial,
  sources,
  startStap = "bedrijf",
}: {
  profileId: string;
  initial: Profile;
  /** Per veld waar de waarde vandaan komt, uit `profile_field_sources`. */
  sources: Record<string, string>;
  /**
   * Waar het formulier opent. Alleen gezet als iemand hierheen gestuurd is
   * vanaf een open punt ("Vraagt jouw input"), en dan wijst het naar de stap
   * waar dát veld in staat. Zonder deze parameter landt zo'n knop op stap 1 en
   * moet de klant zelf zoeken in welke van de zeven stappen zijn veld zit.
   */
  startStap?: BrandStep;
}) {
  const router = useRouter();
  const toast = useToast();
  const [stap, setStap] = useState<BrandStep>(startStap);
  // ⚠️ Alleen de klantstappen, en dat is niet cosmetisch. De hele inhoud van
  // deze state gaat als body naar `PATCH /api/profiles/[id]`, en die route legt
  // van élk veld in de body de herkomst vast. Zaten de commerciële velden er
  // ook in, dan zou één klik op "Bewaren" door de klant de uitkomst van het
  // gesprek herlabelen als klantinvoer.
  const [waarden, setWaarden] = useState<Record<string, unknown>>(() => {
    const start: Record<string, unknown> = {};
    for (const f of BRAND_FIELDS) {
      if (CLIENT_STEPS.includes(f.step)) start[f.key as string] = initial[f.key];
    }
    return start;
  });
  // De voorbeelden van de branche van dit merk. Eén keer bepaald: de branche
  // verandert niet terwijl iemand het formulier invult.
  const voorbeelden = useMemo(() => examplesFor(initial), [initial]);
  const [vuil, setVuil] = useState(false);
  const [busy, setBusy] = useState(false);

  const voortgang = useMemo(
    () => overallProgress(waarden as Partial<Profile>),
    [waarden],
  );
  const stapIndex = CLIENT_STEPS.indexOf(stap);
  const laatste = stapIndex === CLIENT_STEPS.length - 1;

  // Het vangnet bij het sluiten van het tabblad of een harde navigatie. Vangt
  // niet alles: een klik op een link binnen de app gaat hier langs, en daarvoor
  // staat de waarschuwing onderaan het scherm. Browsers tonen hun eigen tekst,
  // dus die valt hier niet te schrijven.
  useEffect(() => {
    if (!vuil) return;
    function waarschuw(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [vuil]);

  /**
   * Naar het veld springen waar de knop "Invullen" op wees.
   *
   * ⚠️ De browser doet dit zelf niet betrouwbaar: bij het laden van de pagina
   * bestaat het element nog niet, want React rendert de stap pas erna. Eén keer
   * na het monteren is genoeg; scrollt hij niet, dan staat het veld gewoon
   * bovenaan de stap die wél al klopt.
   */
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#veld-anker-")) return;
    const doel = document.getElementById(hash.slice(1));
    doel?.scrollIntoView({ block: "center" });
  }, []);

  function zet(key: string, value: unknown) {
    setWaarden((w) => ({ ...w, [key]: value }));
    setVuil(true);
  }

  async function bewaar(daarna?: () => void) {
    setBusy(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(waarden),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        toast({
          intent: "fout",
          title: "Opslaan is niet gelukt",
          description: j?.error ?? "Probeer het zo nog eens.",
        });
        return;
      }
      setVuil(false);
      toast({
        intent: "succes",
        title: "Je merkprofiel is bijgewerkt",
        description:
          "ORBIT ENGINE gebruikt dit vanaf nu in élke pagina die het schrijft, niet alleen in de eerstvolgende.",
      });
      router.refresh();
      daarna?.();
    } catch {
      toast({
        intent: "fout",
        title: "Geen verbinding",
        description: "Controleer je internet en probeer het opnieuw.",
      });
    } finally {
      setBusy(false);
    }
  }

  const meta = STEP_META[stap];

  return (
    <div className="flex flex-col gap-6">
      {/* ── De rail ───────────────────────────────────────────────────────
          Nova's "Your strategy taking shape": een lijst die meegroeit terwijl je
          vult. Hier per stap het aantal ingevulde velden, want dat is het enige
          eerlijke signaal van voortgang. */}
      <nav className="flex flex-wrap gap-2" aria-label="Stappen">
        {CLIENT_STEPS.map((s, i) => {
          const p = stepProgress(waarden as Partial<Profile>, s);
          const actief = s === stap;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStap(s)}
              aria-current={actief ? "step" : undefined}
              className="flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: actief
                  ? "var(--intent-intelligence-border)"
                  : "var(--border-subtle)",
                background: actief
                  ? "var(--intent-intelligence-surface)"
                  : "var(--bg-surface)",
                color: actief ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <span className="mono-label">{String(i + 1).padStart(2, "0")}</span>
              <span>{STEP_META[s].title}</span>
              <span
                className={p.compleet ? "chip chip-success" : "chip chip-neutral"}
              >
                {p.gevuld}/{p.totaal}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1">
        <h2 className="type-section">{meta.title}</h2>
        <p className="text-secondary">{meta.description}</p>
      </div>

      <div className="flex flex-col gap-4">
        {fieldsOfStep(stap).map((field) => (
          <BrandFieldInput
            key={field.key as string}
            field={field}
            value={waarden[field.key as string]}
            example={voorbeelden[field.key as string]}
            source={sources[field.key as string]}
            onChange={(v) => zet(field.key as string, v)}
          />
        ))}
      </div>

      {/* ── De onderbalk ──────────────────────────────────────────────────
          Sticky, want dit scherm is lang en de opslagknop moet bereikbaar
          blijven zonder terug te scrollen (ux-design.md §7). */}
      <div className="no-print sticky bottom-0 -mx-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-base-blur)] px-6 py-3 backdrop-blur-md">
        <span className="mono-label">
          {voortgang.gevuld} van de {voortgang.totaal} ingevuld
          {vuil && " · niet opgeslagen"}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {stapIndex > 0 && (
            <button
              type="button"
              className="btn-outline"
              onClick={() => setStap(CLIENT_STEPS[stapIndex - 1])}
            >
              Vorige
            </button>
          )}
          <button
            type="button"
            className="btn-outline"
            onClick={() => void bewaar()}
            disabled={busy || !vuil}
          >
            {busy ? "Bezig…" : "Bewaren"}
          </button>
          {laatste ? (
            <button
              type="button"
              className="btn-primary btn-lg"
              onClick={() =>
                void bewaar(() => router.push(`/merk/${profileId}/merkprofiel`))
              }
              disabled={busy}
            >
              Bewaren en terug naar het dossier
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStap(CLIENT_STEPS[stapIndex + 1])}
            >
              Volgende
            </button>
          )}
        </div>
      </div>

      {vuil && (
        <p className="text-sm text-muted">
          Je hebt wijzigingen die nog niet bewaard zijn.{" "}
          <Link href={`/merk/${profileId}/merkprofiel`} className="underline">
            Terug naar het dossier
          </Link>{" "}
          zonder bewaren gooit ze weg.
        </p>
      )}
    </div>
  );
}
