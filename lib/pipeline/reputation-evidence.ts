import "server-only";

/**
 * Blok E: één onderzoeksronde die het gedeelde bewijscorpus vult.
 *
 * ── ⚠️ WAAROM DIT BESTAAT, EN WAAROM HET VOORAL EEN MEETVERBETERING IS ──────
 *
 * In de eerste opzet deed elke dienstvraag zijn eigen web-zoekactie. Twaalf keer
 * opnieuw zoeken naar hetzelfde bedrijf. Dat kost geld, en de eerste echte run
 * liet zien hoeveel: van de $0,75 ging ongeveer negentig procent op aan het
 * zoeken zelf en de opgehaalde pagina's.
 *
 * Maar het echte bezwaar is methodologisch en dat weegt zwaarder. **Elke vraag
 * kreeg andere zoekresultaten.** Valt de dienst "onderhoud" negatiever uit dan
 * "installatie", dan weet je niet of dat komt doordat de reputatie verschilt of
 * doordat de zoekmachine die seconde andere pagina's opleverde. Je meet twee
 * dingen tegelijk en kunt ze niet uit elkaar halen. Dat is precies het soort
 * verschil waar de klant zijn kwartaalplan op baseert.
 *
 * Met één corpus is het verschil tussen twee diensten een écht verschil, want de
 * onderbouwing is voor allebei dezelfde.
 *
 * ── ⚠️ WAT HIER BEWUST NIET OP HET CORPUS DRAAIT ────────────────────────────
 *
 * De merkbrede vragen en de marktvraag blijven zélf zoeken. Die simuleren wat
 * een echte gebruiker te zien krijgt, en dat is de belofte van het product: we
 * meten ChatGPT zoals een koper hem aantreft. Zou je die op een corpus zetten,
 * dan meet je wat het model met ONZE selectie doet, en dat is iets anders.
 *
 * De scheidslijn is dus niet willekeurig: SIMULATIEVE vragen zoeken zelf,
 * ANALYTISCHE vragen delen het corpus. Bij het eerste telt realisme, bij het
 * tweede consistentie.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ReputationEvidence } from "@/lib/schemas/reputation";
import { askAndStore, budgetAllows, loadContext, addNote } from "@/lib/pipeline/reputation-context";
import { domainOf } from "@/lib/offsite/domain";
import type { ProfileOffering } from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Hoeveel fragmenten we bewaren.
 *
 * Ruim, want het corpus wordt door twaalf tot vijfentwintig dienstvragen gelezen
 * en elke dienst moet er iets in kunnen vinden. Te krap betekent dat een
 * nichedienst geen bewijs heeft en op "geen beeld" uitkomt terwijl er wel
 * degelijk iets over te vinden was.
 */
const MAX_FRAGMENTEN = 60;

/** Hoeveel tekens van het corpus een dienstvraag meekrijgt. */
export const CORPUS_BUDGET_CHARS = 18_000;

export interface EvidenceResult {
  fragments: number;
  domains: number;
  skipped: boolean;
}

/**
 * Verzamelt het bewijsmateriaal in een handvol brede zoekvragen.
 *
 * Bewust BREED en niet per dienst: het corpus moet alle diensten kunnen
 * bedienen, en een zoekvraag per dienst zou de winst weer weggeven. Vier vragen
 * dekken in de praktijk de hoeken die er toe doen: wat het bedrijf doet, wat
 * klanten zeggen, waar ze ontevreden over zijn, en wat er in de vakwereld over
 * geschreven is.
 */
export async function runEvidenceBlock(admin: Admin, runId: string): Promise<EvidenceResult> {
  const ctx = await loadContext(admin, runId);
  if (!ctx) throw new Error(`Reputatierun ${runId} niet gevonden.`);

  // Idempotent (conventie 9): staat het corpus er al, dan niet opnieuw zoeken.
  // Dit is de duurste enkele stap van de run.
  const { count: bestaand } = await admin
    .from("reputation_evidence")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId);
  if ((bestaand ?? 0) > 0) {
    return { fragments: bestaand ?? 0, domains: 0, skipped: false };
  }

  if (!(await budgetAllows(admin, ctx.run, "evidence"))) {
    return { fragments: 0, domains: 0, skipped: true };
  }

  const { data: offeringRows } = await admin
    .from("profile_offerings")
    .select("name, kind")
    .eq("profile_id", ctx.profile.id)
    .in("kind", ["dienst", "product"])
    .order("sort_order")
    .limit(12);

  const diensten = ((offeringRows ?? []) as Pick<ProfileOffering, "name" | "kind">[])
    .map((o) => o.name)
    .join(", ");

  const merk = ctx.brandName;
  const plaats = ctx.region ? ` in ${ctx.region}` : "";
  const uitsluiting = ctx.disambiguation ? ` ${ctx.disambiguation}` : "";

  const zoekvragen = [
    `Zoek alles wat er online te vinden is over ${merk}${plaats}: wat ze doen, waar ze bekend om ` +
      `staan, en wat er over ze geschreven wordt. Citeer letterlijk en noem per stuk de bron.${uitsluiting}`,
    `Zoek beoordelingen en klantervaringen over ${merk}${plaats}. Citeer letterlijke passages, ` +
      `zowel positieve als negatieve, en noem per stuk de bron.${uitsluiting}`,
    `Zoek klachten en kritiek over ${merk}${plaats}. Waar zijn klanten ontevreden over? Citeer ` +
      `letterlijk en noem de bron.${uitsluiting}`,
    diensten
      ? `Zoek wat er online staat over ${merk}${plaats} op deze specifieke gebieden: ${diensten}. ` +
        `Citeer per gebied letterlijk wat je vindt, en noem de bron.${uitsluiting}`
      : null,
  ].filter((v): v is string => v !== null);

  // ⚠️ VIA `askAndStore` EN NIET RECHTSTREEKS, en dat is een reparatie uit de
  // run op Gasservice Brabant. Deze stap riep het model direct aan, waardoor de
  // ruwe onderzoeksantwoorden nergens werden bewaard. Toen het corpus daar te
  // dun uitviel, was niet vast te stellen of dat kwam doordat er weinig te
  // vinden was of doordat de knipstap materiaal weggooide. De duurste stap van
  // de run liet geen spoor na, en dat is precies wat conventie 8 verbiedt.
  const uitkomsten = await Promise.allSettled(
    zoekvragen.map((vraag, i) =>
      askAndStore(admin, ctx, {
        block: "bewijs",
        offeringId: null,
        question: vraag,
        webSearch: true,
        repeatIndex: i,
      }),
    ),
  );

  const teksten: { vraag: string; tekst: string }[] = [];
  let mislukt = 0;
  for (const [i, u] of uitkomsten.entries()) {
    if (u.status !== "fulfilled") {
      mislukt++;
      console.error(`Onderzoeksvraag ${i} mislukt in run ${runId}:`, u.reason);
      continue;
    }
    teksten.push({ vraag: zoekvragen[i], tekst: u.value.answer.answer_text ?? "" });
  }

  // ⚠️ EEN MISLUKTE ZOEKVRAAG IS GEEN STILTE MEER. Bij Gasservice Brabant
  // sneuvelden er twee van de vier, en dat halveerde het corpus zonder dat
  // iemand het zag: `allSettled` slikte ze met alleen een logregel. Het scherm
  // hoort te weten dat de basis dunner is dan bedoeld.
  if (mislukt > 0) {
    await addNote(
      admin,
      runId,
      `${mislukt} van de ${zoekvragen.length} achtergrondvragen leverde niets op. Het beeld ` +
        `hieronder rust daardoor op minder materiaal dan bedoeld.`,
    );
  }

  if (teksten.length === 0) {
    return { fragments: 0, domains: 0, skipped: true };
  }

  // ── Het ruwe onderzoek opknippen in fragmenten ────────────────────────────
  //
  // Eén goedkope ongegronde aanroep die de gevonden tekst in citeerbare stukken
  // hakt, met hun bron erbij. Dat is nodig omdat een dienstvraag straks het
  // RELEVANTE stuk moet kunnen pakken zonder het hele onderzoek te lezen.
  const rijen: {
    run_id: string;
    query: string;
    url: string | null;
    domain: string | null;
    excerpt: string;
  }[] = [];

  for (const t of teksten) {
    try {
      const r = await callStructured({
        model: MODELS.volume,
        system:
          "Je knipt een onderzoeksantwoord op in losse, citeerbare fragmenten. Neem passages " +
          "LETTERLIJK over; vat niet samen en voeg niets toe. Geef per fragment de bron-URL als " +
          "die in de tekst staat, en een kort onderwerp zodat het fragment terug te vinden is. " +
          "⚠️ Neem RUIM over: niet alleen losse citaten tussen aanhalingstekens, maar ook de " +
          "zinnen eromheen die een feit, een cijfer, een dienst of een ervaring bevatten. Een " +
          "fragment van één woord is onbruikbaar; mik op hele zinnen. Alleen inleidende en " +
          "afsluitende beleefdheden mogen weg. Antwoord in het Nederlands.",
        user: t.tekst,
        schema: ReputationEvidence,
        schemaName: "reputation_evidence",
        webSearch: false,
        work: "deterministic",
        meta: {
          kind: "reputation_bewijs_knip",
          profileId: ctx.profile.id,
          reputationRunId: runId,
        },
      });

      for (const f of r.parsed.fragmenten) {
        const tekst = f.tekst?.trim() ?? "";
        // ⚠️ Vijftig en niet twintig. Bij Gasservice Brabant kwamen er
        // fragmenten van twee woorden uit ("niet professioneel"), en die zeggen
        // los van hun zin niets. Het corpus kwam op een gemiddelde van 48
        // tekens uit, en daar kan geen enkele dienstvraag iets mee.
        if (tekst.length < 50) continue;
        // ⚠️ Alleen fragmenten die LETTERLIJK in het onderzoek staan. Dezelfde
        // controle als bij de citaten in de oordeelslaag: een fragment dat de
        // knipstap erbij verzon zou als bewijs de dienstvragen in gaan, en dan
        // rust het hele blok B op fictie.
        if (!t.tekst.includes(tekst.slice(0, Math.min(40, tekst.length)))) continue;

        const url = f.bron_url?.startsWith("http") ? f.bron_url : null;
        rijen.push({
          run_id: runId,
          query: f.onderwerp?.trim() || t.vraag.slice(0, 120),
          url,
          domain: url ? domainOf(url) : null,
          excerpt: tekst,
        });
        if (rijen.length >= MAX_FRAGMENTEN) break;
      }
    } catch (err) {
      // Faalt zacht: dan blijft dit ene onderzoeksantwoord ongeknipt. De andere
      // drie vullen het corpus nog steeds.
      console.warn(`Fragmenten knippen mislukt in run ${runId}:`, err);
    }
    if (rijen.length >= MAX_FRAGMENTEN) break;
  }

  if (rijen.length > 0) {
    const { error } = await admin.from("reputation_evidence").insert(rijen);
    if (error) throw new Error(`Bewijscorpus opslaan mislukt: ${error.message}`);
  }

  return {
    fragments: rijen.length,
    domains: new Set(rijen.map((r) => r.domain).filter(Boolean)).size,
    skipped: false,
  };
}

/**
 * Het stuk corpus dat één dienstvraag meekrijgt.
 *
 * Selecteert op woordoverlap met de dienstnaam en vult aan met de rest, zodat
 * een nichedienst zijn eigen bewijs krijgt maar een dienst zonder eigen bewijs
 * niet met lege handen staat. Afgekapt op het tekenbudget: het corpus kan groter
 * zijn dan wat er in één vraag past.
 */
export async function corpusFor(
  admin: Admin,
  runId: string,
  offeringName: string | null,
): Promise<string> {
  const { data } = await admin
    .from("reputation_evidence")
    .select("query, url, excerpt")
    .eq("run_id", runId);

  const alles = (data ?? []) as { query: string; url: string | null; excerpt: string }[];
  if (alles.length === 0) return "";

  const woorden = (offeringName ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length > 3);

  const scoor = (f: { query: string; excerpt: string }) => {
    if (woorden.length === 0) return 0;
    const hooi = `${f.query} ${f.excerpt}`.toLowerCase();
    return woorden.filter((w) => hooi.includes(w)).length;
  };

  const gesorteerd = [...alles].sort((a, b) => scoor(b) - scoor(a));

  const stukken: string[] = [];
  let lengte = 0;
  for (const f of gesorteerd) {
    const regel = f.url ? `${f.excerpt}\n(bron: ${f.url})` : f.excerpt;
    if (lengte + regel.length > CORPUS_BUDGET_CHARS) break;
    stukken.push(regel);
    lengte += regel.length;
  }

  return stukken.join("\n\n");
}
