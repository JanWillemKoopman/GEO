import "server-only";

/**
 * De feitenbank: feiten met een identiteit, over analyses heen (migratie 0036).
 *
 * ── WAT DIT TOEVOEGT AAN DE FEITENKAART ─────────────────────────────────────
 *
 * De feitenkaart (`factcard.ts`) is een MOMENTOPNAME: de gesloten lijst die één
 * pagina meekreeg, bevroren in `briefing_snapshot_json`. Die blijft bestaan, en
 * met reden — hij is precies wat het model zág, zonder join die er later
 * onderuit kan schuiven.
 *
 * Wat hij niet kan is onthouden. Elk feit bestaat alleen als positie in die ene
 * lijst, dus:
 *
 *   • hetzelfde feit staat in elke snapshot van elke versie van elke pagina
 *     opnieuw (bij Fysi-Unique vier therapeutenbio's, keer op keer);
 *   • "F3" in versie 2 is niet aantoonbaar hetzelfde feit als "F3" in versie 1;
 *   • twee antwoorden die elkaar tegenspreken belanden allebei op de kaart, en
 *     het model kiest;
 *   • "wat weten we over deze klant?" is geen vraag die je kunt stellen.
 *
 * Deze module maakt de bank de bron van waarheid en laat de kaart het bewijsstuk
 * zijn. Dat is bewust "en" en geen "of".
 *
 * ── DE BANK BEVAT ALLEEN ECHTE FEITEN ───────────────────────────────────────
 *
 * Achtergrondblokken (sitetekst van 400 tekens, de onderzoekssamenvatting) gaan
 * er NIET in. Die zijn context, geen feit — dat onderscheid kostte de eerste
 * briefingronde al nul vragen aan de klant (zie `FactItem.citable`). Ze blijven
 * per kaart bestaan en verdwijnen daarna, want ze zeggen niets wat onthouden
 * moet worden.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { claimKey, type FactItem, type RawFact } from "@/lib/pipeline/factcard";
import {
  planFactMerge,
  type Contradiction,
  type IncomingFact,
  type StoredFact,
} from "@/lib/pipeline/fact-merge";

type Admin = SupabaseClient;

export interface SyncResult {
  /** De actuele feiten uit de bank, mét id — klaar om genummerd te worden. */
  facts: (Omit<FactItem, "ref"> & { id: string })[];
  /** Wat de klant zou moeten zien: antwoorden die elkaar tegenspreken. */
  contradictions: Contradiction[];
}

/** Een `RawFact` klaarmaken voor de bank. Achtergrond hoort hier niet. */
function toIncoming(
  feit: RawFact,
  analysisId: string | null,
  extra: { originFactRequestId?: string | null; originDocumentId?: string | null } = {},
): IncomingFact | null {
  if (!feit.citable) return null;
  const sleutel = claimKey(feit.text);
  if (!sleutel) return null;

  return {
    text: feit.text,
    source: feit.source,
    // De URL zit al in `source` ("site https://…"); apart opslaan maakt hem
    // opvraagbaar zonder de string te moeten uitkammen.
    sourceUrl: /https?:\/\/\S+/.exec(feit.source)?.[0] ?? null,
    kind: feit.kind,
    citable: true,
    allowed: feit.allowed,
    factKey: sleutel,
    ...extra,
  };
}

/**
 * Zet de aangeleverde feiten in de bank en geeft de actuele stand terug.
 *
 * ── SCOPE ───────────────────────────────────────────────────────────────────
 *
 * Feiten van de klant en van het merk zijn MERKBREED (`analysis_id = null`): ze
 * gelden voor elke analyse. Feiten uit de sitetekst van dit onderwerp horen bij
 * DEZE analyse — dezelfde zin kan bij een ander onderwerp irrelevant zijn, en
 * hem merkbreed maken zou elke andere analyse vervuilen.
 *
 * ── FOUTTOLERANT ────────────────────────────────────────────────────────────
 *
 * Gaat het schrijven stuk, dan komt de aangeleverde lijst gewoon terug zonder
 * id's. De feitenkaart werkt dan precies zoals vóór 0036: minder goed (geen
 * identiteit, geen tegenspraakdetectie) maar niet stuk. Een verrijking mag nooit
 * een briefing blokkeren — zelfde afspraak als bij R4.2 en S1.
 */
export async function syncBrandFacts(
  admin: Admin,
  args: {
    profileId: string;
    analysisId: string;
    /** Merkbrede feiten: klantantwoorden en proof points. */
    brandWide: RawFact[];
    /** Onderwerp-specifieke feiten: de geatomiseerde sitezinnen. */
    topicScoped: RawFact[];
    /** Waar een feit vandaan komt, op tekst gesleuteld. */
    origins?: Map<string, { factRequestId?: string | null; documentId?: string | null }>;
  },
): Promise<SyncResult> {
  const { profileId, analysisId, brandWide, topicScoped, origins } = args;

  const inkomend: { scope: string | null; feit: IncomingFact }[] = [];
  for (const feit of brandWide) {
    const herkomst = origins?.get(feit.text);
    const om = toIncoming(feit, null, {
      originFactRequestId: herkomst?.factRequestId ?? null,
      originDocumentId: herkomst?.documentId ?? null,
    });
    if (om) inkomend.push({ scope: null, feit: om });
  }
  for (const feit of topicScoped) {
    const om = toIncoming(feit, analysisId);
    if (om) inkomend.push({ scope: analysisId, feit: om });
  }

  try {
    const { data: bestaand, error } = await admin
      .from("brand_facts")
      .select("id, text, source, kind, citable, allowed, fact_key, analysis_id")
      .eq("profile_id", profileId)
      .is("superseded_by", null);
    if (error) throw new Error(error.message);

    const rijen = (bestaand ?? []) as {
      id: string;
      text: string;
      source: string;
      kind: string;
      citable: boolean;
      allowed: boolean;
      fact_key: string;
      analysis_id: string | null;
    }[];

    // Per scope apart plannen: een merkbreed feit en een analysefeit met dezelfde
    // sleutel zijn twee verschillende dingen (het eerste geldt overal, het tweede
    // alleen hier), en de unieke index in 0036 behandelt ze ook zo.
    const alleContradicties: Contradiction[] = [];
    for (const scope of [null, analysisId]) {
      const huidig: StoredFact[] = rijen
        .filter((r) => r.analysis_id === scope)
        .map((r) => ({
          id: r.id,
          text: r.text,
          source: r.source,
          kind: r.kind,
          citable: r.citable,
          allowed: r.allowed,
          factKey: r.fact_key,
        }));

      const nieuw = inkomend.filter((i) => i.scope === scope).map((i) => i.feit);
      const plan = planFactMerge(huidig, nieuw);
      alleContradicties.push(...plan.contradictions);

      await applyPlan(admin, profileId, scope, plan);
    }

    // Terugleze ná het schrijven: dan hebben ook de nieuwe rijen hun id, en is
    // de volgorde die van de database in plaats van die van het geheugen.
    const { data: actueel } = await admin
      .from("brand_facts")
      .select("id, text, source, kind, citable, allowed, analysis_id, created_at")
      .eq("profile_id", profileId)
      .is("superseded_by", null)
      .order("created_at", { ascending: true });

    const bruikbaar = (actueel ?? []).filter(
      (r) => r.analysis_id === null || r.analysis_id === analysisId,
    );

    return {
      facts: bruikbaar.map((r) => ({
        id: r.id as string,
        text: r.text as string,
        source: r.source as string,
        allowed: r.allowed as boolean,
        citable: r.citable as boolean,
      })),
      contradictions: alleContradicties,
    };
  } catch (err) {
    console.warn(`Feitenbank bijwerken mislukt voor profiel ${profileId}:`, err);
    return {
      facts: inkomend.map(({ feit }) => ({
        id: "",
        text: feit.text,
        source: feit.source,
        allowed: feit.allowed,
        citable: feit.citable,
      })),
      contradictions: [],
    };
  }
}

/** Het plan uitvoeren: eerst vervangen, dan invoegen. */
async function applyPlan(
  admin: Admin,
  profileId: string,
  analysisId: string | null,
  plan: ReturnType<typeof planFactMerge>,
): Promise<void> {
  // ── Vervangen ─────────────────────────────────────────────────────────────
  //
  // Het oude feit eerst afvlaggen, dan het nieuwe invoegen. De unieke index in
  // 0036 laat maar één actueel feit per sleutel toe, dus andersom zou de insert
  // erop botsen — hetzelfde patroon als bij de contentversies (migratie 0023).
  for (const { oldId, by } of plan.supersede) {
    const { data: nieuw, error } = await admin
      .from("brand_facts")
      .update({ superseded_by: oldId, updated_at: new Date().toISOString() })
      .eq("id", oldId)
      .select("id")
      .maybeSingle();

    // Het oude feit wijst voorlopig naar zichzelf; dat is een tijdelijke,
    // onschuldige waarde die de index vrijmaakt. Direct hierna wijzen we hem
    // naar de opvolger.
    if (error || !nieuw) {
      console.warn(`Feit ${oldId} afvlaggen mislukt: ${error?.message ?? "geen rij"}`);
      continue;
    }

    const opvolger = await insertFact(admin, profileId, analysisId, by);
    if (opvolger) {
      await admin.from("brand_facts").update({ superseded_by: opvolger }).eq("id", oldId);
    }
  }

  // ── Invoegen ──────────────────────────────────────────────────────────────
  for (const feit of plan.insert) {
    await insertFact(admin, profileId, analysisId, feit);
  }
}

async function insertFact(
  admin: Admin,
  profileId: string,
  analysisId: string | null,
  feit: IncomingFact,
): Promise<string | null> {
  const { data, error } = await admin
    .from("brand_facts")
    .insert({
      profile_id: profileId,
      analysis_id: analysisId,
      text: feit.text,
      source: feit.source,
      source_url: feit.sourceUrl ?? null,
      kind: feit.kind,
      citable: feit.citable,
      allowed: feit.allowed,
      fact_key: feit.factKey,
      verify_after: feit.verifyAfter ?? null,
      origin_fact_request_id: feit.originFactRequestId ?? null,
      origin_document_id: feit.originDocumentId ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Botsing op de unieke index betekent dat het feit er al staat — dat is de
    // bedoeling van die index en geen fout om over te klagen.
    if (!error.message.includes("duplicate key")) {
      console.warn(`Feit opslaan mislukt (${feit.factKey}): ${error.message}`);
    }
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

/**
 * Alles wat we over een klant weten, ongeacht analyse.
 *
 * Dít is wat `contentbriefing.md` §7 belooft — "na drie analyses heeft een klant
 * een gevulde feitenbank" — en wat vóór 0036 alleen te beantwoorden was door
 * tien JSON-blokken open te klappen.
 */
export async function loadBrandFacts(
  admin: Admin,
  profileId: string,
): Promise<{ id: string; text: string; source: string; allowed: boolean; verifyAfter: string | null }[]> {
  const { data } = await admin
    .from("brand_facts")
    .select("id, text, source, allowed, verify_after")
    .eq("profile_id", profileId)
    .is("superseded_by", null)
    .order("created_at", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id as string,
    text: r.text as string,
    source: r.source as string,
    allowed: r.allowed as boolean,
    verifyAfter: (r.verify_after as string | null) ?? null,
  }));
}
