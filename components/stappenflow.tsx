"use client";

import { Icon } from "@/components/icon";

export type StappenflowStap = {
  titel: string;
  content: React.ReactNode;
};

/**
 * De mobiele vorm van een lang beheerformulier: één sectie per scherm in
 * plaats van alle secties onder elkaar. GEMETEN als OKX' eigen patroon voor
 * een formulier op een telefoon (`redesign2026.md` §8.9, groep C in §8.12.2).
 *
 * Dit is geen kopie van de desktopervaring maar een ander ontwerp: op de
 * computer staat zo'n formulier in één keer met een sticky inhoudsopgave
 * ernaast, op de telefoon is dat niet te lezen en dus wordt het een reeks van
 * schermen, elk met precies één sectie.
 *
 * ── DE HOOFDACTIE STAAT BOVENAAN, ZONDER `column-reverse` ───────────────────
 *
 * OKX bereikt dat bij een modal (§7.13) door de knoppenrij om te draaien met
 * `flex-direction: column-reverse`. Hier staat er geen rij van twee gelijke
 * knoppen maar een hoofdknop (Volgende of Opslaan) en een secundaire knop
 * (Vorige): de hoofdknop staat gewoon als eerste in de JSX. Zelfde uitkomst,
 * geen omgekeerde volgorde in de DOM nodig om hem te krijgen.
 *
 * ── VASTZITTEN, ZONDER DE ONDERBALK TE OVERLAPPEN ───────────────────────────
 *
 * De balk is `fixed`, net als `ConfirmBar`
 * (`app/(app)/analyses/[id]/_editors/confirm-bar.tsx`, hetzelfde patroon voor
 * de desktopstand), met dezelfde spacer-truc zodat de laatste regel van de
 * sectie er nooit onder verdwijnt. `bottom` is niet 0 maar `56px` plus de
 * veilige zone: dat is precies de hoogte van `BottomNav` (`.onderbalk` in
 * globals.css), en zonder die optelsom komt de opslagbalk boven op de
 * navigatie te staan.
 */
export function Stappenflow({
  stappen,
  huidige,
  onVorige,
  onVolgende,
  onOpslaan,
  bezig,
  opslaanLabel = "Opslaan",
}: {
  stappen: StappenflowStap[];
  /** 0-gebaseerd: de eerste sectie is `0`. */
  huidige: number;
  onVorige: () => void;
  onVolgende: () => void;
  onOpslaan: () => void;
  /** Schakelt beide knoppen uit terwijl `onOpslaan` loopt. */
  bezig?: boolean;
  opslaanLabel?: string;
}) {
  const stap = stappen[huidige];
  const laatsteStap = huidige === stappen.length - 1;
  const voortgang = Math.round(((huidige + 1) / stappen.length) * 100);

  return (
    <div className="stappenflow">
      <div className="stappenflow-kop">
        <span className="type-caption text-muted">
          Stap {huidige + 1} van {stappen.length}
        </span>
        <span className="type-compact-emphasis">{stap.titel}</span>
      </div>

      <div
        className="stappenflow-voortgang"
        role="progressbar"
        aria-valuenow={huidige + 1}
        aria-valuemin={1}
        aria-valuemax={stappen.length}
        aria-label={`Stap ${huidige + 1} van ${stappen.length}`}
      >
        <div className="stappenflow-voortgang-balk" style={{ width: `${voortgang}%` }} />
      </div>

      <div className="stappenflow-inhoud">{stap.content}</div>

      {/* Reserveert dezelfde ruimte als de vaste balk eronder hoog is, zodat de
          laatste regel van de sectie er nooit achter verdwijnt. */}
      <div className="stappenflow-voet-ruimte" aria-hidden />
      <div className="stappenflow-voet no-print">
        <button
          type="button"
          className="btn-primary w-full"
          onClick={laatsteStap ? onOpslaan : onVolgende}
          disabled={bezig}
        >
          {laatsteStap ? opslaanLabel : "Volgende"}
          {!laatsteStap && <Icon naam="verder" size={16} />}
        </button>
        {huidige > 0 && (
          <button type="button" className="btn-outline w-full" onClick={onVorige} disabled={bezig}>
            <Icon naam="terug" size={16} />
            Vorige
          </button>
        )}
      </div>
    </div>
  );
}
