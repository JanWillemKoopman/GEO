import "server-only";

/**
 * DE STEMVOORBEELDEN (besluit B14, `docs/tasks/contentketen-opnieuw.md` §6.10).
 *
 * Toon niet beschrijven maar laten zien: één tot drie pagina's waarvan de
 * ondernemer zegt "zo praten wij". Bij opslaan halen we de tekst op, geen AI,
 * en bewaren we hooguit 2.000 tekens per adres. Lukt ophalen niet, dan staat de
 * fout erbij in plaats van een lege tekst: de adviseur moet zien dat dit
 * voorbeeld de schrijver niet bereikt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchExistingPage } from "@/lib/pipeline/existing-page-fetch";
import type { StemVoorbeeld } from "@/lib/types/database";
import { MAX_STEMVOORBEELDEN, STEMTEKST_MAX, schoneAdressen, vanafEersteAlinea } from "@/lib/pagina/stemvoorbeelden-regels";

export { MAX_STEMVOORBEELDEN, schoneAdressen };

/** Haalt de tekst van elk adres op en bewaart het resultaat bij het profiel. */
export async function haalStemvoorbeeldenOp(admin: SupabaseClient, profileId: string, adressen: string[]): Promise<StemVoorbeeld[]> {
  const uit: StemVoorbeeld[] = [];
  for (const url of adressen.slice(0, MAX_STEMVOORBEELDEN)) {
    try {
      const pagina = await fetchExistingPage(url);
      const tekst = vanafEersteAlinea(pagina.text ?? "").slice(0, STEMTEKST_MAX).trim();
      uit.push(
        tekst
          ? { url, tekst, opgehaald_op: new Date().toISOString(), fout: null }
          : { url, tekst: null, opgehaald_op: new Date().toISOString(), fout: "Deze pagina konden we niet lezen." },
      );
    } catch {
      uit.push({ url, tekst: null, opgehaald_op: new Date().toISOString(), fout: "Deze pagina konden we niet lezen." });
    }
  }
  // Alleen bewaren als de adressen nog dezelfde zijn. Twee keer kort na elkaar
  // opslaan (elk adresveld bewaart bij het verlaten) start twee ophaalrondes;
  // zonder deze controle overschrijft de trage eerste ronde met één adres het
  // resultaat van de tweede met twee.
  const { data } = await admin.from("profiles").select("stem_voorbeelden").eq("id", profileId).maybeSingle();
  const huidig = (((data as { stem_voorbeelden?: { url: string }[] | null } | null)?.stem_voorbeelden ?? []) as { url: string }[])
    .map((v) => v.url)
    .join("|");
  if (huidig !== uit.map((v) => v.url).join("|")) return uit;
  await admin.from("profiles").update({ stem_voorbeelden: uit }).eq("id", profileId);
  return uit;
}
