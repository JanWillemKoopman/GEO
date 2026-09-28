/**
 * HET TERUGVULLEN VAN DE KENNISLAAG (K3 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Idempotent en zonder AI. De vertaling staat in `lib/kennis/terugvullen.ts`;
 * dit script leest, voert uit en telt.
 *
 * ── TWEE MANIEREN (besluit V15) ─────────────────────────────────────────────
 *
 * 1. Via een bestand, als de omgeving de sleutel van de productiedatabase niet
 *    heeft:
 *
 *      npx tsx scripts/kennis-terugvullen.ts --export-sql      # de leesquery
 *      (draai die query met de databasetool, bewaar de uitvoer als bron.json)
 *      npx tsx scripts/kennis-terugvullen.ts --bron bron.json --uit rijen.json
 *      npx tsx scripts/kennis-terugvullen.ts --insert-sql      # de schrijfquery
 *      (draai die met de inhoud van rijen.json als parameter)
 *
 *    Elke rij gaat eerst door dezelfde controles als `legVast()`; op productie
 *    toetsen de check-constraints ze nog een keer.
 *
 * 2. Rechtstreeks, met `NEXT_PUBLIC_SUPABASE_URL` en `SUPABASE_SERVICE_ROLE_KEY`:
 *
 *      npx tsx scripts/kennis-terugvullen.ts --live
 *
 *    Dan schrijft elk item via `legVast()`, de enige schrijfingang (K2).
 *
 * Een tweede run schrijft niets: wat er al staat, wordt op de sleutel herkend.
 * Het script stopt met een fout als een oude rij geen item en geen bewuste
 * uitsluiting heeft (`dekking()`), of als een item de regels niet haalt.
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {
  maakTerugvulplan,
  dekking,
  zetOm,
  telling,
  TERUGVUL_TAAK,
  INSERT_SQL,
  EXPORT_SQL,
  type BronMerk,
  type Terugvulplan,
} from "@/lib/kennis/terugvullen";



type BronMetSleutels = BronMerk & { bestaandeSleutels?: Record<string, string> };

function rapport(merk: BronMerk, plan: Terugvulplan, regels: string[]): void {
  const naam = merk.profiel.brand_name ?? merk.profiel.id;
  regels.push(`\n## ${naam}`);
  regels.push(`Items: ${plan.items.length}, bewust uitgesloten: ${plan.uitsluitingen.length}, voor de consultant: ${plan.voorConsultant.length}`);
  for (const u of plan.voorConsultant) regels.push(`  consultant: ${u.ref}: ${u.reden}`);
}

function vanBestand(bronPad: string, uitPad: string): void {
  const ruw = JSON.parse(readFileSync(bronPad, "utf8")) as unknown;
  const merken = (Array.isArray(ruw) ? ruw : []).map((r) => ((r as { merk?: unknown }).merk ?? r) as BronMetSleutels);
  const regels: string[] = [];
  const alleRijen: unknown[] = [];
  let fout = false;
  for (const merk of merken) {
    const plan = maakTerugvulplan(merk);
    rapport(merk, plan, regels);
    const gaten = dekking(merk, plan);
    if (gaten.length > 0) {
      fout = true;
      regels.push(`  FOUT: geen item en geen uitsluiting voor ${gaten.join(", ")}`);
    }
    const om = zetOm(plan, randomUUID, new Map(Object.entries(merk.bestaandeSleutels ?? {})));
    for (const g of om.geweigerd) {
      fout = true;
      regels.push(`  FOUT: ${g.ref} haalt de regels niet: ${g.fouten.join(" ")}`);
    }
    regels.push(`  Nieuwe rijen: ${om.rijen.length}, al aanwezig of dubbel: ${om.dubbel.length}`);
    for (const [k, n] of Object.entries(telling(om.rijen))) regels.push(`    ${k}: ${n}`);
    alleRijen.push(...om.rijen);
  }
  console.log(regels.join("\n"));
  if (fout) {
    console.error("\nNiet weggeschreven: los eerst de fouten hierboven op.");
    process.exit(1);
  }
  writeFileSync(uitPad, JSON.stringify(alleRijen));
  console.log(`\n${alleRijen.length} rijen in ${uitPad}.`);
  // De schrijfquery met de rijen erin, voor de databasetool (die geen
  // parameters kent). Het aanhalingsteken verdubbelen is de enige escape die
  // een SQL-tekstwaarde nodig heeft.
  const sqlPad = uitPad.replace(/\.json$/, "") + ".sql";
  writeFileSync(sqlPad, INSERT_SQL.replace("$1::jsonb", `'${JSON.stringify(alleRijen).replace(/'/g, "''")}'::jsonb`));
  console.log(`De schrijfquery staat in ${sqlPad}.`);
}

async function live(): Promise<void> {
  // `lib/kennis/vastleggen.ts` begint met `import "server-only"`; buiten Next
  // bestaat dat pakket niet. Dezelfde omleiding als de ketentest.
  const require_ = createRequire(import.meta.url);
  type ResolveFn = (request: string, ...rest: unknown[]) => string;
  const ModuleCtor = require_("node:module") as { _resolveFilename: ResolveFn };
  const origineel = ModuleCtor._resolveFilename;
  const stub = join(process.cwd(), "scripts/chain/server-only-stub.js");
  ModuleCtor._resolveFilename = ((request: string, ...rest: unknown[]) =>
    request === "server-only" ? stub : origineel(request, ...rest)) as ResolveFn;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sleutel = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !sleutel) {
    console.error("Voor --live zijn NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY nodig. Gebruik anders --bron (besluit V15).");
    process.exit(1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const { legVast } = await import("@/lib/kennis/vastleggen");
  const admin = createClient(url, sleutel, { auth: { persistSession: false } });

  const { data: profielen, error } = await admin.from("profiles").select("id").is("archived_at", null);
  if (error) throw new Error(`Merken lezen mislukte: ${error.message}`);
  const regels: string[] = [];
  let fout = false;
  for (const { id } of (profielen ?? []) as { id: string }[]) {
    const merk = await laadBron(admin, id);
    const plan = maakTerugvulplan(merk);
    rapport(merk, plan, regels);
    const gaten = dekking(merk, plan);
    if (gaten.length > 0) {
      fout = true;
      regels.push(`  FOUT: geen item en geen uitsluiting voor ${gaten.join(", ")}`);
      continue;
    }
    const idVan = new Map<string, string>();
    const soorten: Record<string, number> = {};
    for (const item of plan.items) {
      const geldtVoor = item.geldtVoorRefs.map((r) => idVan.get(r)).filter((x): x is string => Boolean(x));
      const uitkomst = await legVast(
        admin as never,
        {
          profileId: merk.profiel.id, domein: item.domein, soort: item.soort, bewering: item.bewering, waarde: item.waarde,
          status: item.status, bewijskracht: item.bewijskracht, bron: item.bron, bronUrl: item.bronUrl, citaat: item.citaat,
          gebruik: item.gebruik, geldtVoor, analysisId: item.analysisId, contentPieceId: item.contentPieceId,
          herkomst: item.herkomst, ruw: item.ruw,
        },
        { actor: "code", taak: TERUGVUL_TAAK },
      );
      soorten[uitkomst.soort] = (soorten[uitkomst.soort] ?? 0) + 1;
      if (uitkomst.soort === "geweigerd") {
        fout = true;
        regels.push(`  FOUT: ${item.ref}: ${uitkomst.fouten.join(" ")}`);
      } else {
        idVan.set(item.ref, uitkomst.item.id);
      }
    }
    regels.push(`  ${Object.entries(soorten).map(([k, n]) => `${k}: ${n}`).join(", ")}`);
  }
  console.log(regels.join("\n"));
  if (fout) process.exit(1);
}

async function laadBron(admin: import("@supabase/supabase-js").SupabaseClient, id: string): Promise<BronMerk> {
  const [profiel, herkomst, feiten, aanbod, vragen, strategie, facetten] = await Promise.all([
    admin.from("profiles").select("*").eq("id", id).single(),
    admin.from("profile_field_sources").select("field, source, not_applicable").eq("profile_id", id),
    admin.from("brand_facts").select("*").eq("profile_id", id),
    admin.from("profile_offerings").select("*").eq("profile_id", id),
    admin.from("fact_requests").select("id, analysis_id, question, answer, status, scope, content_piece_ids, open_vraag, raw_json").eq("profile_id", id),
    admin.from("profile_strategy").select("*").eq("profile_id", id).maybeSingle(),
    admin.from("profile_facets").select("id, facet, raw_json").eq("profile_id", id).in("facet", ["synthese", "markt", "techniek"]),
  ]);
  if (profiel.error || !profiel.data) throw new Error(`Merk ${id} lezen mislukte: ${profiel.error?.message}`);
  return {
    profiel: profiel.data as BronMerk["profiel"],
    veldHerkomst: (herkomst.data ?? []) as BronMerk["veldHerkomst"],
    feiten: (feiten.data ?? []) as BronMerk["feiten"],
    aanbod: (aanbod.data ?? []) as BronMerk["aanbod"],
    vragen: (vragen.data ?? []) as BronMerk["vragen"],
    strategie: (strategie.data ?? null) as BronMerk["strategie"],
    facetten: (facetten.data ?? []) as BronMerk["facetten"],
  };
}

const args = process.argv.slice(2);
const waarde = (vlag: string) => {
  const i = args.indexOf(vlag);
  return i >= 0 ? args[i + 1] : undefined;
};

if (args.includes("--export-sql")) {
  console.log(EXPORT_SQL);
} else if (args.includes("--insert-sql")) {
  console.log(INSERT_SQL);
} else if (args.includes("--live")) {
  live().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
} else if (waarde("--bron") && waarde("--uit")) {
  vanBestand(waarde("--bron")!, waarde("--uit")!);
} else {
  console.error("Gebruik: --export-sql | --bron bron.json --uit rijen.json | --insert-sql | --live");
  process.exit(1);
}
