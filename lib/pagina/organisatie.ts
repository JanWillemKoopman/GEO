import "server-only";

/**
 * De organisatieknoop voor de gestructureerde gegevens van een pagina
 * (`docs/tasks/contentketen-opnieuw.md` §6.4): wie is het bedrijf, en welke
 * externe profielen horen erbij (`sameAs`). Een AI-assistent bevestigt daarmee
 * dat de pagina over hetzelfde bedrijf gaat als de rest van zijn bronnen.
 *
 * Eén plek, want zowel het schrijven als het handmatig bewerken van een FAQ
 * bouwt de gestructureerde gegevens opnieuw op.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationInfo } from "@/lib/schema-jsonld";

export async function laadOrganisatie(admin: SupabaseClient, profileId: string): Promise<OrganizationInfo | null> {
  const [{ data: profiel }, { data: techniek }] = await Promise.all([
    admin.from("profiles").select("brand_name, name, url").eq("id", profileId).maybeSingle(),
    admin.from("profile_facets").select("raw_json").eq("profile_id", profileId).eq("facet", "techniek").maybeSingle(),
  ]);
  const p = profiel as { brand_name: string | null; name: string; url: string } | null;
  if (!p) return null;
  return {
    name: p.brand_name ?? p.name,
    // `profiles.url` is een kale hostnaam; het schema komt er hier bij.
    url: `https://${p.url.replace(/^https?:\/\//, "")}`,
    sameAs: (techniek?.raw_json as { sameAs?: string[] } | null)?.sameAs ?? [],
  };
}
