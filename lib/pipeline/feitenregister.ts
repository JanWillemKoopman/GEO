import "server-only";

/**
 * Het feitenregister bijwerken en de conflicten afhandelen
 * (docs/tasks/contentpijplijn-publicatiewaardig.md, WP2, §8).
 *
 * Drie stappen per merk, elk alleen voor wat nog niet gedaan is (conventie 9):
 *
 *   1. Feiten zonder soort indelen (L1, `fact-classify.ts`).
 *   2. Kandidaat-paren zoeken in code (`conflict-detect.ts`).
 *   3. Een nieuw paar laten beoordelen (L2, `conflict-judge.ts`) en het oordeel
 *      vastleggen in `fact_conflicts`, ook als het geen conflict is: dan wordt
 *      hetzelfde paar nooit opnieuw betaald.
 *
 * Een echt conflict zet beide feiten op "betwist". Een antwoord van de klant
 * tegenover de site wint vanzelf (§8.1 punt 4), maar ook dan ziet de adviseur de
 * rij in de lijst. Een betwist feit gaat niet mee in een paginastrategie; of
 * het een pagina TEGENHOUDT, beslist `houdtPaginaTegen()` per pagina.
 *
 * Deze module doet hooguit lichte aanroepen op het goedkope model; de taak
 * `fact_register` die hem draait is daarom licht werk.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { alleRijen } from "@/lib/supabase/pagineer";
import { deelFeitenIn, INDEEL_BATCH } from "@/lib/pipeline/fact-classify";
import { beoordeelConflict } from "@/lib/pipeline/conflict-judge";
import {
  vindKandidaten,
  automatischeWinnaar,
  ernstVan,
  standVanKind,
  type RegisterFeit,
  type Kandidaat,
  type FeitSoort,
  type Stand,
  type Bewijskracht,
  type FeitWaarde,
} from "@/lib/pipeline/conflict-detect";

type Admin = SupabaseClient;

/**
 * Hoeveel batches van 40 er in één run ingedeeld worden. Twaalf is 480 feiten;
 * de drie proefklanten hebben er samen 408 (25 september 2026), dus hun eerste
 * run deelt alles in. Wat overblijft, pakt de volgende run op.
 */
const MAX_BATCHES = 12;
const BATCHES_TEGELIJK = 4;

/**
 * Hoeveel NIEUWE paren er per run naar L2 gaan. Elk paar kost minder dan een
 * tiende cent, dus dit is geen kostengrens maar een tijdsgrens: twintig oordelen
 * in groepjes van vijf blijven ruim binnen de tijd van een lichte taak.
 */
const MAX_OORDELEN = 20;
const PARALLEL = 5;

interface FeitRij {
  id: string;
  text: string;
  source: string;
  kind: string;
  fact_key: string;
  soort: string | null;
  waarde: FeitWaarde | null;
  geldt_voor: string | null;
  stand: string | null;
  bewijskracht: string | null;
  ingedeeld_at: string | null;
  created_at: string | null;
}

interface ConflictRij {
  id: string;
  paar_sleutel: string;
  status: string;
  echt_conflict: boolean;
  feit_ids: string[];
  gekozen_feit_id: string | null;
  fact_request_id: string | null;
}

export interface RegisterUitkomst {
  ingedeeld: number;
  kandidaten: number;
  beoordeeld: number;
  echteConflicten: number;
  automatischOpgelost: number;
}

function naarRegister(r: FeitRij): RegisterFeit {
  return {
    id: r.id,
    text: r.text,
    kind: r.kind,
    factKey: r.fact_key,
    soort: (r.soort as FeitSoort | null) ?? null,
    waarde: r.waarde ?? null,
    geldtVoor: r.geldt_voor,
    stand: (r.stand as Stand | null) ?? null,
    bewijskracht: (r.bewijskracht as Bewijskracht | null) ?? null,
    // Als tekst, ook als de databaselaag een datumobject teruggeeft.
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
  };
}

async function laadFeiten(admin: Admin, profileId: string): Promise<FeitRij[]> {
  return alleRijen<FeitRij>((van, tot) =>
    admin
      .from("brand_facts")
      .select("id, text, source, kind, fact_key, soort, waarde, geldt_voor, stand, bewijskracht, ingedeeld_at, created_at")
      .eq("profile_id", profileId)
      .is("superseded_by", null)
      .order("created_at", { ascending: true })
      .range(van, tot),
  );
}

async function zetStand(admin: Admin, ids: string[], stand: Stand): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await admin
    .from("brand_facts")
    .update({ stand, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw new Error(`Stand van feiten bijwerken mislukt: ${error.message}`);
}

/** Het besluit toepassen: de winnaar bevestigd, de rest vervangen. */
async function pasKeuzeToe(admin: Admin, winnaarId: string, anderen: string[]): Promise<void> {
  await zetStand(admin, [winnaarId], "bevestigd");
  await zetStand(admin, anderen.filter((id) => id !== winnaarId), "vervangen");
}

export async function werkRegisterBij(admin: Admin, profileId: string): Promise<RegisterUitkomst> {
  const uitkomst: RegisterUitkomst = {
    ingedeeld: 0,
    kandidaten: 0,
    beoordeeld: 0,
    echteConflicten: 0,
    automatischOpgelost: 0,
  };

  // ── 1. Indelen ────────────────────────────────────────────────────────────
  let rijen = await laadFeiten(admin, profileId);
  const nogIndelen = rijen.filter((r) => !r.ingedeeld_at).slice(0, MAX_BATCHES * INDEEL_BATCH);
  const batches: FeitRij[][] = [];
  for (let b = 0; b * INDEEL_BATCH < nogIndelen.length; b++) {
    batches.push(nogIndelen.slice(b * INDEEL_BATCH, (b + 1) * INDEEL_BATCH));
  }
  // Vier batches tegelijk: twaalf na elkaar zou op een trage dag de tijd van
  // een lichte taak overschrijden, vier tegelijk houdt het op drie rondes.
  for (let i = 0; i < batches.length; i += BATCHES_TEGELIJK) {
    const groep = batches.slice(i, i + BATCHES_TEGELIJK);
    const uitslagen = await Promise.all(
      groep.map(async (batch) => {
        try {
          return await deelFeitenIn({ feiten: batch.map((r) => ({ id: r.id, text: r.text })), profileId });
        } catch (err) {
          // Een mislukte batch blijft op "nog in te delen" staan; de volgende run
          // probeert hem opnieuw. De rest van het register gaat door.
          console.warn(`Feiten indelen mislukt voor profiel ${profileId}: ${String(err)}`);
          return [];
        }
      }),
    );
    const nu = new Date().toISOString();
    for (const indeling of uitslagen) {
      for (const ind of indeling) {
        const rij = nogIndelen.find((r) => r.id === ind.id)!;
        // Een feit dat al betwist of vervangen is, houdt die stand: indelen is
        // geen besluit over wie gelijk heeft.
        const stand =
          rij.stand === "betwist" || rij.stand === "vervangen" ? rij.stand : standVanKind(rij.kind);
        const { error } = await admin
          .from("brand_facts")
          .update({
            soort: ind.soort,
            waarde: ind.waarde as never,
            geldt_voor: ind.geldtVoor,
            bewijskracht: ind.bewijskracht,
            stand,
            ingedeeld_at: nu,
          })
          .eq("id", ind.id);
        if (!error) uitkomst.ingedeeld++;
      }
    }
  }
  if (uitkomst.ingedeeld > 0) rijen = await laadFeiten(admin, profileId);

  // ── 2. Kandidaten ─────────────────────────────────────────────────────────
  const register = rijen.map(naarRegister);
  const kandidaten = vindKandidaten(register);
  uitkomst.kandidaten = kandidaten.length;

  const { data: conflictData, error: conflictError } = await admin
    .from("fact_conflicts")
    .select("id, paar_sleutel, status, echt_conflict, feit_ids, gekozen_feit_id, fact_request_id")
    .eq("profile_id", profileId);
  if (conflictError) throw new Error(`Conflictlijst lezen mislukt: ${conflictError.message}`);
  const bestaand = new Map(((conflictData ?? []) as ConflictRij[]).map((c) => [c.paar_sleutel, c]));

  // ── 3a. Eerdere besluiten opnieuw toepassen ───────────────────────────────
  //
  // Een vervangen feit kan bij een volgende crawl als nieuwe rij terugkomen.
  // De paarsleutel staat op de fact_keys, dus het besluit van de adviseur
  // herkent de nieuwe rij en past zich toe, in plaats van opnieuw te vragen.
  const nieuw: Kandidaat[] = [];
  for (const k of kandidaten) {
    const eerder = bestaand.get(k.sleutel);
    if (!eerder) {
      nieuw.push(k);
      continue;
    }
    if (!eerder.echt_conflict || eerder.status === "geen_conflict") continue;
    const ids = [k.a.id, k.b.id];
    if (eerder.status === "opgelost" && eerder.gekozen_feit_id) {
      const winnaar = await winnaarOpSleutel(admin, eerder.gekozen_feit_id, k);
      if (winnaar) await pasKeuzeToe(admin, winnaar.id, ids);
      continue;
    }
    // Open of gevraagd: beide feiten blijven betwist, ook de nieuwe rij.
    await zetStand(admin, ids, "betwist");
    if (ids.some((id) => !eerder.feit_ids.includes(id))) {
      await admin.from("fact_conflicts").update({ feit_ids: ids, updated_at: new Date().toISOString() }).eq("id", eerder.id);
    }
  }

  // ── 3b. Nieuwe paren beoordelen ───────────────────────────────────────────
  const bronVan = new Map(rijen.map((r) => [r.id, r.source]));
  const teBeoordelen = nieuw.slice(0, MAX_OORDELEN);
  for (let i = 0; i < teBeoordelen.length; i += PARALLEL) {
    const groep = teBeoordelen.slice(i, i + PARALLEL);
    const oordelen = await Promise.all(
      groep.map(async (k) => {
        try {
          return await beoordeelConflict({
            kandidaat: k,
            bronA: bronVan.get(k.a.id) ?? k.a.kind,
            bronB: bronVan.get(k.b.id) ?? k.b.kind,
            profileId,
          });
        } catch (err) {
          console.warn(`Conflict beoordelen mislukt (${k.sleutel}): ${String(err)}`);
          return null;
        }
      }),
    );

    for (let j = 0; j < groep.length; j++) {
      const k = groep[j];
      const r = oordelen[j];
      // Mislukt: geen rij, zodat de volgende run het paar opnieuw probeert.
      if (!r) continue;
      uitkomst.beoordeeld++;
      const { oordeel, raw } = r;
      const voorstelFeit = oordeel.voorstel === "A" ? k.a : oordeel.voorstel === "B" ? k.b : null;
      const winnaar = oordeel.echtConflict ? automatischeWinnaar(k.a, k.b) : null;
      const nu = new Date().toISOString();

      const { error } = await admin.from("fact_conflicts").insert({
        profile_id: profileId,
        feit_ids: [k.a.id, k.b.id],
        paar_sleutel: k.sleutel,
        soort: k.soort,
        echt_conflict: oordeel.echtConflict,
        ernst: ernstVan(k.soort),
        uitleg: oordeel.uitleg,
        voorstel: voorstelFeit ? oordeel.voorstelReden || null : null,
        voorstel_feit_id: voorstelFeit?.id ?? null,
        status: !oordeel.echtConflict ? "geen_conflict" : winnaar ? "opgelost" : "open",
        gekozen_feit_id: winnaar?.id ?? null,
        oplossing: winnaar ? "automatisch" : null,
        opgelost_op: winnaar ? nu : null,
        oordeel_json: { oordeel, raw } as never,
      });
      if (error) {
        // Een gelijktijdige run die hetzelfde paar al vastlegde: de unieke index
        // houdt het tegen, en dat is precies wat hij moet doen.
        console.warn(`Conflict vastleggen mislukt (${k.sleutel}): ${error.message}`);
        continue;
      }

      if (!oordeel.echtConflict) continue;
      uitkomst.echteConflicten++;
      if (winnaar) {
        uitkomst.automatischOpgelost++;
        await pasKeuzeToe(admin, winnaar.id, [k.a.id, k.b.id]);
      } else {
        await zetStand(admin, [k.a.id, k.b.id], "betwist");
      }
    }
  }

  // ── 4. Beantwoorde vragen verwerken ───────────────────────────────────────
  await verwerkBeantwoordeVragen(admin, profileId, rijen);

  return uitkomst;
}

/**
 * Welk van de twee huidige feiten hoort bij het eerder gekozen feit? Op
 * `fact_key`, want het gekozen feit kan intussen vervangen zijn door een nieuwe
 * rij met dezelfde tekst.
 */
async function winnaarOpSleutel(admin: Admin, gekozenId: string, k: Kandidaat): Promise<RegisterFeit | null> {
  if (gekozenId === k.a.id) return k.a;
  if (gekozenId === k.b.id) return k.b;
  const { data } = await admin.from("brand_facts").select("fact_key").eq("id", gekozenId).maybeSingle();
  const sleutel = (data as { fact_key: string } | null)?.fact_key;
  if (!sleutel) return null;
  if (sleutel === k.a.factKey) return k.a;
  if (sleutel === k.b.factKey) return k.b;
  return null;
}

/**
 * Een conflict waarvoor de adviseur de ondernemer liet kiezen: is de vraag
 * beantwoord, dan geldt het gekozen feit. De vraag heeft de twee zinnen als
 * keuzes, dus het antwoord is zonder model terug te leggen op een feit.
 */
async function verwerkBeantwoordeVragen(admin: Admin, profileId: string, rijen: FeitRij[]): Promise<void> {
  const { data } = await admin
    .from("fact_conflicts")
    .select("id, feit_ids, fact_request_id")
    .eq("profile_id", profileId)
    .eq("status", "gevraagd");
  for (const c of (data ?? []) as { id: string; feit_ids: string[]; fact_request_id: string | null }[]) {
    if (!c.fact_request_id) continue;
    const { data: vraag } = await admin
      .from("fact_requests")
      .select("status, answer")
      .eq("id", c.fact_request_id)
      .maybeSingle();
    const v = vraag as { status: string; answer: string | null } | null;
    if (!v || v.status !== "beantwoord" || !v.answer?.trim()) continue;

    const antwoord = v.answer.trim().toLowerCase();
    const winnaar = rijen.find((r) => c.feit_ids.includes(r.id) && r.text.trim().toLowerCase() === antwoord);
    const nu = new Date().toISOString();
    if (winnaar) {
      await pasKeuzeToe(admin, winnaar.id, c.feit_ids);
    } else {
      // "Geen van beide" of een eigen antwoord: dat antwoord komt als klantfeit
      // in de bank en wint daar van beide sitefeiten. De twee oude gaan eruit.
      await zetStand(admin, c.feit_ids, "vervangen");
    }
    await admin
      .from("fact_conflicts")
      .update({
        status: "opgelost",
        oplossing: "vraag",
        gekozen_feit_id: winnaar?.id ?? null,
        opgelost_op: nu,
        updated_at: nu,
      })
      .eq("id", c.id);
  }
}

/** Wat de adviseur kiest op het conflictscherm (§8.3). */
export type Keuze = { feitId: string } | { vraag: true };

/** "Geen van beide" als laatste keuze in de vraag aan de ondernemer. */
export const GEEN_VAN_BEIDE = "Geen van beide, ik vul het zelf in";

/**
 * Het besluit van de adviseur vastleggen. Geeft een foutmelding in gewone taal
 * terug als het niet kan; `null` als het gelukt is.
 */
export async function losConflictOp(
  admin: Admin,
  args: { profileId: string; conflictId: string; userId: string; keuze: Keuze },
): Promise<string | null> {
  const { data } = await admin
    .from("fact_conflicts")
    .select("id, feit_ids, status, echt_conflict")
    .eq("id", args.conflictId)
    .eq("profile_id", args.profileId)
    .maybeSingle();
  const c = data as { id: string; feit_ids: string[]; status: string; echt_conflict: boolean } | null;
  if (!c) return "Dit conflict bestaat niet (meer).";
  if (!c.echt_conflict) return "Dit paar is geen conflict.";
  const nu = new Date().toISOString();

  if ("feitId" in args.keuze) {
    const winnaar = args.keuze.feitId;
    if (!c.feit_ids.includes(winnaar)) return "Kies een van de twee feiten uit dit conflict.";
    await pasKeuzeToe(admin, winnaar, c.feit_ids);
    const { error } = await admin
      .from("fact_conflicts")
      .update({
        status: "opgelost",
        oplossing: "adviseur",
        gekozen_feit_id: winnaar,
        opgelost_door: args.userId,
        opgelost_op: nu,
        updated_at: nu,
      })
      .eq("id", c.id);
    return error ? `Opslaan mislukt: ${error.message}` : null;
  }

  // Vraag het de ondernemer: één keuzevraag met de twee zinnen letterlijk.
  const { data: feiten } = await admin.from("brand_facts").select("id, text").in("id", c.feit_ids);
  const teksten = ((feiten ?? []) as { id: string; text: string }[]).map((f) => f.text);
  if (teksten.length < 2) return "De feiten van dit conflict zijn niet meer te vinden.";
  const { data: vraag, error: vraagFout } = await admin
    .from("fact_requests")
    .insert({
      profile_id: args.profileId,
      analysis_id: null,
      scope: "merk",
      kind: "verificatie",
      answer_type: "keuze",
      options: [...teksten, GEEN_VAN_BEIDE],
      required: false,
      question: "Hier staan twee verschillende dingen over. Welke klopt?",
      reason: "Op je site en in wat je ons vertelde staan twee versies. We zetten alleen de juiste op je pagina's.",
      status: "open",
    })
    .select("id")
    .single();
  if (vraagFout || !vraag) return `De vraag aanmaken mislukte: ${vraagFout?.message ?? "onbekend"}`;
  const { error } = await admin
    .from("fact_conflicts")
    .update({
      status: "gevraagd",
      oplossing: "vraag",
      fact_request_id: (vraag as { id: string }).id,
      opgelost_door: args.userId,
      updated_at: nu,
    })
    .eq("id", c.id);
  return error ? `Opslaan mislukt: ${error.message}` : null;
}
