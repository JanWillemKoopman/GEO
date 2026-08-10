import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ExternalLink } from "@/components/external-link";
import { InfoHint } from "@/components/info-hint";
import type { OnboardingStat } from "@/lib/pipeline/onboarding-summary";

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
 * ── DRIE CIJFERS, EN EEN ZIN ERBOVEN ────────────────────────────────────────
 *
 * `ux-design.md` regel 1: één hoofdgetal. De duidingszin doet dat werk, de drie
 * tegels zijn de onderbouwing. Zonder die zin leest "0/3" als een cijfer op een
 * rapport, en voor vrijwel elk MKB-merk is dat gewoon de startsituatie.
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
  stats,
  primaryAction,
  showNotes = false,
}: {
  brandName: string;
  url: string;
  headline: string | null;
  stats: OnboardingStat[];
  /**
   * Staan de gespreksnotities op deze pagina? Alleen de consultant ziet die
   * sectie, en een springlink naar een blok dat er niet is, is een dode link.
   */
  showNotes?: boolean;
  /** De enige primaire actie op dit scherm. Null zolang er niets te starten is. */
  primaryAction: { href: string; label: string } | null;
}) {
  const iets = stats.some((s) => s.value !== "-");

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

      {iets && (
        <div className="flex flex-col gap-2">
          {/* Eén kop boven de drie tegels. Zonder die kop is niet duidelijk dat
              dit één samenhangende meting is met één moment: het is de stand
              van vandaag, vóór er iets veranderd is. */}
          <span className="mono-label">De nulmeting</span>
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((s) => (
              <StatTile key={s.label} stat={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Eén tegel. De waarde in mono. Dat is de "technische read-out" uit
 * `designsystem.md` §C3 en de herkenbaarste typografische keuze van het systeem.
 *
 * Kleur is nooit het enige signaal (§C5): de toon zit in de kleur én in de
 * hint eronder, die in gewone taal zegt wat het getal betekent.
 */
function StatTile({ stat }: { stat: OnboardingStat }) {
  const kleur =
    stat.tone === "goed"
      ? "var(--status-success)"
      : stat.tone === "aandacht"
        ? "var(--intent-intelligence-solid)"
        : "var(--text-primary)";

  return (
    <div className="card flex flex-col gap-1">
      <span
        className="stat-value text-3xl font-bold"
        style={{ color: kleur }}
      >
        {stat.value}
      </span>

      {/* Het label is een hele vraag geworden in plaats van twee woorden. Een
          tegel die "Herkend door ChatGPT" heet laat de lezer zelf raden wat de
          noemer is; een tegel die "Kent ChatGPT je bedrijf?" heet niet. */}
      <span className="flex items-start gap-1 text-sm font-semibold">
        {stat.label}
        <InfoHint label={`Wat meet "${stat.label}"?`}>{stat.explain}</InfoHint>
      </span>

      {stat.hint && <span className="text-sm text-muted">{stat.hint}</span>}

      {stat.href && (
        <a
          href={stat.href}
          className="mono-label mt-1 w-fit transition-colors hover:text-[var(--text-primary)]"
        >
          Bekijk de onderbouwing
        </a>
      )}
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
