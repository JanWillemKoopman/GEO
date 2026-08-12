import Link from "next/link";
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
 * gebruikt hem niet meer. Wat AI wél zegt over dit merk staat uitgebreider,
 * met bewijs per antwoord, onder "Wat AI weet" (`#ai-kennis`); de paginadekking
 * staat onder "Aanbod" (`#aanbod`), waar hij naast de aanbodboom te lezen is
 * in plaats van als los cijfer vooraf.
 *
 * Eén primaire actie, en dat is de volgende stap in het product, niet een
 * beheerdershandeling. `AssignBox` verhuisde naar een eigen beheerblok onderaan:
 * die stond tussen de bevindingen in, op een scherm dat de klant meekijkt
 * terwijl hij wordt overgedragen.
 */
export function ProfileHero({
  brandName,
  url,
  headline,
  primaryAction,
  showNotes = false,
}: {
  brandName: string;
  url: string;
  headline: string | null;
  /**
   * Staan de gespreksnotities op deze pagina? Alleen de consultant ziet die
   * sectie, en een springlink naar een blok dat er niet is, is een dode link.
   */
  showNotes?: boolean;
  /** De enige primaire actie op dit scherm. Null zolang er niets te starten is. */
  primaryAction: { href: string; label: string } | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Merkdossier"
        title={brandName}
        backHref="/profielen"
        backLabel="Merken"
        action={
          primaryAction ? (
            <Link href={primaryAction.href} className="btn-primary">
              {primaryAction.label}
            </Link>
          ) : undefined
        }
      />

      <ExternalLink
        href={`https://${url.replace(/^https?:\/\//, "")}`}
        className="mono-label break-url w-fit transition-colors hover:text-[var(--text-primary)]"
      >
        {url}
      </ExternalLink>

      {headline && <p className="max-w-2xl text-secondary">{headline}</p>}

      {/* ── Springlinks ────────────────────────────────────────────────────
          Bewust géén sectie-rail zoals bij de analyse: die is er voor een
          dossier met een vaste volgorde van vier hoofdstukken, en hier zijn de
          blokken niet chronologisch.
          Wat wél nodig was: de consultant typt tijdens het uur consultancy in
          de gespreksnotities, en die stonden acht blokken naar beneden. Eén
          klik is genoeg; een herontwerp van dat formulier zou gokwerk zijn
          zolang er nog geen echt gesprek mee gevoerd is. */}
      <nav className="flex flex-wrap gap-2" aria-label="Snel naar">
        <JumpLink href="#vragen">Wat Aura nog wil weten</JumpLink>
        <JumpLink href="#ai-kennis">Wat AI weet</JumpLink>
        <JumpLink href="#aanbod">Aanbod</JumpLink>
        <JumpLink href="#onderwerpen">Onderwerpen</JumpLink>
        {showNotes && <JumpLink href="#gesprek">Gespreksnotities</JumpLink>}
      </nav>
    </div>
  );
}

/** Eén springlink. Pilvormig, want interactief (designsystem.md §C2). */
function JumpLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="chip chip-neutral transition-colors hover:text-[var(--text-primary)]"
    >
      {children}
    </a>
  );
}
