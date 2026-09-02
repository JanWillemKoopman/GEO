"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Fase, FaseStand } from "@/lib/sales/proces";

/**
 * Waar staat deze markt, en wat gebeurt er nu?
 *
 * ── WAAROM DIT BOVENAAN HET MARKTSCHERM STAAT ───────────────────────────────
 *
 * De pijplijn doet negen dingen achter elkaar en de gebruiker zag er één zin
 * van: "ORBIT ENGINE stelt de vragen aan de AI-assistenten." Dertien minuten
 * lang, zonder teller, en zonder dat er iets stond over de zestien schrijftaken
 * die stilletjes mislukt waren. Wie niet ziet dat een stap hangt, drukt nog een
 * keer op de knop, en elke druk is een rekening.
 *
 * ── DRIE DINGEN PER REGEL, EN NIET MEER ─────────────────────────────────────
 *
 * Wat er gebeurt, hoe ver het is, en wat jij moet doen. De vierde kolom die je
 * zou willen toevoegen (hoe lang het nog duurt) staat er bewust niet: dat weten
 * we niet, en een verzonnen schatting is erger dan geen schatting.
 *
 * ── HET SCHERM VERVERST ZICHZELF, MAAR ALLEEN ALS ER IETS DRAAIT ────────────
 *
 * Elke tien seconden, zolang er een stap bezig is. Staat alles stil of wacht het
 * op jou, dan gebeurt er niets: een pagina die zichzelf blijft verversen terwijl
 * er niets verandert, kost bandbreedte en laat een formulier onder je handen
 * wegspringen.
 */
export function Procesbalk({
  fases,
  samenvatting,
  actief,
  kostenUsd,
  ronde,
}: {
  fases: Fase[];
  samenvatting: string;
  actief: boolean;
  kostenUsd: number;
  ronde: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!actief) return;
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [actief, router]);

  const klaar = fases.filter((f) => f.stand === "klaar").length;

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Wat ORBIT ENGINE nu doet</h2>
          <p className="mt-1 text-secondary">{samenvatting}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ronde > 1 && <span className="chip chip-neutral">ronde {ronde}</span>}
          <span className="chip chip-neutral">
            {klaar} van de {fases.length} stappen klaar
          </span>
          {/* Wat deze markt tot nu toe gekost heeft. Stond nergens op een scherm,
              terwijl elke knop hier geld uitgeeft. */}
          <span className="chip chip-neutral">{euro(kostenUsd)} uitgegeven</span>
          {actief && <span className="chip chip-info">ververst zichzelf</span>}
        </div>
      </div>

      <ol className="flex flex-col gap-2">
        {fases.map((fase, i) => (
          <li key={fase.sleutel} className="flex items-start gap-3">
            <span className={bolletje(fase.stand)} aria-hidden="true">
              {teken(fase.stand, i + 1)}
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className={fase.stand === "wacht" ? "text-secondary" : "font-medium"}>
                  {fase.titel}
                </span>
                {fase.detail && <span className="mono-label">{fase.detail}</span>}
                {fase.stand === "bezig" && <span className="chip chip-info">bezig</span>}
                {fase.stand === "wacht_op_jou" && (
                  <span className="chip chip-warning">wacht op jou</span>
                )}
                {fase.stand === "mislukt" && <span className="chip chip-danger">liep vast</span>}
              </div>
              {fase.actie && <p className="text-sm text-secondary">{fase.actie}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Dollars naar euro's, want dat is de munt waarin de eigenaar denkt. */
function euro(usd: number): string {
  const bedrag = usd / 1.08;
  if (bedrag < 0.01) return "minder dan € 0,01";
  return `€ ${bedrag.toFixed(2).replace(".", ",")}`;
}

/**
 * Het bolletje voor de regel. Hergebruikt de chipkleuren uit het designsysteem,
 * zodat "bezig" hier dezelfde kleur heeft als het label ernaast.
 */
function bolletje(stand: FaseStand): string {
  const basis =
    "chip mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold";
  if (stand === "klaar") return `${basis} chip-success`;
  if (stand === "bezig") return `${basis} chip-info`;
  if (stand === "wacht_op_jou") return `${basis} chip-warning`;
  if (stand === "mislukt") return `${basis} chip-danger`;
  return `${basis} chip-neutral`;
}

function teken(stand: FaseStand, nummer: number): string {
  if (stand === "klaar") return "✓";
  if (stand === "mislukt") return "!";
  return String(nummer);
}
