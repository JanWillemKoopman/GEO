import { ExternalLink } from "@/components/external-link";
import { Icon } from "@/components/icon";
import {
  groupOfferings,
  marketSplitSentence,
  offeringSentence,
  type OfferingView,
} from "@/lib/reputation/screen";

/**
 * Hoofdstuk 02: per product en dienst. Het hart van dit scherm.
 *
 * ── WAT HIER STOND, EN WAAROM HET NIETS ZEI ─────────────────────────────────
 *
 * Twaalf dichtgeklapte accordeons onder elkaar, alle twaalf met dezelfde badge
 * "1 vraag", alle twaalf met dezelfde toonchip "neutraal 0". Klapte je er een
 * open, dan stond er "ChatGPT geeft een neutrale toon van 0" en verder niets,
 * want de plus- en minpunten van een aanbodrij vullen pas bij twee of meer
 * vragen per product. De klant kocht dit product om te zien waar het per dienst
 * misgaat en kreeg twaalf keer hetzelfde te zien.
 *
 * ── DE DRIE GROEPEN, EN WAAROM DE STAAT DE KOP IS ───────────────────────────
 *
 * Wat wél per product verschilt is of ChatGPT je noemt als een koper vraagt wie
 * hij moet hebben. Bij Gasservice Brabant: 4 keer wel, 5 keer niet, 3 keer niet
 * gevraagd. Die drie groepen zijn de indeling, met de groep waar het misgaat
 * bovenaan, en per regel staat wie ChatGPT in jouw plaats noemt.
 *
 * Een groepskop is bovendien het enige wat een lijst van twaalf leesbaar maakt
 * zonder te openen: je ziet de verdeling voordat je één regel aanklikt.
 *
 * ── ⚠️ EEN REGEL OPENT MET WAT ER GEZEGD IS, NIET MET EEN CIJFER ────────────
 *
 * Opengeklapt staat er eerst wat ChatGPT positief noemt en wat hij als bezwaar
 * noemt, over dít product, uit de antwoorden zelf. Daarna pas de bronnen en het
 * letterlijke antwoord. `ux-design.md` §1: bewijs verslaat cijfer.
 */
export function OfferingList({
  views,
  brand,
}: {
  views: OfferingView[];
  brand: string;
}) {
  if (views.length === 0) {
    return (
      <div className="card flex flex-col gap-1">
        <span className="mono-label">Niets per product gemeten</span>
        <p className="text-secondary">
          Deze analyse leverde geen uitkomst per product op. Dat gebeurt als het merkprofiel nog
          geen diensten of producten bevat.
        </p>
      </div>
    );
  }

  const groepen = groupOfferings(views);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-secondary">{marketSplitSentence(groepen, brand)}</p>

      <Groep
        titel="Hier noemt ChatGPT anderen en jou niet"
        uitleg="Dit zijn de producten waar je een koper misloopt op het moment dat hij kiest. De bedrijven achter de regel zijn wie hij in jouw plaats noemt."
        views={groepen.nietGenoemd}
        brand={brand}
        toon="waarschuwing"
      />
      <Groep
        titel="Hier noemt ChatGPT je wel"
        uitleg="Je staat in de aanbeveling. De slechtste plek staat bovenaan, want daar valt het meeste te winnen."
        views={groepen.genoemd}
        brand={brand}
        toon="goed"
      />
      <Groep
        titel="Hier is die vraag niet gesteld"
        uitleg="Over deze producten is wel gemeten hoe ChatGPT erover praat, maar niet wie hij aanraadt. Kijk bij de kanttekening bovenaan waarom."
        views={groepen.nietGevraagd}
        brand={brand}
        toon="neutraal"
      />
    </div>
  );
}

function Groep({
  titel,
  uitleg,
  views,
  brand,
  toon,
}: {
  titel: string;
  uitleg: string;
  views: OfferingView[];
  brand: string;
  toon: "waarschuwing" | "goed" | "neutraal";
}) {
  if (views.length === 0) return null;

  // De tint zit op de stang links van de groep en niet op de tekst. Een hele
  // lijst in kleur leest als een foutmelding (`designsystem.md` §6b.1).
  const stang =
    toon === "waarschuwing"
      ? "var(--intent-warning-solid)"
      : toon === "goed"
        ? "var(--intent-growth-solid)"
        : "var(--border-strong)";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 border-l-2 pl-3" style={{ borderColor: stang }}>
        <h3 className="type-compact-emphasis">
          {titel} <span className="text-muted">({views.length})</span>
        </h3>
        <p className="type-caption text-muted">{uitleg}</p>
      </div>

      <div className="flex flex-col divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
        {views.map((v) => (
          <Regel key={v.name} v={v} brand={brand} />
        ))}
      </div>
    </div>
  );
}

/**
 * Eén product.
 *
 * `details` en geen eigen open-staat: dit is een servercomponent en de browser
 * doet het openklappen zelf. Twaalf van deze regels kostten eerder twaalf
 * client-componenten.
 */
function Regel({ v, brand }: { v: OfferingView; brand: string }) {
  const heeftVerdieping =
    v.pros.length > 0 || v.cons.length > 0 || v.gaps.length > 0 || v.answers.length > 0;

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 transition-colors hover:bg-[var(--bg-elevated)]">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="type-compact-emphasis">{v.name}</span>
          <span className="type-caption text-secondary">{offeringSentence(v, brand)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {/* ⚠️ Alleen wat onderscheidt. De badge zei eerder twaalf keer "1 vraag";
              dit is het aantal bezwaren dat ChatGPT bij dít product noemde, en dat
              liep op de echte run van 3 tot 8. */}
          {v.cons.length > 0 && (
            <span className="type-caption text-muted">
              {v.cons.length} {v.cons.length === 1 ? "bezwaar" : "bezwaren"}
            </span>
          )}
          {heeftVerdieping && (
            <span className="text-muted transition-transform group-open:rotate-180">
              <Icon naam="openen" />
            </span>
          )}
        </span>
      </summary>

      {heeftVerdieping && (
        <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] p-3">
          {(v.pros.length > 0 || v.cons.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Punten kop="Wat ChatGPT positief noemt" punten={v.pros} leeg="Niets positiefs benoemd." />
              <Punten kop="Wat ChatGPT als bezwaar noemt" punten={v.cons} leeg="Geen bezwaren benoemd." />
            </div>
          )}

          {v.gaps.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="mono-label">Wat ChatGPT niet kon vinden</span>
              <ul className="flex flex-col gap-1 type-compact text-secondary">
                {v.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              <p className="type-caption text-muted">
                Dit gaat niet over je werk maar over wat er online over dit product te vinden is.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="type-caption text-muted">
              {v.sources === 0
                ? "Geen bron onder dit oordeel"
                : v.sources === 1
                  ? "1 bron onder dit oordeel"
                  : `${v.sources} bronnen onder dit oordeel`}
            </span>
            {v.visibilityScore !== null && (
              <span className="type-caption text-muted">
                zichtbaarheid {Math.round(v.visibilityScore)}% in de gewone meting
              </span>
            )}
          </div>

          {v.answers.map((a) => (
            <details key={a.id} className="type-caption">
              <summary className="cursor-pointer text-muted">
                Lees wat ChatGPT letterlijk antwoordde
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                <p className="text-muted italic">{a.question}</p>
                <p className="whitespace-pre-wrap type-compact text-secondary">{a.answer_text}</p>
                {a.cited_urls.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {a.cited_urls.slice(0, 6).map((u) => (
                      <li key={u} className="break-url">
                        <ExternalLink href={u}>{u}</ExternalLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </details>
  );
}

function Punten({ kop, punten, leeg }: { kop: string; punten: string[]; leeg: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mono-label">{kop}</span>
      {punten.length === 0 ? (
        <p className="type-caption text-muted">{leeg}</p>
      ) : (
        <ul className="flex flex-col gap-1 type-compact text-secondary">
          {punten.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
