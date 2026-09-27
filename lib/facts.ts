import "server-only";

/**
 * Het antwoord op een feitenvraag verwerken: opslaan, in de kennislaag
 * vastleggen, en beoordelen of het een marktclaim is die eerst onderbouwing
 * nodig heeft. Tot K8 ging een antwoord daarnaast als regel naar
 * `profiles.proof_points`; die kolom leest geen stap meer
 * (`kennismodel-inventaris.md` §3 punt 4), en het antwoord bereikt de schrijver
 * via de kennislaag (blok A).
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
import type { FactRequest } from "@/lib/types/database";
import { legAntwoordVast } from "@/lib/kennis/uit-gesprek";
import { geldtVoorDienst } from "@/lib/kennis/gesprek";
import { dienstenVanPaginas } from "@/lib/kennis/voor-pagina";
import type { BronVraag } from "@/lib/kennis/terugvullen";

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
 * De klant ziet altijd een uitleg als zijn antwoord een marktclaim zonder
 * onderbouwing is (`beoordeelClaim()`), ongeacht waar de vraag vandaan komt.
 */
export async function answerFact(
  admin: Admin,
  input: {
    profileId: string;
    factId: string;
    answer: string;
    /** Wie antwoordde: de klant, of de consultant in het gesprek. */
    gebruikerId: string;
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

  // ── De kennislaag (K5 van van-pijplijn-naar-kennissysteem.md) ──────────────
  //
  // Wat de ondernemer zegt, wordt klantkennis die blijft: verklaard, met de
  // reikwijdte van de vraag, en bij een gewijzigd antwoord een nieuwe versie
  // van het oude item. In de kennislaag komt elk antwoord, ook de open vraag en
  // een marktclaim zonder onderbouwing (die houdt de controle op harde
  // beweringen tegen, niet het vastleggen). Gooit nooit een fout.
  //
  // A2 (besluit V23): hangt een gerichte vraag aan een pagina met een kans over
  // een dienst, dan geldt het antwoord voor die dienst, zodat de volgende
  // pagina over dezelfde dienst het niet opnieuw vraagt.
  const nu = alsBronVraag(updated);
  const diensten = geldtVoorDienst(nu) ? await dienstenVanPaginas(admin, input.profileId, nu.content_piece_ids ?? []) : [];
  await legAntwoordVast(
    admin,
    { profileId: input.profileId, vorige: alsBronVraag(fact), nu, diensten },
    { actor: "mens", gebruikerId: input.gebruikerId },
  );

  // ── De open vraag van een pagina (besluit B3, contentketen-opnieuw.md §6.2) ──
  //
  // Dit antwoord is het verhaal van de ondernemer over déze pagina, tot 3.000
  // tekens. Het gaat letterlijk naar de schrijver als blok B. Het wordt geen
  // feit en geen marktclaim: een verhaal van tien zinnen in
  // losse feiten knippen is precies de opsomming die de klant niet wil.
  if (fact.open_vraag) {
    return { ok: true, outcome: { fact: updated, needsEvidence: false, evidenceHint: null } };
  }

  // ── Een bestaand antwoord wijzigen (potloodje op "Openstaande vragen") ────
  //
  // De kennislaag kreeg hierboven een nieuwe versie van het antwoord, en de
  // oude blijft bewaard met een verwijzing ernaar. Tot K8 deel 2 moest hier ook
  // het oude feit in `brand_facts` op "vervangen"; die tabel schrijft niemand
  // meer.

  // ── Niet alle klantinput is gelijk (werkpakket A §3.4) ───────────────────
  //
  // Een superlatief of marktclaim zonder cijfer, bron of voorbeeld: de klant
  // krijgt uitleg wat er nog bij moet. Het antwoord blijft staan (conventie 8,
  // niets gaat verloren); de controle op harde beweringen houdt zo'n claim van
  // de pagina.
  const oordeel = beoordeelClaim(input.answer);
  if (!oordeel.aangenomen) {
    return {
      ok: true,
      outcome: { fact: updated, needsEvidence: true, evidenceHint: marktclaimUitleg(input.answer) },
    };
  }

  return { ok: true, outcome: { fact: updated, needsEvidence: false, evidenceHint: null } };
}

function alsBronVraag(r: FactRequest): BronVraag {
  return {
    id: r.id,
    analysis_id: r.analysis_id,
    question: r.question,
    answer: r.answer,
    status: r.status,
    scope: r.scope ?? null,
    content_piece_ids: r.content_piece_ids ?? null,
    open_vraag: r.open_vraag ?? null,
    raw_json: (r.raw_json as BronVraag["raw_json"]) ?? null,
  };
}
