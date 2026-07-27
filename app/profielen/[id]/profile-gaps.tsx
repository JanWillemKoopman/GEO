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

function findGaps(profile: Profile): Gap[] {
  const gaps: Gap[] = [];

  if (profile.aliases.length === 0) {
    gaps.push({
      label: "Andere schrijfwijzen van je naam",
      effect:
        "Noemt een AI je als \"Jansen BV\" terwijl je profiel \"Bakkerij Jansen\" zegt, dan tellen we die vermelding nu niet mee. Je score is dan te laag.",
    });
  }

  if (profile.service_regions.length === 0 && !profile.service_scope) {
    gaps.push({
      label: "Waar je werkt",
      effect:
        "Zonder werkgebied stellen we landelijke vragen. Werk je in één regio, dan meten we tegen concurrenten waar je nooit tegenaan loopt.",
    });
  }

  if (profile.proof_points.length < 3) {
    gaps.push({
      label: "Concrete feiten over je bedrijf",
      effect:
        "Cijfers, jaartallen en termijnen zijn wat een AI-assistent aanhaalt. Zonder die feiten wordt elke tekst die we schrijven noodgedwongen algemeen — en algemeen wordt niet geciteerd.",
    });
  }

  if (profile.competitors.length === 0) {
    gaps.push({
      label: "Je belangrijkste concurrenten",
      effect:
        "We zoeken ze zelf op, maar jij weet beter wie er écht toe doet. Dat maakt de vergelijking eerlijker.",
    });
  }

  return gaps;
}

export function ProfileGaps({ profile }: { profile: Profile }) {
  const gaps = findGaps(profile);
  if (gaps.length === 0) return null;

  return (
    <div className="card flex flex-col gap-3" style={{ borderColor: "rgba(165,120,240,0.4)" }}>
      <span className="mono-label flex items-center gap-1">
        Dit zou de meting scherper maken
        <InfoHint label="Moet dit?">
          Nee. Alles werkt ook zonder. Maar elk punt hieronder haalt een specifieke onnauwkeurigheid
          weg — daarom staat erbij wát het verbetert.
        </InfoHint>
      </span>

      <ul className="flex flex-col gap-2">
        {gaps.map((gap) => (
          <li key={gap.label} className="text-sm">
            <span className="font-medium">{gap.label}</span>
            <span className="text-secondary"> — {gap.effect}</span>
          </li>
        ))}
      </ul>

      <Link href={`/profielen/${profile.id}#profiel`} className="btn-outline w-fit">
        Profiel aanvullen
      </Link>
    </div>
  );
}
