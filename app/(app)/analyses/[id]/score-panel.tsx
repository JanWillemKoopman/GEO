import Link from "next/link";
import { EntityComparison } from "@/components/entity-comparison";
import { InfoHint } from "@/components/info-hint";
import { confidenceBand, changeIsMeaningful } from "@/lib/stats/uncertainty";
import { formatDateLong } from "@/lib/format";
import { engineLabel } from "@/lib/engines/label";
import type { VisibilityScore, CompetitorBreakdown, Entity } from "@/lib/types/database";

/**
 * De score en het concurrentiebeeld (abcplan.md §3.5).
 *
 * Herzien in fase 2 (optimalisatie.md 2.3/2.8/2.10). Wat er toen veranderde:
 *
 *   • ÉÉN hoofdgetal. Er stonden twee cijfers van 6xl naast elkaar, score en
 *     gewogen score. Zonder dat duidelijk was welke leidend was. De gewogen
 *     score is nu het hoofdgetal, want die sluit aan bij wat de klant verdient;
 *     de ongewogen score staat er kleiner naast als context.
 *   • De BANDBREEDTE staat er zichtbaar bij. Met 30 vragen is de 95%-band zo'n
 *     ±18 punten. Een getal zonder die band nodigt uit tot conclusies die de
 *     meting niet draagt.
 *   • VERANDERING alleen als het er een is. Een verschil dat binnen de ruis valt
 *     wordt "gelijk gebleven", niet een pijltje omhoog.
 *
 * Sinds het dossier staat dit bestand niet meer als één paneel op één tabblad.
 * Het cijfer hoort bij "hoe sta ik ervoor" (hoofdstuk 01); de vergelijking met
 * concurrenten is een uitkomst van de metingen en hoort bij het bewijs
 * (hoofdstuk 02). Vandaar drie losse exports in plaats van één blok.
 */

/** Hoofdstuk 01, het cijfer, de marge en de verandering. */
export function ScoreCard({
  score,
  previous,
  measuredRunCount,
  engines = [],
}: {
  score: VisibilityScore;
  /** De vorige periode, als die er is, voor de verandering (2.3). */
  previous?: VisibilityScore | null;
  measuredRunCount: number;
  /** D: welke AI-assistent(en) bevraagd zijn, voor "meetdatum + model". */
  engines?: string[];
}) {
  const lead = score.weighted_score ?? score.score;
  const leadStderr = (score.weighted_score != null ? score.weighted_stderr : score.score_stderr) ?? 0;
  const leadIsWeighted = score.weighted_score != null;
  const band = confidenceBand(lead, leadStderr);

  const previousLead = previous ? (previous.weighted_score ?? previous.score) : null;
  const change =
    previous && previousLead != null
      ? changeIsMeaningful(
          { score: lead, stderr: leadStderr },
          {
            score: previousLead,
            stderr:
              (previous.weighted_score != null ? previous.weighted_stderr : previous.score_stderr) ??
              0,
          },
        )
      : null;

  return (
    <div className="card flex flex-col gap-3">
      <span className="mono-label flex items-center gap-1">
        {leadIsWeighted ? "Gewogen zichtbaarheid" : "Zichtbaarheidsscore"}
        <InfoHint label={leadIsWeighted ? "Gewogen zichtbaarheid" : "Zichtbaarheidsscore"}>
          {leadIsWeighted ? (
            <>
              Van alle vragen die Aura aan een AI-assistent stelde, in hoeveel word jij genoemd?
              Vaak gestelde en koopklare vragen tellen daarbij zwaarder. Gemeten over{" "}
              {score.winnable_runs ?? score.judged_runs ?? measuredRunCount} vragen.
            </>
          ) : (
            <>
              Van alle vragen die Aura aan een AI-assistent stelde, in hoeveel word jij genoemd.
              Elke vraag telt even zwaar. Gemeten over {score.winnable_runs ?? score.judged_runs ?? measuredRunCount}{" "}
              vragen.
            </>
          )}
        </InfoHint>
      </span>

      {/* D: meetdatum + model. Een getal zonder bron oogt als een bewering; een
          getal met "gemeten op 6 augustus via ChatGPT" oogt als een meting. */}
      <span className="text-sm text-muted">
        Gemeten op {formatDateLong(score.computed_at)}
        {engines.length > 0 && ` · via ${engines.map(engineLabel).join(" en ")}`}
      </span>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <span className="text-6xl font-bold tracking-tight">{Math.round(lead)}</span>
        <span className="mb-2 text-secondary">/ 100</span>
        {band.margin > 0 && (
          <span className="mb-2 flex items-center gap-1 text-sm text-muted">
            ±{band.margin} punten
            <InfoHint label="Waarom een marge?">
              Aura stelt {score.winnable_runs ?? score.judged_runs ?? measuredRunCount} vragen, geen duizend. Een andere
              set vragen, of dezelfde vragen op een andere dag, geeft een iets ander getal. Je
              echte score ligt naar alle waarschijnlijkheid tussen {band.low} en {band.high}.
            </InfoHint>
          </span>
        )}
      </div>

      <ChangeLine change={change} />

      <BrandlessLine score={score} />

      <VisibilityProfileRow score={score} />

      <p className="text-sm text-secondary">
        {leadIsWeighted
          ? "Zo vaak word jij genoemd als een AI-assistent een relevante vraag krijgt, waarbij vaak gestelde en koopklare vragen zwaarder tellen."
          : "Zo vaak word jij genoemd als een AI-assistent een relevante vraag krijgt. Elke vraag telt even zwaar."}
      </p>

      {leadIsWeighted && (
        <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3 text-sm text-secondary">
          <span>
            Ongewogen (elke vraag telt even zwaar):{" "}
            <span className="font-medium text-[var(--text-primary)]">{Math.round(score.score)}</span>
            {score.score_stderr != null && score.score_stderr > 0 && (
              <span className="text-muted">
                {" "}
                ±{confidenceBand(score.score, score.score_stderr).margin}
              </span>
            )}
          </span>
          <InfoHint label="Twee getallen?">
            Het hoofdgetal weegt mee hoe vaak een vraag gesteld wordt en hoe koopklaar hij is, en komt
            zo dichter bij wat je eraan verdient. Het ongewogen getal behandelt elke vraag gelijk en
            is makkelijker te vergelijken met een ruwe telling.
          </InfoHint>
        </div>
      )}
    </div>
  );
}

/** Hoofdstuk 02, jij naast je concurrenten, over dezelfde metingen. */
export function CompetitorCard({
  score,
  measuredRunCount,
  competitors,
}: {
  score: VisibilityScore;
  /**
   * Aantal daadwerkelijke metingen in deze periode, de enige juiste noemer voor
   * de concurrentiepercentages (optimalisatie.md 0.1). Eerder werd hier het
   * HUIDIGE aantal actieve prompts gebruikt, terwijl `mentions_count` uit
   * historische runs komt: zette de klant een prompt uit, dan schoten de balken
   * boven 100%.
   */
  measuredRunCount: number;
  competitors: CompetitorBreakdown[];
}) {
  // ── Snoeien (implementatieplan.md R4.1) ──────────────────────────────────
  //
  // Bij HEMA stonden er 34 merken in deze vergelijking, waarvan 24 met precies
  // één vermelding, van Kruidvat tot cadeauxfolies.fr. Dat is geen
  // concurrentiebeeld maar een lijst toevalligheden, en "je hebt 34
  // concurrenten" is een misleidende conclusie.
  //
  // Alleen in de DATA snoeien zou informatie weggooien (we bewaren alles); dus
  // snoeien we hier, in de weergave, en vertellen we hoeveel er buiten beeld
  // blijven.
  const sorted = [...competitors].sort((a, b) => b.mentions_count - a.mentions_count);
  const terugkerend = sorted.filter((c) => c.mentions_count >= 2);

  // Komt er GEEN enkele concurrent vaker dan één keer voorbij, dan is dat zelf de
  // bevinding: een versnipperde markt zonder dominante partij. Bij Van der Valk
  // is dat precies de situatie, 18 vergaderlocaties, elk één keer genoemd. Dan
  // een top-3 tonen alsof dat de concurrenten zijn, zou een rangorde suggereren
  // die er niet is.
  const versnipperd = terugkerend.length === 0 && sorted.length > 0;
  const shown = terugkerend.slice(0, 8);
  const tail = sorted.length - shown.length;

  const rows = [
    { label: "Jij", percent: Math.round(score.score), isOwnBrand: true },
    ...shown.map((c) => ({
      label: c.competitor_name,
      // Vangnet: ook met de juiste noemer kan een concurrent theoretisch vaker
      // geteld worden dan er runs zijn. Dan liever afkappen op 100 dan een
      // onmogelijke balk tonen.
      percent:
        measuredRunCount > 0
          ? Math.min(100, Math.round((c.mentions_count / measuredRunCount) * 100))
          : 0,
      isOwnBrand: false,
    })),
  ];

  return (
    <div className="card flex flex-col gap-4">
      <span className="mono-label flex items-center gap-1">
        Jij vs. concurrenten
        <InfoHint label="Jij vs. concurrenten">
          Het percentage van de {measuredRunCount} gestelde vragen waarin dit merk voorkwam. Meer
          dan één merk kan in hetzelfde antwoord staan, dus de percentages tellen niet op tot 100.
          Deze concurrenten zijn niet vooraf opgegeven: het zijn de bedrijven die de AI-assistent in
          zijn antwoorden daadwerkelijk naast jou noemde. Gemeten, niet aangenomen.
        </InfoHint>
      </span>
      {versnipperd ? (
        <p className="text-secondary">
          Geen enkele aanbieder kwam vaker dan één keer voorbij. De AI noemde {sorted.length}{" "}
          verschillende partijen, elk één keer. Er is hier dus geen vaste favoriet die je moet
          verslaan; dat maakt het makkelijker om er zelf één te worden.
        </p>
      ) : rows.length > 1 ? (
        <>
          <EntityComparison rows={rows} />
          {tail > 0 && (
            <p className="text-sm text-muted">
              Daarnaast kwamen nog {tail} andere merken één keer voorbij. Die blijven hier buiten
              beeld: één vermelding is toeval, geen patroon.
            </p>
          )}
          <CompetitorReasons competitors={shown} />
        </>
      ) : (
        <p className="text-secondary">
          In de antwoorden op deze vragen kwam geen enkele concurrent naast jou voor.
        </p>
      )}
    </div>
  );
}

/** Leesbaar label per rol, voor de "Ook genoemd"-kaart. */
const ROLE_LABELS: Record<string, string> = {
  vergelijker: "Vergelijkingssite",
  brancheorganisatie: "Brancheorganisatie",
  eigen_product: "Merk dat je zelf voert",
  niet_relevant: "Geen concurrent",
};

/**
 * Hoofdstuk 02, merken die de meting tegenkwam maar die geen concurrent zijn
 * (migratie 0026).
 *
 * Deze kaart toonde eerder "nog niet bevestigde" merken: alles wat de meting
 * ontdekte wachtte op een handmatig vinkje van de klant voordat het meetelde.
 * Dat maakte de concurrentievergelijking afhankelijk van een lijst in plaats van
 * van de meting. Nu classificeert de aggregatie elk ontdekt merk automatisch, en
 * staat hier wat er bewust NIET in de grafiek hoort, met de reden erbij, zodat
 * zichtbaar is waarom een merk uit de antwoorden er niet tussen staat.
 */
export function AlsoMentionedCard({
  alsoMentioned,
  profileId,
}: {
  /** Ontdekte merken die als iets anders dan concurrent geclassificeerd zijn. */
  alsoMentioned: Entity[];
  profileId: string;
}) {
  if (alsoMentioned.length === 0) return null;

  return (
    <div className="card flex flex-col gap-3">
      <span className="mono-label flex items-center gap-1">
        Ook genoemd, geen concurrent
        <InfoHint label="Ook genoemd">
          Deze merken kwamen wél in de antwoorden voor, maar zijn geen concurrent van je: denk aan
          vergelijkingssites, marktplaatsen en brancheorganisaties. Ze tellen daarom niet mee in je
          aandeel, anders vertekent dat cijfer. Klopt een indeling niet? Pas hem aan bij
          Concurrenten beheren; jouw keuze overschrijft Aura daarna nooit meer.
        </InfoHint>
      </span>
      <ul className="flex flex-col gap-2">
        {alsoMentioned.map((e) => (
          <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
            <span className="font-medium">{e.canonical_name}</span>
            <span className="chip" style={{ fontSize: "0.7rem" }}>
              {ROLE_LABELS[e.entity_role] ?? "Geen concurrent"}
            </span>
            {e.exclude_reason && <span className="text-muted">{e.exclude_reason}</span>}
          </li>
        ))}
      </ul>
      <Link href={`/profielen/${profileId}/concurrenten`} className="btn-outline btn-sm w-fit">
        Concurrenten beheren
      </Link>
    </div>
  );
}

/**
 * De verandering ten opzichte van de vorige meting, of het eerlijke "gelijk
 * gebleven" (optimalisatie.md 2.3).
 *
 * De drempel is niet de band rond één score maar die van het VERSCHIL tussen
 * twee metingen, en die is ruwweg 1,4× breder. Met 30 vragen komt dat neer op
 * zo'n 25 punten. Een pijltje omhoog bij +4 punten is een leugen met een
 * grafiekje eromheen.
 */
function ChangeLine({
  change,
}: {
  change: { changed: boolean; delta: number; threshold: number } | null;
}) {
  if (!change) return null;

  if (!change.changed) {
    return (
      <p className="flex items-center gap-1 text-sm text-secondary">
        <span className="font-medium">Gelijk gebleven</span>
        <span className="text-muted">
          ({change.delta > 0 ? "+" : ""}
          {change.delta} punten)
        </span>
        <InfoHint label="Waarom 'gelijk gebleven'?">
          Het verschil met de vorige meting is {Math.abs(change.delta)} punten. Pas vanaf{" "}
          {change.threshold} punten staat vast dat er écht iets veranderd is; daaronder kan het net
          zo goed toeval zijn. Gemeten, niet gegokt.
        </InfoHint>
      </p>
    );
  }

  const up = change.delta > 0;
  return (
    <p className="flex items-center gap-1 text-sm">
      <span
        className="font-medium"
        style={{ color: up ? "var(--status-success)" : "var(--status-error)" }}
      >
        {up ? "▲" : "▼"} {up ? "+" : ""}
        {change.delta} punten
      </span>
      <span className="text-secondary">sinds de vorige meting</span>
      <InfoHint label="Echte verandering">
        Dit verschil is groter dan de {change.threshold} punten die nodig zijn om toeval uit te
        sluiten. Er is dus echt iets veranderd.
      </InfoHint>
    </p>
  );
}

/**
 * Het tweede getal: bij hoeveel vragen noemt de AI helemaal geen aanbieder?
 * (implementatieplan.md R2.5)
 *
 * Het hoofdgetal blijft één getal. Dat is het ontwerpprincipe van de app. Maar
 * de score zegt pas iets als je weet waaróver hij gaat. Bij Van der Valk noemt
 * de AI bij 17 van de 30 vragen geen enkel bedrijf; die vragen tellen sinds R2
 * niet meer mee. Zonder deze regel zou de klant zich afvragen waarom er "30
 * vragen" gesteld zijn maar over 13 gemeten wordt.
 *
 * En het is zelf een bevinding: waar niemand genoemd wordt, valt niets te
 * verliezen, maar is er ook nog geen partij de standaard.
 */
function BrandlessLine({ score }: { score: VisibilityScore }) {
  const brandless = score.brandless_runs ?? 0;
  if (brandless <= 0) return null;

  const total = (score.winnable_runs ?? 0) + brandless;

  return (
    <p className="flex items-start gap-1 text-sm text-muted">
      <span>
        Bij {brandless} van je {total} vragen noemt de AI helemaal geen bedrijf. Die tellen niet mee
        in je score.
      </span>
      <InfoHint label="Waarom tellen die niet mee?">
        Op vragen als &ldquo;waar moet ik op letten bij het kiezen?&rdquo; geeft een AI-assistent
        een stappenplan in plaats van een lijstje aanbieders. Daar kún je niet genoemd worden, dus
        het zou oneerlijk zijn je erop af te rekenen. Tegelijk is het een kans: er is hier nog
        geen partij die de AI standaard noemt.
      </InfoHint>
    </p>
  );
}

/**
 * Het zichtbaarheidsprofiel onder het hoofdgetal (implementatieplan.md R3.3).
 *
 * Het hoofdgetal blijft één getal. Dat is het ontwerpprincipe van de app. Maar
 * "genoemd, ja of nee" is een grove maat: als vijfde genoemd worden ná drie
 * concurrenten is iets heel anders dan als eerste aanbevolen worden, en
 * geciteerd worden is een derde vorm van zichtbaarheid die tot R3 helemaal niet
 * meetelde, terwijl dát de link is waarop een gebruiker doorklikt.
 *
 * Drie cijfers, geen tabel: dit is verdieping onder het hoofdgetal, geen tweede
 * dashboard. Verschijnt alleen als er iets te tonen valt.
 */
function VisibilityProfileRow({ score }: { score: VisibilityScore }) {
  const heeftProfiel =
    score.avg_position != null ||
    (score.citation_count ?? 0) > 0 ||
    (score.first_mention_count ?? 0) > 0;
  if (!heeftProfiel) return null;

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border-subtle)] pt-3 text-sm">
      {score.avg_position != null && (
        <span className="flex items-center gap-1 text-secondary">
          Gemiddelde plek in het antwoord:{" "}
          <span className="font-medium text-[var(--text-primary)]">{score.avg_position}</span>
          <InfoHint label="Gemiddelde plek">
            Op welke plaats in het antwoord je genoemd wordt, gemiddeld over de keren dát je
            genoemd wordt. Lager is beter: wie bovenaan staat, wordt eerder gekozen.
          </InfoHint>
        </span>
      )}

      {(score.first_mention_count ?? 0) > 0 && (
        <span className="flex items-center gap-1 text-secondary">
          Als eerste aanbevolen:{" "}
          <span className="font-medium text-[var(--text-primary)]">{score.first_mention_count}×</span>
          <InfoHint label="Als eerste aanbevolen">
            Hoe vaak de AI jou als eerste of beste keuze presenteert, in plaats van als één van
            meerdere opties. Dit is het verschil tussen &ldquo;je staat erbij&rdquo; en &ldquo;je
            wordt aangeraden&rdquo;.
          </InfoHint>
        </span>
      )}

      {(score.citation_count ?? 0) > 0 && (
        <span className="flex items-center gap-1 text-secondary">
          Jouw site als bron gebruikt:{" "}
          <span className="font-medium text-[var(--text-primary)]">{score.citation_count}×</span>
          <InfoHint label="Jouw site als bron">
            Hoe vaak de AI-assistent naar jouw website verwijst om zijn antwoord te onderbouwen.
            Dat is een aparte vorm van zichtbaarheid: ook als je niet in de tekst genoemd wordt,
            is dit de link waarop iemand doorklikt.
          </InfoHint>
        </span>
      )}
    </div>
  );
}

/**
 * Waaróm die concurrenten genoemd worden (implementatieplan.md R4.3).
 *
 * De vergelijking eronder liet alleen zien hoe vaak iemand genoemd wordt. De
 * vraag die de klant daarna stelt, waarom die ander wel en ik niet, bleef
 * onbeantwoord. Dit is het antwoord, gedestilleerd uit de antwoorden zelf.
 *
 * Verschijnt alleen als de profilering gedraaid heeft; bij metingen van vóór R4
 * blijft het blok leeg in plaats van een lege belofte te tonen.
 */
function CompetitorReasons({ competitors }: { competitors: CompetitorBreakdown[] }) {
  const withReason = competitors.filter((c) => c.why_summary);
  if (withReason.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
      <span className="mono-label flex items-center gap-1">
        Waarom zij genoemd worden
        <InfoHint label="Waarom zij genoemd worden">
          Afgeleid uit de antwoorden zelf: op welke eigenschappen de AI deze aanbieders aanhaalt.
          Dat is de lat waar jouw content overheen moet. Niet om deze bedrijven na te doen, maar
          om op dezelfde punten net zo concreet te zijn.
        </InfoHint>
      </span>
      <ul className="flex flex-col gap-2">
        {withReason.map((c) => (
          <li key={c.id} className="text-sm">
            <span className="font-medium">{c.competitor_name}</span>
            <span className="text-secondary">: {c.why_summary}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
