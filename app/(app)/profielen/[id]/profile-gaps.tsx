import Link from "next/link";
import { InfoHint } from "@/components/info-hint";
import type { Profile } from "@/lib/types/database";

/**
 * "Dit zou de meting nog scherper maken" (optimalisatie.md bijlage A9).
 *
 * De tweede helft van waarde-vóór-inspanning. De onboarding vraagt nu alleen
 * naam en website; de rest vragen we hier — op het moment dat de klant het
 * onderzoek heeft zien draaien en dus weet waar het voor dient.
 *
 * Per ontbrekend veld staat er wat het CONCREET verbetert, niet dat het "je
 * profiel completer maakt". Een ondernemer vult geen veld in omdat een
 * voortgangsbalkje anders op 80% blijft staan; hij vult het in als hij weet dat
 * z'n merk anders niet herkend wordt.
 */
interface Gap {
  label: string;
  effect: string;
}

/**
 * ⚠️ HERZIEN OP 4 AUGUSTUS 2026 — WAT HET ONDERZOEK NU ZÉLF VINDT
 *
 * Twee van de vier gaten hierboven zijn achterhaald geraakt door de
 * onboarding-verbeteringen van dezelfde week:
 *
 *   • **werkgebied** — `profile_research` levert sinds die ronde `serviceScope`
 *     en `serviceRegions` (zie lib/schemas/profile.ts). Bij Fysi-Unique kwam
 *     daar "lokaal / Amersfoort" uit. Dit gat zal bij vrijwel elke klant weg
 *     zijn, en er alsnog naar vragen is de klant huiswerk geven voor iets wat
 *     we al weten.
 *   • **concurrenten** — `profile_market` vult `profiles.competitors` met acht
 *     namen mét onderbouwing. Idem.
 *
 * Beide zijn eruit. Wat blijft staan is wat de pijplijn principieel NIET kan
 * vinden: hoe klanten je nog meer noemen (staat nergens op je eigen site), en
 * harde cijfers over je bedrijf (die staan er alleen als je ze zelf hebt
 * opgeschreven).
 *
 * Twee nieuwe, die wél uit de nieuwe data volgen en die een mens moet bevestigen.
 */
function findGaps(profile: Profile): Gap[] {
  const gaps: Gap[] = [];

  if (profile.aliases.length === 0) {
    gaps.push({
      label: "Andere schrijfwijzen van je naam",
      effect:
        'Noemt een AI je als "Jansen BV" terwijl je profiel "Bakkerij Jansen" zegt, dan tellen we die vermelding nu niet mee. Je score is dan te laag.',
    });
  }

  if (profile.proof_points.length < 3) {
    gaps.push({
      label: "Concrete feiten over je bedrijf",
      effect:
        "Cijfers, jaartallen en termijnen zijn wat een AI-assistent aanhaalt. Zonder die feiten wordt elke tekst die we schrijven noodgedwongen algemeen — en algemeen wordt niet geciteerd.",
    });
  }

  // Het onderzoek zegt "lokaal" maar noemde geen plaats. `resolveScope()` zet
  // dat bewust op null in plaats van te gokken — en dan is dit precies een vraag
  // voor het gesprek.
  if (profile.service_scope === "lokaal" && profile.service_regions.length === 0) {
    gaps.push({
      label: "In welke plaats of streek je werkt",
      effect:
        "We zien dat je lokaal werkt, maar niet waar. Zonder plaatsnaam stellen we landelijke vragen en meet je jezelf af tegen partijen waar je nooit tegenaan loopt.",
    });
  }

  // Geen bedrijfsmodel betekent dat de aanbodanalyse op de algemene briefing
  // draaide (zie briefingFor() in offering.ts). Eén keuze van een mens maakt de
  // volgende ronde meteen scherper.
  if (!profile.business_model) {
    gaps.push({
      label: "Wat voor bedrijf je bent",
      effect:
        "Dienstverlener, retailer, fabrikant of platform — dat bepaalt waar we naar zoeken in je aanbod en welke vragen we straks stellen. We konden het niet met zekerheid afleiden.",
    });
  }

  return gaps;
}

export function ProfileGaps({
  profile,
  researchGaps = [],
}: {
  profile: Profile;
  /**
   * Wat het onderzoek zelf niet kon vaststellen (blok B fase 5). Bewust
   * bovenaan: dit zijn concrete, in dertig seconden te beantwoorden vragen die
   * de synthese formuleerde, en daarmee de agenda van het gesprek. De vaste
   * punten hieronder zijn algemener en horen daaronder.
   */
  researchGaps?: string[];
}) {
  const gaps = findGaps(profile);
  if (gaps.length === 0 && researchGaps.length === 0) return null;

  return (
    <div className="card card-accent flex flex-col gap-3">
      <span className="mono-label flex items-center gap-1">
        Dit zou de meting scherper maken
        <InfoHint label="Moet dit?">
          Nee. Alles werkt ook zonder. Maar elk punt hieronder haalt een
          specifieke onnauwkeurigheid weg — daarom staat erbij wát het
          verbetert.
        </InfoHint>
      </span>

      {researchGaps.length > 0 && (
        <ul className="flex flex-col gap-2">
          {researchGaps.map((vraag) => (
            <li key={vraag} className="text-sm">
              <span className="font-medium">{vraag}</span>
            </li>
          ))}
        </ul>
      )}

      <ul className="flex flex-col gap-2">
        {gaps.map((gap) => (
          <li key={gap.label} className="text-sm">
            <span className="font-medium">{gap.label}</span>
            <span className="text-secondary"> — {gap.effect}</span>
          </li>
        ))}
      </ul>

      <Link
        href={`/profielen/${profile.id}#profiel`}
        className="btn-outline btn-sm w-fit"
      >
        Profiel aanvullen
      </Link>
    </div>
  );
}
