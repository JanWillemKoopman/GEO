import Link from "next/link";
import { Icon } from "@/components/icon";
import type { Insight } from "@/lib/insights";
import { OPPORTUNITY_ICON, reachLabel, type Opportunity } from "@/lib/opportunities";
import { potentialBand, POTENTIAL_BAND_LABEL } from "@/lib/potential";

/**
 * De twee blokken van fase 6: wat er gebeurde, en waar je begint.
 *
 * Servercomponenten, want er valt niets te klikken behalve links. Dat scheelt
 * de hele client-bundel voor tekst.
 */

/**
 * De tint van de stip voor een inzichtregel.
 *
 * ⚠️ De `-solid`-varianten en niet de `-text`-varianten. Die laatste zijn
 * gekozen om leesbaar te zijn ALS tekst op wit, en dat maakt ze donker. Op een
 * stip van 6 pixels leest donkergroen als zwart, en dan is het verschil tussen
 * een goede en een neutrale regel weg. De `-solid`-tint is bedoeld voor
 * gevulde vlakken, en dat is precies wat een stip is.
 */
const TOON_KLEUR: Record<Insight["toon"], string> = {
  goed: "var(--intent-growth-solid)",
  let_op: "var(--intent-warning-solid)",
  neutraal: "var(--border-strong)",
};

const POTENTIAL_CHIP_TONE: Record<ReturnType<typeof potentialBand>, string> = {
  hoog: "chip-success",
  gemiddeld: "chip-info",
  beperkt: "chip-neutral",
  onbekend: "chip-neutral",
};

/**
 * Drie zinnen: wat er gebeurde, wat dat betekent, wat nu.
 *
 * Geen kop met een getal erin en geen grafiek. Fase 6 ("de lus sluiten") vroeg
 * om "drie zinnen die zeggen wat er deze maand gebeurde en wat de volgende stap
 * is", en dat is precies zoveel als iemand leest voordat hij doorklikt.
 *
 * ── ⚠️ GEEN EIGEN KAART MEER (24 AUGUSTUS 2026) ─────────────────────────────
 *
 * Dit was een losse sectie met een eigen kop, en de eerste zin ervan herhaalde
 * het hoofdcijfer dat twee blokken hoger al stond: "De eerste meting staat op 0
 * van de 100" onder een kaart die 0% toonde. `docs/ux-design.md` §1 kent maar
 * één hoofdgetal, en de duiding hoort ernaast en niet in een eigen blok. De
 * zinnen staan nu ín de stand-kaart, als de uitleg bij dat cijfer.
 */
export function InsightLines({ insights }: { insights: Insight[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {insights.map((i, n) => (
        <li key={n} className="flex items-start gap-2.5 text-sm">
          {/* Een getekende stip en geen bullet-teken. Het teken • kwam uit de
              tekstlaag: het erfde de regelhoogte, stond per lettertype op een
              andere hoogte en was op sommige platforms nauwelijks zichtbaar
              (`docs/designsystem.md` §6b.1). Deze stip heeft een vaste maat en
              staat met `mt-[7px]` op de x-hoogte van de eerste regel. */}
          <span
            aria-hidden
            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-[var(--radius-pill)]"
            style={{ background: TOON_KLEUR[i.toon] }}
          />
          {/* ⚠️ De ZIN blijft in de leeskleur, alleen de stip kleurt. Een hele
              regel in groen of oranje leest slechter dan dezelfde regel in
              zwart, en op een kaart met drie regels waarvan er twee gekleurd
              zijn, ziet het eruit als een foutmelding. De stip draagt de toon,
              de zin draagt de betekenis. */}
          <span className={i.toon === "neutraal" ? "text-secondary" : undefined}>{i.text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Alle kansen op één rij, met de handeling erbij.
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Adviezen zaten verspreid over het rapport, de onderwerpenlijst en de
 * technische audit. Elk daarvan is op zichzelf te volgen, maar samen
 * beantwoordden ze de enige vraag die de klant echt stelt niet: waar begin ik.
 */
export function OpportunitiesBlock({
  opportunities,
  limiet = 6,
  restHref,
}: {
  opportunities: Opportunity[];
  /** Meer dan zes kansen leest niemand in één keer. */
  limiet?: number;
  /**
   * Waar de kansen staan die niet in de lijst passen. Zonder dit is de regel
   * "en nog 7 kansen" een dood einde: de klant weet dan dat er meer is en niet
   * waar (`docs/ux-design.md` §4).
   */
  restHref?: string;
}) {
  if (opportunities.length === 0) {
    return (
      <p className="text-secondary">
        Er staat op dit moment niets open. De volgende meetronde levert vanzelf
        nieuwe kansen op.
      </p>
    );
  }

  const zichtbaar = opportunities.slice(0, limiet);
  const rest = opportunities.length - zichtbaar.length;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {zichtbaar.map((o) => {
          // Fase 2, docs/tasks/potentiescore.md: de potentiescore is
          // vergelijkbaar over alle onderwerpen van dit merk en gaat daarom
          // voor. Het aantal geraakte vragen is het vangnet zolang dit merk nog
          // geen enkele profielbrede herberekening had.
          const band = potentialBand(o.potential);
          const omvang = reachLabel(o.raakt, o.gemeten);
          return (
            <li key={o.id} className="card flex gap-3">
              {/* ⚠️ Het icoon staat in de leeskleur en niet in de merkkleur.
                  Twaalf paarse tekeningen onder elkaar trekken de blik naar de
                  linkerrand, terwijl de titel het antwoord draagt
                  (`docs/designsystem.md` §6b.2: currentColor, altijd). Het
                  verschil tussen "nieuwe pagina" en "bestaande pagina
                  bijwerken" zit in de tekening, niet in een tint. */}
              <span className="pt-0.5 text-secondary">
                <Icon naam={OPPORTUNITY_ICON[o.handeling]} size={18} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                {/* De chip rechts uitgelijnd op dezelfde regel als de titel: hij
                    draagt het getal waarop deze lijst gesorteerd is, dus hij
                    hoort in één kolom te staan en niet achter elke titel op een
                    andere plek. */}
                <span className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{o.title}</span>
                  {o.potential !== null ? (
                    <span className={`chip shrink-0 ${POTENTIAL_CHIP_TONE[band]}`}>
                      Potentie {o.potential}/100 ({POTENTIAL_BAND_LABEL[band].replace(" potentie", "")})
                    </span>
                  ) : (
                    omvang && <span className="chip chip-info shrink-0">{omvang}</span>
                  )}
                </span>
                {/* Leeg als het vangnet de hele modeltekst heeft weggelaten. Dan
                    staat er niets in plaats van een half afgebroken zin. */}
                {o.why && <span className="text-sm text-secondary">{o.why}</span>}
                {/* De handeling IS de link. Er stond een vette regel met daarnaast
                    een los "Ga erheen": twee elementen voor één stap, en het
                    klikbare deel was het deel dat niet zei wat er ging gebeuren.

                    ⚠️ In de leeskleur, met een pijl erachter. De merkkleur is in
                    dit product de kleur van de primaire knop; twaalf paarse
                    regels onder elkaar maken van een lijst een muur van
                    gelijkwaardige hoofdacties. Onderstrepen bij hover en het
                    pijltje zeggen dat het klikbaar is. */}
                <span className="pt-1 text-sm font-semibold">
                  {o.href ? (
                    <Link
                      href={o.href}
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      {o.action}
                      <Icon naam="naar" size={14} />
                    </Link>
                  ) : (
                    o.action
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {rest > 0 &&
        (restHref ? (
          <Link href={restHref} className="mono-label w-fit hover:underline">
            Nog {rest} {rest === 1 ? "kans" : "kansen"} met een kleiner effect
          </Link>
        ) : (
          <p className="text-sm text-muted">
            En nog {rest} {rest === 1 ? "kans" : "kansen"}, met een kleiner of
            onbekend effect.
          </p>
        ))}
    </div>
  );
}
