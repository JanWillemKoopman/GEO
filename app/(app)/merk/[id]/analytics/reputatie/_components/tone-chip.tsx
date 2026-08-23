import { toneWord } from "@/lib/reputation/tone";

/**
 * De toon als woord met een kleur, nooit als kaal getal.
 *
 * ── WAAROM HIER EEN WOORD STAAT EN GEEN CIJFER ──────────────────────────────
 *
 * "+12" zegt een ondernemer niets, en erger: het ziet eruit als een rapportcijfer
 * en dan leest hij een 12 op 100. Het woord zegt wat het betekent, het getal
 * staat er klein achter voor wie het wil narekenen.
 *
 * ⚠️ `null` toont "geen beeld" en NIET "neutraal". Nul is neutraal, en een
 * assistent die niets over je weet is niet neutraal over je (conventie 3). Het
 * verschil is precies het advies: bij neutraal ga je aan je verhaal werken, bij
 * geen beeld ga je eerst zorgen dat je überhaupt gevonden wordt.
 */
export function ToneChip({
  index,
  showNumber = true,
}: {
  index: number | null;
  showNumber?: boolean;
}) {
  if (index === null) {
    return (
      <span className="chip chip-neutral" title="ChatGPT heeft hier geen beeld van.">
        geen beeld
      </span>
    );
  }

  // De drempels lopen gelijk met `toneWord()`, zodat kleur en woord nooit iets
  // anders zeggen. Kleur is hier de secundaire drager: het woord staat er
  // altijd bij (designsystem.md §C, principe 5).
  const klasse =
    index >= 20 ? "chip-success" : index > -20 ? "chip-neutral" : "chip-warning";

  return (
    <span className={`chip ${klasse}`}>
      {toneWord(index)}
      {showNumber && <span className="text-muted"> {index > 0 ? `+${index}` : index}</span>}
    </span>
  );
}

/**
 * De bewijskracht, met de reden dat hij ernaast staat erbij.
 *
 * ⚠️ Dit cijfer mag NOOIT los van de toon getoond worden, en de toon nooit los
 * van dit cijfer. Dat is de hele les van §2.1: een toon van +65 bij een
 * bewijskracht van 10 is geen compliment maar lucht, en dat is de meest
 * voorkomende uitkomst bij een MKB-bedrijf. Zonder deze kolom maakt dit product
 * van een onzichtbaar bedrijf een gerustgesteld bedrijf.
 */
export function EvidenceChip({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="chip chip-neutral">niet vastgesteld</span>;
  }
  const klasse = score >= 60 ? "chip-success" : score >= 25 ? "chip-neutral" : "chip-warning";
  return <span className={`chip ${klasse}`}>bewijs {score}</span>;
}

/** De plaats als plaats, niet als percentage. `null` toont "geen plaats". */
export function RankChip({
  position,
  of,
  indicative,
}: {
  position: number | null;
  of: number | null;
  indicative: boolean;
}) {
  if (position === null || of === null) {
    return (
      <span
        className="chip chip-neutral"
        title="ChatGPT kende te weinig partijen om een volgorde te maken."
      >
        geen plaats
      </span>
    );
  }

  // ⚠️ Een plaats en geen vierde percentage. "Tweede van vier" is een andere
  // soort uitspraak dan "68 op 100", en die twee horen niet naast elkaar te
  // staan alsof ze hetzelfde zeggen.
  const afgerond = Math.round(position * 10) / 10;
  return (
    <span className="chip chip-neutral">
      {afgerond}e van {of}
      {indicative && <span className="text-muted"> · indicatief</span>}
    </span>
  );
}
