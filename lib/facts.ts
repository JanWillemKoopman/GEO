import "server-only";

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

  // Het antwoord ook als geverifieerd feit bij het profiel zetten. Dubbelop
  // met `fact_requests`, maar bewust: `proof_points` is waar de hele
  // schrijfpijplijn al naar kijkt, en de klant kan het daar zelf bijstellen
  // of weghalen.
  const line = `${fact.question} ${input.answer}`;
  if (!input.existingProofPoints.some((p) => p.trim().toLowerCase() === line.toLowerCase())) {
    await admin
      .from("profiles")
      .update({ proof_points: [...input.existingProofPoints, line] })
      .eq("id", input.profileId);
  }

  return { ok: true, outcome: { fact: updated, needsEvidence: false, evidenceHint: null } };
}
