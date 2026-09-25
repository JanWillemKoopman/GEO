import "server-only";

/**
 * GELE ZINNEN BEVESTIGEN EN GOEDKEUREN (`docs/tasks/contentketen-opnieuw.md` §6.9, B1).
 *
 * Een gele zin houdt de pagina niet tegen tot hij bevestigd is, en dat is de
 * enige voorwaarde: goedkeuren kan pas als elke gele zin bevestigd is. Een zin
 * aanpassen gaat via de gewone bewerking van de tekst (de PATCH-route), en
 * dan hoeft hij niet meer bevestigd te worden als hij er niet meer staat.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { allesBevestigd, geleZinnenNa, type ControleJson } from "@/lib/pagina/controle-regels";
import { normaliseerVraag } from "@/lib/pagina/brief-regels";

type Admin = SupabaseClient;

export type Goedkeuruitkomst =
  | { ok: true; reviewedAt: string }
  | { ok: false; status: 404 | 409 | 500; error: string; geel?: number };

async function laad(
  admin: Admin,
  pieceId: string,
  analysisId: string,
): Promise<{ body: string; controle: ControleJson | null } | null> {
  const { data } = await admin
    .from("content_pieces")
    .select("body_markdown, controle_json")
    .eq("id", pieceId)
    .eq("analysis_id", analysisId)
    .maybeSingle();
  if (!data) return null;
  const r = data as { body_markdown: string | null; controle_json: ControleJson | null };
  return { body: r.body_markdown ?? "", controle: r.controle_json };
}

/**
 * De gele zinnen die er nog staan. Een zin die de ondernemer wegschreef of
 * aanpaste, staat niet meer in de tekst en hoeft niet bevestigd te worden.
 */
export function nogGeel(body: string, controle: ControleJson | null): string[] {
  if (!controle) return [];
  return geleZinnenNa(body, [], controle.gele_zinnen);
}

/** Eén gele zin bevestigen: "dit klopt". */
export async function bevestigZin(
  admin: Admin,
  args: { pieceId: string; analysisId: string; zin: string },
): Promise<{ ok: true; bevestigd: string[] } | { ok: false; status: 404 | 409; error: string }> {
  const huidig = await laad(admin, args.pieceId, args.analysisId);
  if (!huidig) return { ok: false, status: 404, error: "Pagina niet gevonden." };
  const controle = huidig.controle;
  const sleutel = normaliseerVraag(args.zin);
  if (!controle || !controle.gele_zinnen.some((z) => normaliseerVraag(z) === sleutel)) {
    return { ok: false, status: 409, error: "Deze zin hoeft niet bevestigd te worden." };
  }
  const bevestigd = Array.from(new Set([...controle.bevestigd, args.zin]));
  await admin
    .from("content_pieces")
    .update({ controle_json: { ...controle, bevestigd } })
    .eq("id", args.pieceId);
  return { ok: true, bevestigd };
}

export async function keurGoed(
  admin: Admin,
  args: { pieceId: string; analysisId: string; userId: string },
): Promise<Goedkeuruitkomst> {
  const huidig = await laad(admin, args.pieceId, args.analysisId);
  if (!huidig) return { ok: false, status: 404, error: "Pagina niet gevonden." };
  const open = nogGeel(huidig.body, huidig.controle);
  if (huidig.controle && !allesBevestigd({ gele_zinnen: open, bevestigd: huidig.controle.bevestigd })) {
    const aantal = open.filter(
      (z) => !huidig.controle!.bevestigd.some((b) => normaliseerVraag(b) === normaliseerVraag(z)),
    ).length;
    return {
      ok: false,
      status: 409,
      error:
        aantal === 1
          ? "Er staat nog één gele zin. Bevestig hem of pas hem aan."
          : `Er staan nog ${aantal} gele zinnen. Bevestig ze of pas ze aan.`,
      geel: aantal,
    };
  }

  const reviewedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("content_pieces")
    .update({ needs_review: false, reviewed_at: reviewedAt, reviewed_by: args.userId })
    .eq("id", args.pieceId)
    .eq("analysis_id", args.analysisId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: "Goedkeuren is niet gelukt." };
  if (!data) return { ok: false, status: 404, error: "Pagina niet gevonden." };

  // De plan-pagina volgt, alleen vanuit de standen waarin nog op een tekst of
  // een akkoord gewacht werd: een pagina die al live staat gaat niet terug.
  await admin
    .from("planned_pages")
    .update({ status: "goedgekeurd" })
    .eq("content_piece_id", args.pieceId)
    .in("status", ["gepland", "schrijven", "ter_goedkeuring"]);
  return { ok: true, reviewedAt };
}
