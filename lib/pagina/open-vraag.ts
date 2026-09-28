import "server-only";

/**
 * De open vraag van een pagina aanmaken (besluit B3, `docs/tasks/contentketen-opnieuw.md` §6.2).
 *
 * Code, geen model, en vóór de content brief: zo staat hij er ook als de
 * brief mislukt. Idempotent: de voorbereiding kan twee keer starten (vrijgeven
 * en de nachtelijke controle), en de unieke index uit migratie 0115 laat per
 * pagina hooguit één open vraag toe. Botst hij, dan stond hij er al.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { openVraagTekst, openVraagUitleg } from "@/lib/pagina/open-vraag-tekst";

export async function maakOpenVraag(
  admin: SupabaseClient,
  input: { profileId: string; analysisId: string; pieceId: string; paginaTitel: string; onderwerp: string },
): Promise<void> {
  const { data: bestaand } = await admin
    .from("fact_requests")
    .select("id")
    .eq("open_vraag", true)
    .contains("content_piece_ids", [input.pieceId])
    .limit(1);
  if ((bestaand ?? []).length > 0) return;

  const { error } = await admin.from("fact_requests").insert({
    profile_id: input.profileId,
    analysis_id: input.analysisId,
    question: openVraagTekst(input.paginaTitel),
    reason: openVraagUitleg(),
    status: "open",
    scope: "pagina",
    kind: "aanvulling",
    answer_type: "tekst_lang",
    required: false,
    open_vraag: true,
    content_piece_ids: [input.pieceId],
  });
  // 23505 = een unieke index: een gelijktijdige voorbereiding was net eerder.
  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(`Open vraag aanmaken voor pagina ${input.pieceId} mislukte: ${error.message}`);
  }
}
