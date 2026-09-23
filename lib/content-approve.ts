import "server-only";

/**
 * GOEDKEUREN, VANAF ELKE PLEK HETZELFDE (`docs/tasks/contentflow-een-lijn.md` §4.5).
 *
 * Tot 23 september 2026 had goedkeuren twee betekenissen die elkaar niet
 * kenden. De bibliotheek zette `content_pieces.needs_review` op `false` en liet
 * het contentplan op "Tekst klaar voor akkoord" staan. Het contentplan zette
 * `planned_pages.status` op `goedgekeurd` en liet de tekst op "nog niet
 * vrijgegeven" staan, zodat de publiceerknop daarna weigerde. Wie in het plan
 * goedkeurde, liep dus vast op het volgende scherm.
 *
 * Deze functie doet beide, na dezelfde eindpoort (`lib/content-final-gate.ts`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { countBlockingQuestions } from "@/lib/open-questions";
import { eindpoort } from "@/lib/content-final-gate";

export type GoedkeurUitkomst =
  | { ok: true; reviewedAt: string }
  | { ok: false; status: 404 | 409 | 500; error: string; openVragen?: number };

export async function keurTekstGoed(
  admin: SupabaseClient,
  args: { pieceId: string; analysisId: string; userId: string },
): Promise<GoedkeurUitkomst> {
  const poort = eindpoort(await countBlockingQuestions(admin, args.analysisId, args.pieceId));
  if (!poort.mag) return { ok: false, status: 409, error: poort.melding, openVragen: poort.open };

  const reviewedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("content_pieces")
    .update({
      needs_review: false,
      // Sinds migratie 0034 leggen we vast DAT er iemand gekeken heeft, en wie.
      reviewed_at: reviewedAt,
      reviewed_by: args.userId,
    })
    .eq("id", args.pieceId)
    // De pagina moet bij DEZE analyse horen: de eigenaarschapscontrole van de
    // aanroeper dekt de analyse, niet de pagina.
    .eq("analysis_id", args.analysisId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: "Goedkeuren is niet gelukt." };
  if (!data) return { ok: false, status: 404, error: "Pagina niet gevonden." };

  // De plan-pagina volgt. Alleen vanuit de standen waarin nog op een tekst of
  // een akkoord gewacht werd: een pagina die al live staat gaat niet terug.
  const { error: planFout } = await admin
    .from("planned_pages")
    .update({ status: "goedgekeurd" })
    .eq("content_piece_id", args.pieceId)
    .in("status", ["gepland", "schrijven", "ter_goedkeuring"]);
  if (planFout) console.error(`Plan-pagina bij ${args.pieceId} goedkeuren mislukte:`, planFout.message);

  return { ok: true, reviewedAt };
}
