import { PageHeader } from "@/components/page-header";
import { ExternalLink } from "@/components/external-link";

/**
 * De kop van het profielscherm.
 *
 * ── WAAROM DIT ER NIET WAS EN WEL MOEST KOMEN ───────────────────────────────
 *
 * De profielpagina rende twaalf kaarten zonder titel: geen `PageHeader`, geen
 * `<h1>`, en de merknaam stond pas op ~plek 9 als een regel binnenín de editor.
 * Dit is het scherm dat de consultant deelt in de demo, het opende zonder te
 * zeggen over wie het ging. `/profielen` gebruikte de gedeelde kop wél; deze
 * pagina was de uitzondering, en dat is precies waar drift begint.
 *
 * ── DE DRIE NULMETING-TEGELS ZIJN ERUIT (12 augustus 2026) ──────────────────
 *
 * Hier stonden drie tegels: "Kent ChatGPT je bedrijf?" (6 formuleringen, geen
 * web search), "Noemt ChatGPT je als iemand wil kopen?" (3 vooraf gekozen
 * onderwerpen) en "Diensten zonder eigen pagina" (een automatische woordmatch
 * op een nog niet nagekeken aanbodboom). Alle drie kregen de vorm van een
 * afgeronde score, terwijl het losse steekproeven zijn op een fractie van het
 * aanbod, vóór het gesprek. Dat leest als een uitspraak en is er geen; zie
 * `docs/logbook.md` voor de volledige afweging. De onderliggende rekenkant
 * (`lib/pipeline/onboarding-summary.ts`) staat er nog, alleen dit scherm
 * gebruikt hem niet meer.
 *
 * ── GEEN KNOP EN GEEN SPRINGLINKS MEER (HERSTRUCTURERING AUGUSTUS 2026) ─────
 *
 * Er stond hier een primaire knop ("Meet 'X'") die naar een heel ander scherm
 * verwees dan waar hij op stond, en een springlinkbalk naar blokken die
 * inmiddels allemaal eigen subpagina's zijn (zie `lib/nav.ts`). Beide bestonden
 * omdat het dossier zelf negen dingen tegelijk deed; nu het er nog maar twee
 * doet — is het compleet, en wat weet Aura — is een navigatiehulpmiddel erbovenop
 * overbodig. De zijbalk is de navigatie.
 */
export function ProfileHero({
  brandName,
  url,
  headline,
}: {
  brandName: string;
  url: string;
  headline: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Merkdossier" title={brandName} backHref="/profielen" backLabel="Merken" />

      <ExternalLink
        href={`https://${url.replace(/^https?:\/\//, "")}`}
        className="mono-label break-url w-fit transition-colors hover:text-[var(--text-primary)]"
      >
        {url}
      </ExternalLink>

      {headline && <p className="max-w-2xl text-secondary">{headline}</p>}
    </div>
  );
}
