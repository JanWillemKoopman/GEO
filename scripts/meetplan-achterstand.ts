/**
 * DE ACHTERSTAND VAN M1 INHALEN: pagina's die al goedgekeurd zijn vóórdat het
 * meetplan bestond (`docs/tasks/van-pijplijn-naar-kennissysteem.md`, M1).
 *
 * Sinds de contentketen opnieuw gebouwd is (WP1, 25 september 2026) schrijft
 * niemand meer in `content_piece_targets`. Een pagina die vóór M1 (27 september
 * 2026) al goedgekeurd was, heeft daardoor geen meetplan: `keurGoed()` roept
 * `maakMeetplan()` alleen aan op het moment van goedkeuren zelf, niet met
 * terugwerkende kracht.
 *
 * Dit script vindt die pagina's (goedgekeurd, `is_current`, nog geen meetplan)
 * en roept `maakMeetplan()` voor elk van hen aan. Zelfde route als het
 * terugvullen (besluit V15): de werkomgeving heeft de sleutel van de
 * productiedatabase niet, dus dit script draait met een admin-client die je
 * zelf meegeeft (via de Supabase MCP-tool of een lokale `.env` met de
 * service-role key), niet automatisch tegen productie.
 *
 * Idempotent: `maakMeetplan()` doet niets als er al een meetplan is.
 *
 * Op productie is deze achterstand op 27 september 2026 al ingehaald (7
 * pagina's, met de hand nagerekend tegen dezelfde regels als hieronder). Dit
 * script is er voor de volgende keer dat dit gebeurt, of voor een ander
 * profiel.
 */
import { createClient } from "@supabase/supabase-js";
import { maakMeetplan } from "@/lib/pipeline/meetplan";

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Zet NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY, of draai dit met de databaseverbinding van de beheertool.");
    process.exit(1);
  }
  const admin = createClient(url, key);

  const { data: kandidaten, error } = await admin
    .from("content_pieces")
    .select("id, title, planned_pages!inner(source_ref)")
    .eq("is_current", true)
    .eq("needs_review", false)
    .not("planned_pages.source_ref", "is", null);
  if (error) throw new Error(`Kandidaten ophalen mislukte: ${error.message}`);

  const { data: bestaand } = await admin.from("meetplannen").select("content_piece_id");
  const heeftAl = new Set((bestaand ?? []).map((r) => r.content_piece_id as string));

  let gemaakt = 0;
  let overgeslagen = 0;
  for (const rij of (kandidaten ?? []) as { id: string; title: string }[]) {
    if (heeftAl.has(rij.id)) continue;
    const uitkomst = await maakMeetplan(admin, rij.id);
    if (uitkomst.ok && !uitkomst.bestondAl) {
      gemaakt++;
      console.log(`Meetplan gemaakt voor "${rij.title}" (${rij.id}).`);
    } else if (!uitkomst.ok) {
      overgeslagen++;
      console.log(`Overgeslagen: "${rij.title}" (${rij.id}) — ${uitkomst.reden}.`);
    }
  }
  console.log(`${gemaakt} meetplannen gemaakt, ${overgeslagen} overgeslagen (geen doelvragen).`);
}

if (process.argv[1]?.endsWith("meetplan-achterstand.ts")) main();
