import Link from "next/link";
import { Icon } from "@/components/icon";
import type { Insight } from "@/lib/insights";
import {
  OPPORTUNITY_ACTION_LABEL,
  OPPORTUNITY_ICON,
  paginaPad,
  potentieVarieert,
  reachLabel,
  reachShort,
  type Opportunity,
} from "@/lib/opportunities";

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
 *
 * ── ⚠️ ZES GELIJKE KAARTEN WERDEN ÉÉN KANS PLUS EEN LIJST (25 AUGUSTUS 2026) ─
 *
 * Er stonden zes kaarten van gelijke maat, gelijk gewicht en gelijke kleur onder
 * elkaar, samen zo'n 700 pixels. Elk met rechtsboven een groene chip die bij
 * Gasservice Brabant zes keer exact "Potentie 68/100 (hoge)" zei. Die chip
 * beloofde een rangorde die er niet was (zie `potentieVarieert`), stond in
 * groen terwijl hij een gát markeert, en kostte de plek waar iets had kunnen
 * staan dat wél verschilt.
 *
 * Nu draagt de eerste regel het gewicht en is de rest een lijst. Wat de rijen
 * onderscheidt staat rechts: hoeveel gemeten vragen de kans raakt. Wat voor werk
 * het is, staat als woord onder de titel in plaats van alleen als tekening.
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
  // De chip verschijnt alleen als hij twee kansen uit elkaar houdt. Zie
  // `potentieVarieert` voor waarom dat bij één onderwerp nooit zo is.
  const toonPotentie = potentieVarieert(zichtbaar);

  const [eerste, ...overige] = zichtbaar;

  return (
    <div className="flex flex-col gap-3">
      {/* De eerste kans is het antwoord op "waar begin je". Hij krijgt de
          stang, een grotere titel en de enige knop van deze lijst. */}
      <div className="card card-rail">
        <KansRegel kans={eerste} toonPotentie={toonPotentie} eerste />
      </div>

      {overige.length > 0 && (
        <ul className="card flex flex-col gap-0 py-0">
          {overige.map((o) => (
            <li
              key={o.id}
              className="border-t border-[var(--border-subtle)] py-4 first:border-t-0"
            >
              <KansRegel kans={o} toonPotentie={toonPotentie} />
            </li>
          ))}
        </ul>
      )}

      {rest > 0 &&
        (restHref ? (
          <Link
            href={restHref}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold hover:underline"
          >
            Bekijk de {rest === 1 ? "laatste kans" : `${rest} overige kansen`}
            <Icon naam="naar" size={14} />
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

/**
 * Eén kans: waar het over gaat, wat voor werk het is, en wat je doet.
 *
 * ⚠️ De eerste regel krijgt `btn-outline` en géén `btn-primary`. De enige
 * primaire knop van dit scherm hoort bij wat er op de klant wácht (zijn eigen
 * werk), niet bij een advies. Twee primaire knoppen op één scherm laten de
 * klant kiezen welke van de twee nu de hoofdactie is, en dan is er geen.
 */
function KansRegel({
  kans,
  toonPotentie,
  eerste = false,
}: {
  kans: Opportunity;
  toonPotentie: boolean;
  eerste?: boolean;
}) {
  // Kort in de kolom, de volle zin in de tooltip. Zie `reachShort`.
  const omvang = reachShort(kans.raakt, kans.gemeten);
  const omvangVol = reachLabel(kans.raakt, kans.gemeten);
  const pad = paginaPad(kans.url);

  return (
    <div className="flex gap-3">
      {/* ⚠️ Het icoon staat in de leeskleur en niet in de merkkleur. Twaalf
          paarse tekeningen onder elkaar trekken de blik naar de linkerrand,
          terwijl de titel het antwoord draagt (`docs/designsystem.md` §6b.2:
          currentColor, altijd). Sinds 25 augustus 2026 staat het verschil tussen
          nieuw werk en een correctie óók als woord in de regel eronder: een
          tekening van 18 pixels alleen is te weinig om op te plannen. */}
      <span className={`text-secondary ${eerste ? "pt-1" : "pt-0.5"}`}>
        <Icon naam={OPPORTUNITY_ICON[kans.handeling]} size={eerste ? 20 : 18} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          <span className={eerste ? "text-lg font-semibold" : "font-semibold"}>{kans.title}</span>
          {/* Rechts één kolom met wat de kansen onderling vergelijkbaar maakt.
              De chip staat er alleen bij als de potentiescore in deze lijst
              daadwerkelijk uiteenloopt, en dan neutraal: een gat dat te winnen
              valt is geen goed nieuws, dus geen groen. */}
          {(omvang || (toonPotentie && kans.potential !== null)) && (
            <span className="flex shrink-0 flex-col items-end gap-1 text-right">
              {omvang && (
                <span className="mono-label" title={omvangVol ?? undefined}>
                  {omvang}
                </span>
              )}
              {toonPotentie && kans.potential !== null && (
                <span className="chip chip-neutral">Potentie {kans.potential}/100</span>
              )}
            </span>
          )}
        </div>

        {/* Wat voor werk dit is, en op welke pagina. Het volledige adres zit in
            `title`, zodat hoveren het alsnog geeft; het pad is wat je leest. */}
        <span className="mono-label flex flex-wrap items-center gap-x-2">
          <span>{OPPORTUNITY_ACTION_LABEL[kans.handeling]}</span>
          {pad && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate" title={kans.url ?? undefined}>
                {pad}
              </span>
            </>
          )}
        </span>

        {/* Leeg als het vangnet de hele modeltekst heeft weggelaten. Dan staat
            er niets in plaats van een half afgebroken zin. */}
        {kans.why && <span className="pt-0.5 text-sm text-secondary">{kans.why}</span>}

        <span className="pt-2">
          {kans.href ? (
            eerste ? (
              <Link href={kans.href} className="btn-outline btn-sm">
                {kans.action}
                <Icon naam="naar" size={14} />
              </Link>
            ) : (
              // ⚠️ In de leeskleur, met een pijl erachter. De merkkleur is in dit
              // product de kleur van de primaire knop; zes gekleurde regels onder
              // elkaar maken van een lijst een muur van gelijkwaardige
              // hoofdacties.
              <Link
                href={kans.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              >
                {kans.action}
                <Icon naam="naar" size={14} />
              </Link>
            )
          ) : (
            <span className="text-sm font-semibold">{kans.action}</span>
          )}
        </span>
      </div>
    </div>
  );
}
