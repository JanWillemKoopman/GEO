import Link from "next/link";
import { InfoHint } from "@/components/info-hint";
import { FactRequests } from "./fact-requests";
import type { FactRequest, Profile } from "@/lib/types/database";

/**
 * Alles wat Aura nog van de klant wil weten, op één plek en hoog op de pagina.
 *
 * ── WAAROM DIT SAMENGEVOEGD IS ──────────────────────────────────────────────
 *
 * Het stond op twee plekken en allebei verstopt. De concrete vragen mét invoer
 * (`FactRequests`) zaten op plek 7, binnenín "Profielgegevens", onder de editor.
 * De open punten uit het onderzoek (`ProfileGaps`) zaten op plek 5, binnenín
 * "Het gesprek". Voor de gebruiker is dat één ding: Aura heeft informatie nodig.
 * Twee blokken met dezelfde bedoeling, allebei onder de vouw, allebei zonder
 * teller bovenaan.
 *
 * Nu één blok, op plek 2, met het aantal in de kop. Dat is Nova's patroon: daar
 * heeft élke lijst een teller en een banner die zegt wat er van je verwacht
 * wordt ("Needs your input · Fill in the funnels, languages and strategy
 * details below so these domains are ready to generate").
 *
 * ── DE VOLGORDE BINNENIN ────────────────────────────────────────────────────
 *
 * Eerst wat je in dertig seconden kunt beantwoorden (de vragen met een invoerveld),
 * dan wat een gesprek vraagt (de open punten). Niet andersom: een lijst
 * beschouwingen bovenaan laat de invulvelden eronder verdwijnen.
 */
interface Gap {
  label: string;
  effect: string;
}

/**
 * ⚠️ HERZIEN OP 4 AUGUSTUS 2026: WAT HET ONDERZOEK NU ZÉLF VINDT
 *
 * Twee van de vier gaten zijn achterhaald geraakt door de
 * onboarding-verbeteringen van dezelfde week:
 *
 *   • **werkgebied**, `profile_research` levert sinds die ronde `serviceScope`
 *     en `serviceRegions` (zie lib/schemas/profile.ts). Bij Fysi-Unique kwam
 *     daar "lokaal / Amersfoort" uit. Dit gat zal bij vrijwel elke klant weg
 *     zijn, en er alsnog naar vragen is de klant huiswerk geven voor iets wat
 *     we al weten.
 *   • **concurrenten**, `profile_market` vult `profiles.competitors` met acht
 *     namen mét onderbouwing. Idem.
 *
 * Beide zijn eruit. Wat blijft staan is wat de pijplijn principieel NIET kan
 * vinden: hoe klanten je nog meer noemen (staat nergens op je eigen site), en
 * harde cijfers over je bedrijf (die staan er alleen als je ze zelf hebt
 * opgeschreven).
 */
function findGaps(profile: Profile): Gap[] {
  const gaps: Gap[] = [];

  if (profile.aliases.length === 0) {
    gaps.push({
      label: "Andere schrijfwijzen van je naam",
      effect:
        'Noemt een AI je als "Jansen BV" terwijl je dossier "Bakkerij Jansen" zegt, dan telt die vermelding niet mee. Je score valt dan te laag uit.',
    });
  }

  if (profile.proof_points.length < 3) {
    gaps.push({
      label: "Concrete feiten over je bedrijf",
      effect:
        "Cijfers, jaartallen en termijnen zijn wat een AI-assistent aanhaalt. Zonder die feiten wordt elke tekst die Aura schrijft noodgedwongen algemeen, en algemeen wordt niet geciteerd.",
    });
  }

  // Het onderzoek zegt "lokaal" maar noemde geen plaats. `resolveScope()` zet
  // dat bewust op null in plaats van te gokken, en dan is dit precies een vraag
  // voor het gesprek.
  if (profile.service_scope === "lokaal" && profile.service_regions.length === 0) {
    gaps.push({
      label: "In welke plaats of streek je werkt",
      effect:
        "Aura ziet dat je lokaal werkt, maar niet waar. Zonder plaatsnaam gaan de vragen landelijk, en meet je jezelf af tegen partijen waar je nooit tegenaan loopt.",
    });
  }

  // Geen bedrijfsmodel betekent dat de aanbodanalyse op de algemene briefing
  // draaide (zie briefingFor() in offering.ts). Eén keuze van een mens maakt de
  // volgende ronde meteen scherper.
  if (!profile.business_model) {
    gaps.push({
      label: "Wat voor bedrijf je bent",
      effect:
        "Dienstverlener, retailer, fabrikant of platform: dat bepaalt waar Aura in je aanbod naar zoekt en welke vragen het straks stelt. Met zekerheid afleiden lukte niet.",
    });
  }

  return gaps;
}

/** Hoeveel punten staan er open? Bepaalt de badge én of het blok er staat. */
export function countOpenQuestions(
  profile: Profile,
  facts: FactRequest[],
  researchGaps: string[],
): number {
  return (
    facts.filter((f) => f.status === "open").length +
    researchGaps.length +
    findGaps(profile).length
  );
}

export function OpenQuestions({
  profile,
  facts,
  researchGaps = [],
}: {
  profile: Profile;
  facts: FactRequest[];
  /**
   * Wat het onderzoek zelf niet kon vaststellen (blok B fase 5): concrete, in
   * dertig seconden te beantwoorden vragen die de synthese formuleerde.
   */
  researchGaps?: string[];
}) {
  const gaps = findGaps(profile);
  const openFacts = facts.filter((f) => f.status === "open");
  const totaal = openFacts.length + researchGaps.length + gaps.length;

  if (totaal === 0) {
    return (
      <div className="card card-success flex flex-col gap-1">
        <span className="mono-label">Niets open</span>
        <p className="text-secondary">
          Aura heeft alles wat het nodig heeft. Komen er bij een volgende meting
          nieuwe vragen bij, dan staan ze hier.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* De banner. Zegt wat er van je verwacht wordt en wat het oplevert,
          vóór de lijst zelf. */}
      <div className="card card-accent flex flex-col gap-2">
        <span className="mono-label flex items-center gap-1">
          Aura heeft je hulp nodig
          <InfoHint label="Moet dit?">
            Nee, alles werkt ook zonder. Maar elk punt hieronder haalt één
            specifieke onnauwkeurigheid weg, en daarom staat er per punt bij wát
            het verbetert.
          </InfoHint>
        </span>
        <p className="text-secondary">
          {totaal === 1
            ? "Er staat 1 punt open."
            : `Er staan ${totaal} punten open.`}{" "}
          AI-assistenten citeren harde feiten: cijfers, jaartallen, termijnen.
          Algemene beloftes slaan ze over. Wat je hier invult gebruikt Aura in
          élke pagina die het schrijft, niet alleen in de eerstvolgende.
        </p>
      </div>

      {/* 1. De vragen met een invoerveld: laagste drempel, hoogste opbrengst. */}
      {facts.length > 0 && <FactRequests profileId={profile.id} initial={facts} />}

      {/* 2. Wat een gesprek vraagt. */}
      {(researchGaps.length > 0 || gaps.length > 0) && (
        <div className="card flex flex-col gap-3">
          <span className="mono-label">Dit zou de meting scherper maken</span>

          {researchGaps.length > 0 && (
            <ul className="flex flex-col gap-2">
              {researchGaps.map((vraag) => (
                <li key={vraag} className="text-sm font-medium">
                  {vraag}
                </li>
              ))}
            </ul>
          )}

          {gaps.length > 0 && (
            <ul className="flex flex-col gap-2">
              {gaps.map((gap) => (
                <li key={gap.label} className="text-sm">
                  <span className="font-medium">{gap.label}</span>
                  <span className="text-secondary">: {gap.effect}</span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={`/profielen/${profile.id}#profiel`}
            className="btn-outline btn-sm w-fit"
          >
            Profiel aanvullen
          </Link>
        </div>
      )}
    </div>
  );
}
