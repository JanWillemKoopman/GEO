import "server-only";

/**
 * Het BEWIJSDOSSIER per gemiste vraag (implementatieplan.md R1.1).
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Het rapport kreeg tot nu toe twee losse blokken: een lijst gemiste vragen
 * (code, gewicht, categorie, tekst) en daaronder de concurrentiedata per
 * concurrent, mét `winning_run_ids`. Nergens stond wélke concurrent bij wélke
 * vraag hoorde — de gemiste vragen droegen namelijk geen run-ID. Het model moest
 * die koppeling dus zelf leggen, kon dat niet, en gokte.
 *
 * Wat daar in de praktijk uitkwam (kwaliteitsanalyse-5-testcases.md §2.2): bij
 * Van der Valk stond in de aanbeveling met prioriteit 1 dat "Het Oude Raadhuis
 * Hoofddorp en Dotslash Utrecht hier wel scoren". In het antwoord op díe vraag
 * werd geen enkel bedrijf genoemd — die namen kwamen uit heel andere metingen.
 * Een klant die dat natrekt, vindt een rapport dat iets beweert wat de data niet
 * zegt. Precies op de plek waar het product zijn geloofwaardigheid verdient.
 *
 * De oplossing is niet een strengere instructie maar een andere taakverdeling:
 * de koppeling wordt hier, in code, uit de database gehaald. Het model krijgt
 * per vraag een kant-en-klaar dossier en hoeft alleen nog te VERWOORDEN. Wat het
 * niet hoeft af te leiden, kan het ook niet verkeerd afleiden.
 *
 * De opmaak van het dossier staat in `evidence-format.ts` (puur, testbaar).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { excerpt, type EvidenceBrand, type EvidenceEntry } from "@/lib/pipeline/evidence-format";
import type { Entity, TrackingRunMention } from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Welke rollen als "er werd een bedrijf genoemd" tellen.
 *
 * Blijkt uit de verificatie op echte data: de mention-classificatie pikt naast
 * bedrijven ook gewone woorden op als entiteit — bij Van der Valk kwamen
 * "vergaderlocatie", "locatie", "hotel" en "Nederland" langs. Die worden verderop
 * correct als `niet_relevant` geclassificeerd, maar zouden hier ten onrechte
 * doorgaan voor een genoemd bedrijf. Dan zou het dossier bij een vraag waar
 * feitelijk niemand genoemd werd, tóch een "concurrent" tonen — precies het
 * misverstand dat dit dossier moet uitbannen.
 *
 * `eigen_merk` hoort er evenmin in: dit dossier gaat over vragen waarop het
 * eigen merk juist NIET genoemd werd.
 */
const RELEVANTE_ROLLEN = new Set<string>([
  "concurrent",
  "vergelijker",
  "brancheorganisatie",
  "eigen_product",
]);

/** Wat `computeMissedPrompts` oplevert; hier alleen als invoer gebruikt. */
export interface MissedPromptInput {
  code: string;
  runId: string;
  text: string;
  category: string;
  weight: number;
  cluster: string | null;
  intent_type: string | null;
}

/**
 * Bouwt het dossier voor een set gemiste vragen.
 *
 * Drie queries, ongeacht het aantal vragen — dit draait in de rapportstap en mag
 * geen N+1 worden.
 */
export async function buildEvidenceDossier(
  admin: Admin,
  profileId: string,
  missed: MissedPromptInput[],
): Promise<EvidenceEntry[]> {
  if (missed.length === 0) return [];

  const runIds = missed.map((m) => m.runId);

  const [{ data: mentionRows }, { data: runRows }, { data: entityRows }] = await Promise.all([
    admin
      .from("tracking_run_mentions")
      .select("tracking_run_id, entity_id, entity_name, is_own_brand, mentioned, position, cited_sources")
      .in("tracking_run_id", runIds),
    admin.from("tracking_runs").select("id, raw_response").in("id", runIds),
    admin.from("entities").select("id, canonical_name, entity_role").eq("profile_id", profileId),
  ]);

  const entityById = new Map(
    ((entityRows ?? []) as Pick<Entity, "id" | "canonical_name" | "entity_role">[]).map((e) => [e.id, e]),
  );
  const answerByRun = new Map(
    ((runRows ?? []) as { id: string; raw_response: string | null }[]).map((r) => [r.id, r.raw_response ?? ""]),
  );

  // Alleen ANDERE merken die daadwerkelijk genoemd zijn. Het eigen merk laten we
  // weg: dat deze vraag in de lijst staat, betekent per definitie dat het eigen
  // merk er niet in voorkwam.
  const brandsByRun = new Map<string, EvidenceBrand[]>();
  for (const row of (mentionRows ?? []) as TrackingRunMention[]) {
    if (row.is_own_brand || !row.mentioned) continue;

    const entity = row.entity_id ? entityById.get(row.entity_id) : undefined;
    // Rommel-entiteiten eruit (zie RELEVANTE_ROLLEN). Nog niet geclassificeerd
    // (geen entiteit, of rol 'onbepaald') laten we WÉL staan: dat is een naam die
    // in het antwoord stond en waarvan we nog niet weten wat het is — die
    // weglaten zou het dossier onvolledig maken.
    if (entity && !RELEVANTE_ROLLEN.has(entity.entity_role)) continue;

    const list = brandsByRun.get(row.tracking_run_id) ?? [];
    list.push({
      // De entiteitsnaam is stabiel over periodes heen; de gemeten schrijfwijze
      // wisselt per antwoord. Zonder entiteit (classificatie nog niet gedraaid)
      // valt hij terug op wat er letterlijk stond.
      name: entity?.canonical_name ?? row.entity_name,
      role: entity?.entity_role ?? "onbekend",
      position: row.position,
      citedSources: row.cited_sources ?? [],
    });
    brandsByRun.set(row.tracking_run_id, list);
  }

  return missed.map((m) => ({
    code: m.code,
    runId: m.runId,
    promptText: m.text,
    category: m.category,
    weight: m.weight,
    cluster: m.cluster,
    intentType: m.intent_type,
    // Op positie sorteren: wie bovenaan het antwoord staat, wint die vraag het
    // duidelijkst. Dat is ook de volgorde waarin het rapport erover hoort te
    // schrijven.
    brandsInAnswer: (brandsByRun.get(m.runId) ?? []).sort(
      (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
    ),
    answerExcerpt: excerpt(answerByRun.get(m.runId) ?? ""),
  }));
}
