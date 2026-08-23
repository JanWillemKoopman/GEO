import { InfoHint } from "@/components/info-hint";
import { REPUTATION_CRITERIA, CRITERION_LABEL, criterionLabel } from "@/lib/types/database";
import type { ReputationRank, ReputationRun } from "@/lib/types/database";

/**
 * Blok 5: de vergelijking met de concurrenten (§3.2 en §4.4).
 *
 * ── HET VERSCHIL MET HET SCHERM "CONCURRENTEN", EN HET MAG NIET VERVAGEN ────
 *
 * Dat scherm telt hoe VAAK een concurrent uit de metingen komt: een frequentie,
 * opgebouwd uit antwoorden op koopvragen waarin het merk toevallig voorkwam.
 * Deze tabel legt de partijen expliciet naast elkaar en vraagt om een OORDEEL
 * per criterium. Het eerste antwoordt op "wie komt er vaker voorbij", het tweede
 * op "wie zou je aanraden, en waarom".
 *
 * Juist dat verschil is bruikbaar: vaker genoemd worden en tóch verliezen zodra
 * iemand kiest, is een ander probleem dan onzichtbaar zijn.
 *
 * ── ⚠️ ZONDER CONCURRENTEN GEEN LEGE TABEL ──────────────────────────────────
 *
 * Dan staat er de uitleg waarom er niets te vergelijken viel. Een lege tabel met
 * streepjes leest als een storing; deze tekst leest als een stand van zaken, en
 * hij zegt bovendien wat eraan te doen is.
 */
export function RivalTable({
  run,
  ranks,
  brandName,
}: {
  run: ReputationRun;
  /** Alleen de merkbrede plaatsen: die van de aanbodknopen staan bij blok 4. */
  ranks: ReputationRank[];
  brandName: string;
}) {
  const partijen = [brandName, ...run.rivals];

  if (run.rivals.length === 0 || ranks.length === 0) {
    const reden =
      (run.scope_json as { concurrenten?: { reden?: string } } | null)?.concurrenten?.reden ??
      "ORBIT ENGINE kent nog geen concurrenten van dit merk.";
    return (
      <div className="card flex flex-col gap-1">
        <span className="mono-label">Niet vergeleken</span>
        <p className="text-secondary">{reden}</p>
        <p className="text-sm text-muted">
          De rest van deze pagina klopt gewoon: de toon en de bronnen zijn wél gemeten. Alleen de
          vraag &quot;kiest AI jou of een ander&quot; kon niet gesteld worden.
        </p>
      </div>
    );
  }

  // Per criterium per partij de gemiddelde plaats. Bewust het GEMIDDELDE van de
  // plaatsen en niet van de scores: onder de tabel staat een plaats, en die kun
  // je niet uit een gemiddelde score terugrekenen zodra de noemer per oordeel
  // verschilt.
  const cel = new Map<string, { som: number; n: number }>();
  for (const r of ranks) {
    if (r.position === null) continue;
    const sleutel = `${r.criterion}|${r.party_name.toLowerCase()}`;
    const bestaand = cel.get(sleutel) ?? { som: 0, n: 0 };
    bestaand.som += r.position;
    bestaand.n++;
    cel.set(sleutel, bestaand);
  }

  // Hoeveel van de gevraagde concurrenten kende het model niet? Een partij die
  // in geen enkel oordeel gekend was, telde nergens mee.
  const onbekend = run.rivals.filter(
    (naam) =>
      !ranks.some(
        (r) => r.party_name.trim().toLowerCase() === naam.trim().toLowerCase() && r.known,
      ),
  ).length;

  const waarde = (criterium: string, partij: string): string => {
    const v = cel.get(`${criterium}|${partij.toLowerCase()}`);
    // ⚠️ Een streepje en geen laatste plaats. Het model heeft deze partij geen
    // plaats gegeven, en dat is iets anders dan een slecht oordeel.
    if (!v || v.n === 0) return "-";
    return (Math.round((v.som / v.n) * 10) / 10).toFixed(1);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="card flex flex-col gap-3">
        <span className="mono-label flex items-center gap-1">
          Wie er vergeleken is
          <InfoHint label="Hoe zijn deze partijen gekozen?">
            Uit de merken die daadwerkelijk uit je metingen naar boven kwamen, op hoe vaak ze
            genoemd zijn. Wat je zelf hebt weggezet als &quot;geen concurrent van mij&quot; komt er
            nooit in, en een vergelijkingssite of brancheorganisatie ook niet. Klopt de selectie
            niet, pas hem dan aan op het scherm Concurrenten: die keuze werkt hier vanzelf door.
          </InfoHint>
        </span>
        <p className="text-sm text-secondary">
          {(run.scope_json as { concurrenten?: { reden?: string } } | null)?.concurrenten?.reden}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-1 pr-4 font-normal">Onderwerp</th>
                {partijen.map((p, i) => (
                  <th key={p} className="py-1 pr-4 font-normal">
                    {i === 0 ? "jij" : p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REPUTATION_CRITERIA.map((c) => (
                <tr key={c} className="border-t border-[var(--border-subtle)]">
                  <td className="py-1.5 pr-4 font-medium">{CRITERION_LABEL[c]}</td>
                  {partijen.map((p, i) => (
                    <td
                      key={p}
                      className="stat-value py-1.5 pr-4"
                      // De eigen kolom gemarkeerd, zodat je hem in één oogopslag
                      // terugvindt zonder de koprij te hoeven lezen.
                      style={i === 0 ? { background: "var(--bg-elevated)" } : undefined}
                    >
                      {waarde(c, p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-muted">
          Lager is beter: 1,0 betekent dat ChatGPT je op dat onderwerp steeds als eerste zet.
          Een streepje betekent dat ChatGPT die partij op dat onderwerp geen plaats gaf.
        </p>

        {/* ⚠️ De eerlijkste zin die dit blok kan geven, en hij ontbrak. Bij de
            eerste echte run kende ChatGPT twee van de drie concurrenten niet:
            te kleine, regionale bedrijven. Wat overbleef was een vergelijking
            tegen één partij, en dat zag de klant nergens terug. Nu wel, want
            "AI kent je concurrenten niet" is zelf een bevinding: het betekent
            dat er in jouw markt weinig te winnen valt op vergelijkingsvragen,
            en dat is heel iets anders dan een slechte plaats. */}
        {onbekend > 0 && (
          <p className="text-sm text-muted">
            ChatGPT kende {onbekend === run.rivals.length ? "geen enkele" : `${onbekend} van de ${run.rivals.length}`}{" "}
            {run.rivals.length === 1 ? "concurrent" : "concurrenten"} goed genoeg om er iets over
            te zeggen. Die {onbekend === 1 ? "partij telt" : "partijen tellen"} daarom niet mee in
            je plaats. Dat je concurrenten onbekend zijn bij AI is zelf een uitkomst: er valt in
            jouw markt weinig te verliezen op een vergelijkingsvraag.
          </p>
        )}

        {/* ⚠️ De chip `indicatief` is geen slag om de arm maar een gemeten
            eigenschap van taalmodellen: staat de uitkomst op één vergelijking,
            dan kan de volgorde van de vraag hem gekleurd hebben. */}
        {run.rank_indicative && (
          <p className="text-sm text-muted">
            <span className="chip chip-neutral">indicatief</span>{" "}
            {run.order_bias !== null && run.order_bias > 0.45
              ? "ChatGPT koos bij deze meting opvallend vaak het bedrijf dat als eerste in de vraag stond. De volgorde hierboven zegt daardoor meer over de vraagstelling dan over de markt."
              : "Deze uitslag rust op te weinig herhalingen om hem hard te noemen. Een taalmodel bevoordeelt de partij die het eerst genoemd wordt, en dat effect middelt pas uit over meer vergelijkingen."}
          </p>
        )}
      </div>

      {/* Twee zinnen die de tabel samenvatten, want een tabel is geen conclusie. */}
      {(run.wins_on.length > 0 || run.loses_on.length > 0) && (
        <div className="card flex flex-col gap-1">
          <span className="mono-label">Wat de tabel zegt</span>
          <p className="text-secondary">
            {run.wins_on.length > 0 && (
              <>
                Je wint op {run.wins_on.map((c) => criterionLabel(c).toLowerCase()).join(" en ")}
                {run.loses_on.length > 0 ? " en " : "."}
              </>
            )}
            {run.loses_on.length > 0 && (
              <>
                {run.wins_on.length === 0 && "Je "}verliest op{" "}
                {run.loses_on.map((c) => criterionLabel(c).toLowerCase()).join(" en ")}.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
