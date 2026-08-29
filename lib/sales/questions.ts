/**
 * De vragen van een marktmeting: de plekken vullen en de vraag aan het model
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 10).
 *
 * Bewust ZONDER `server-only`, conventie 2. Wat hier staat bepaalt welke vragen
 * er gemeten worden, en dat is de meetlat onder elke score, elke kans en elke
 * zin in een verkoopmail. Zoiets hoort testbaar te zijn vanuit
 * `scripts/test-unit.ts`, zonder database en zonder API-sleutel.
 */
import {
  isIntentStage,
  normaliseerLabel,
  STAGE_LABEL,
  STAGE_HELP,
  type Intentie,
  type IntentStage,
  type VerdeeldeVraag,
} from "@/lib/sales/intents";

export interface GegenereerdeVraag {
  text: string;
  intentLabel: string;
  stage: IntentStage;
  weight: number;
  position: number;
}

/**
 * De geleverde vragen op de plekken leggen die er te vullen waren.
 *
 * ⚠️ **Dit is het vangnet in code** (conventie 1). Wat er misgaat als het er
 * niet is, gaat stil mis: het model levert vragen met een etiket dat net anders
 * geschreven is, of twee vragen voor dezelfde plek en geen voor een andere. Dan
 * krijgt een intentie negen vragen en een andere één, en de intent gap uit
 * hoofdstuk 12 meet iets wat er niet is.
 *
 * Drie regels:
 *
 * 1. Een vraag hoort bij een plek met hetzelfde etiket en dezelfde fase. Past
 *    hij nergens meer, dan valt hij af.
 * 2. Dezelfde vraagtekst telt één keer. De database dwingt dat ook af, maar een
 *    botsing daar is een mislukte taak in plaats van een genegeerde regel.
 * 3. Een plek die leeg blijft, blijft leeg en wordt gemeld. Er wordt niet
 *    stilletjes een vraag van een andere intentie in geschoven, want dan meet je
 *    intentie A onder het etiket van intentie B.
 */
export function koppelVragen(
  plekken: VerdeeldeVraag[],
  geleverd: { intent_label: string; fase: string; vraag: string }[],
): { vragen: GegenereerdeVraag[]; melding: string | null } {
  const open = plekken.map((p, i) => ({ ...p, index: i, gevuld: false }));
  const gezien = new Set<string>();
  const uit: GegenereerdeVraag[] = [];

  for (const g of geleverd) {
    const tekst = (g.vraag ?? "").trim();
    if (tekst.length < 8) continue;

    const sleutel = tekst.toLowerCase();
    if (gezien.has(sleutel)) continue;

    const label = normaliseerLabel(g.intent_label ?? "");
    const fase = (g.fase ?? "").trim().toLowerCase();
    if (!isIntentStage(fase)) continue;

    const plek = open.find((p) => !p.gevuld && p.intentLabel === label && p.stage === fase);
    if (!plek) continue;

    plek.gevuld = true;
    gezien.add(sleutel);
    uit.push({
      text: tekst,
      intentLabel: plek.intentLabel,
      stage: plek.stage,
      weight: plek.weight,
      position: plek.index,
    });
  }

  uit.sort((a, b) => a.position - b.position);

  const leeg = open.filter((p) => !p.gevuld).length;
  const melding =
    leeg > 0
      ? `${leeg} van de ${plekken.length} vragen zijn niet geschreven. De meting gaat door met ` +
        `${uit.length} vragen; dat is minder bewijs per intentie, niet minder betrouwbaar per vraag.`
      : null;

  return { vragen: uit, melding };
}

/** De vraag aan het model. Apart, zodat de test hem kan nalezen. */
export function bouwVragenVraag(
  markt: { label: string; industry: string; location: string; radius_km: number },
  intenties: Intentie[],
  plekken: VerdeeldeVraag[],
): string {
  // Per intentie en fase tellen hoeveel vragen er nodig zijn. Het model krijgt
  // een boodschappenlijst en geen rekensom.
  const teller = new Map<string, number>();
  for (const p of plekken) {
    const sleutel = `${p.intentLabel}|${p.stage}`;
    teller.set(sleutel, (teller.get(sleutel) ?? 0) + 1);
  }

  const regels: string[] = [];
  for (const intentie of intenties) {
    const perFase = (["orientatie", "vergelijken", "selecteren", "contact"] as IntentStage[])
      .map((f) => ({ f, n: teller.get(`${intentie.label}|${f}`) ?? 0 }))
      .filter((x) => x.n > 0);
    if (perFase.length === 0) continue;
    regels.push(
      `- ${intentie.naam} (label: ${intentie.label}): ` +
        perFase.map((x) => `${x.n} in de fase ${x.f}`).join(", "),
    );
  }

  return [
    `Markt: ${markt.label}`,
    `Branche: ${markt.industry}`,
    `Plaats: ${markt.location}, binnen ${markt.radius_km} km`,
    "",
    "Schrijf per regel hieronder precies zoveel vragen als er gevraagd worden:",
    ...regels,
    "",
    "De vier fases betekenen dit:",
    ...(["orientatie", "vergelijken", "selecteren", "contact"] as IntentStage[]).map(
      (f) => `- ${f} (${STAGE_LABEL[f]}): ${STAGE_HELP[f]}`,
    ),
    "",
    "Regels voor elke vraag:",
    "- Schrijf hem zoals een klant hem typt, niet zoals een marketeer hem opschrijft.",
    `- De plaats mag erin als een klant hem er echt bij zou typen. Niet in elke vraag.`,
    "- Noem nooit de naam van een bedrijf. Dan meet je of de AI die naam herhaalt.",
    "- Elke vraag is anders. Twee vragen die hetzelfde vragen leveren twee keer hetzelfde antwoord.",
    "- Geef bij elke vraag het label van de intentie en de fase terug die erbij hoort.",
  ].join("\n");
}
