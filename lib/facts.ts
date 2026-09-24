import "server-only";
import { moetNaarProofPoints } from "@/lib/proof-point-regel";

/**
 * Het antwoord op een feitenvraag verwerken: opslaan, beoordelen of het een
 * marktclaim is die eerst onderbouwing nodig heeft, en zo nodig promoveren
 * naar `profiles.proof_points`.
 *
 * ── WAAROM DIT UIT DE ROUTE IS GETROKKEN ─────────────────────────────────────
 *
 * Losgetrokken uit `app/api/profiles/[id]/facts/route.ts` op 31 augustus 2026
 * (punt 6 van docs/tasks/opdracht-bevindingen-5-tot-9.md), hetzelfde patroon
 * als `createPlan()` in `lib/plans.ts`: de route doet alleen nog auth en
 * validatie, en deze functie doet de samenhang tussen de vraag en de tabel.
 * Dat maakt die samenhang rechtstreeks te toetsen in `scripts/test-chain.ts`,
 * tegen een echte Postgres, zonder een Next.js request te moeten nabootsen.
 * Precies die samenhang zat fout: het oordeel over een marktclaim stond ná de
 * vertakking op `isGapQuestion()`, die meteen terugkeerde, waardoor alle tien
 * onboardingvragen uit de doorloop (die allemaal `raw_json.bron =
 * "synthese-gap"` droegen) het oordeel nooit bereikten. De klant zag dan geen
 * enkele uitleg bij "Wij zijn de snelste van de regio en reageren sneller dan
 * elke concurrent".
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { beoordeelClaim, marktclaimUitleg } from "@/lib/pipeline/claim-plausibility";
import { isGapQuestion } from "@/lib/pipeline/gap-questions";
import { claimKey, factFromAnswer } from "@/lib/pipeline/factcard";
import type { FactRequest } from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

export interface AnswerFactOutcome {
  fact: FactRequest;
  /** Moet de klant eerst een cijfer, bron of voorbeeld toevoegen? */
  needsEvidence: boolean;
  /** De concrete uitleg als `needsEvidence` waar is, anders `null`. */
  evidenceHint: string | null;
}

export type AnswerFactResult =
  | { ok: true; outcome: AnswerFactOutcome }
  | { ok: false; error: string; status: number };

/**
 * Slaat het antwoord op en beslist wat ermee gebeurt.
 *
 * ⚠️ Twee besluiten die niets met elkaar te maken hebben, en die daarom hier
 * los van elkaar staan in plaats van de een de ander te laten afkappen:
 *
 *   - **Ziet de klant een uitleg?** Ja, altijd, ongeacht waar de vraag
 *     vandaan komt: `beoordeelClaim()` draait als EERSTE, vóór enige
 *     vertakking op de herkomst van de vraag.
 *   - **Gaat het antwoord naar `proof_points`?** Nee bij een gapvraag (dat
 *     antwoord bereikt de schrijver toch al via `buildFactBase()`, met de
 *     juiste bron "klant, bevestigd <datum>"; als proof point zou het de bron
 *     "site <url>" krijgen terwijl het nergens op de site staat, en niet elk
 *     open punt is een publiceerbaar feit, zie `isGapQuestion()`), en bij de
 *     rest alleen als de claim wordt aangenomen.
 */
export async function answerFact(
  admin: Admin,
  input: {
    profileId: string;
    factId: string;
    answer: string;
    /** `profiles.proof_points` van dit merk, vóór dit antwoord. */
    existingProofPoints: string[];
  },
): Promise<AnswerFactResult> {
  const { data: factRow } = await admin
    .from("fact_requests")
    .select("*")
    .eq("id", input.factId)
    .eq("profile_id", input.profileId)
    .maybeSingle();
  if (!factRow) return { ok: false, error: "Vraag niet gevonden.", status: 404 };
  const fact = factRow as FactRequest;

  const { data: updatedRow, error } = await admin
    .from("fact_requests")
    .update({ answer: input.answer, status: "beantwoord", answered_at: new Date().toISOString() })
    .eq("id", input.factId)
    .select("*")
    .single();
  if (error || !updatedRow) return { ok: false, error: "Opslaan is niet gelukt.", status: 500 };
  const updated = updatedRow as FactRequest;

  // ── Een bestaand antwoord wijzigen (potloodje op "Openstaande vragen") ────
  //
  // `buildFactBase()` leest dit antwoord telkens vers uit `fact_requests`, dus
  // een pas geschreven pagina ziet een wijziging vanzelf. Wat NIET vanzelf
  // meegaat is het oude feit dat al met een IDENTITEIT in `brand_facts` staat
  // (migratie 0036): dat feit is opgeslagen onder de ontdubbelsleutel van het
  // OUDE antwoord (`claimKey()` neemt de antwoordtekst mee), dus een nieuw
  // antwoord krijgt gewoon een NIEUWE sleutel en het oude feit blijft "actueel"
  // staan naast het nieuwe. Zonder dit vlaggen ziet de eerstvolgende feitenkaart
  // dus zowel het oude als het nieuwe antwoord, en mag het model kiezen, precies
  // de tegenspraak die `fact-merge.ts` juist zichtbaar moet maken in plaats van
  // stilzwijgend laten voortbestaan.
  if (fact.status === "beantwoord" && fact.answer !== null && fact.answer !== input.answer) {
    const oud = factFromAnswer({ ...fact, answer_type: fact.answer_type ?? "tekst" });
    const oudeSleutel = oud ? claimKey(oud.text) : "";
    if (oudeSleutel) {
      const { data: verouderd } = await admin
        .from("brand_facts")
        .select("id")
        .eq("profile_id", input.profileId)
        .is("analysis_id", null)
        .eq("fact_key", oudeSleutel)
        .is("superseded_by", null);
      // Wijst voorlopig naar zichzelf, dezelfde onschuldige truc als
      // `factstore.ts` gebruikt: dat maakt de unieke index (profiel, sleutel)
      // vrij zonder de rij te verwijderen, zodat een al geschreven pagina die
      // ernaar verwijst na te trekken blijft. `buildFactBase()` legt bij de
      // eerstvolgende opbouw het NIEUWE feit onder de nieuwe sleutel vast.
      for (const rij of verouderd ?? []) {
        await admin.from("brand_facts").update({ superseded_by: rij.id as string }).eq("id", rij.id as string);
      }
    }
  }

  // ── Niet alle klantinput is gelijk (werkpakket A §3.4) ───────────────────
  //
  // Een superlatief of marktclaim zonder cijfer, bron of voorbeeld gaat NIET
  // naar `proof_points`: die lijst is wat de hele schrijfpijplijn als
  // vaststaand feit leest, en "wij zijn de beste van de regio" is dat niet.
  // Het antwoord blijft wel gewoon staan in `fact_requests` (conventie 8,
  // niets gaat verloren), alleen de automatische promotie slaat over.
  const oordeel = beoordeelClaim(input.answer);
  if (!oordeel.aangenomen) {
    return {
      ok: true,
      outcome: { fact: updated, needsEvidence: true, evidenceHint: marktclaimUitleg(input.answer) },
    };
  }

  // Behalve bij een omgezet open punt uit de synthese, zie de uitleg
  // hierboven bij de functie.
  if (isGapQuestion(fact.raw_json)) {
    return { ok: true, outcome: { fact: updated, needsEvidence: false, evidenceHint: null } };
  }

  // Ook niet bij een vraag uit de voorbereiding van een pagina (hij draagt een
  // `claim_key`) of een vraag die aan één pagina hangt. Die antwoorden bereiken
  // de schrijver al via `buildFactBase()`, met de bron "klant, bevestigd", en
  // alleen bij de pagina waar ze horen. Als proof point kregen ze de bron "site"
  // en belandden ze op de kaart van ELKE pagina van het merk
  // (kwaliteitsdoorlichting, punt 41, 24 september 2026: "Leggen jullie
  // bestrating ook in de winter aan? Ja" stond als sitefeit in de bank).
  if (!moetNaarProofPoints(fact)) {
    return { ok: true, outcome: { fact: updated, needsEvidence: false, evidenceHint: null } };
  }

  // Het antwoord ook als geverifieerd feit bij het profiel zetten. Dubbelop
  // met `fact_requests`, maar bewust: `proof_points` is waar de hele
  // schrijfpijplijn al naar kijkt, en de klant kan het daar zelf bijstellen
  // of weghalen.
  //
  // ⚠️ Bij een WIJZIGING van een al beantwoorde vraag moet het oude antwoord
  // hier eerst uit, anders staat straks "levert 250 auto's per jaar" naast
  // "levert 300 auto's per jaar" allebei als vaststaand feit, en heeft het
  // potloodje op "Openstaande vragen" niets opgelost. Eén vraag hoort hier aan
  // hoogstens één regel: die met de vraagtekst als voorvoegsel.
  const line = `${fact.question} ${input.answer}`;
  const alAanwezig = input.existingProofPoints.some((p) => p.trim().toLowerCase() === line.toLowerCase());
  if (!alAanwezig) {
    const voorvoegsel = `${fact.question} `.trim().toLowerCase();
    const zonderOud = input.existingProofPoints.filter((p) => !p.trim().toLowerCase().startsWith(voorvoegsel));
    await admin
      .from("profiles")
      .update({ proof_points: [...zonderOud, line] })
      .eq("id", input.profileId);
  }

  return { ok: true, outcome: { fact: updated, needsEvidence: false, evidenceHint: null } };
}
