/**
 * Een echte, wegwerpbare Postgres voor de ketentest (implementatieplan.md S7).
 *
 * ── WAAROM ECHT EN NIET NAGEBOOTST ──────────────────────────────────────────
 *
 * De kop van `scripts/test-unit.ts` zegt terecht: "een test met een nagebootste
 * database toetst vooral of je nabootsing klopt". Dat bezwaar is dodelijk voor
 * een mock, en het geldt niet voor deze opzet, want het schema komt uit
 * dezelfde migratiebestanden die op productie draaien. De unieke index van
 * migratie `0023` (één huidige versie per analyse+titel) doet hier echt wat hij
 * daar doet, en het enum `content_status` weigert hier echt een onbekende
 * waarde. Precies de dingen waar de fouten van dit traject langs glipten.
 *
 * ── GEEN DOCKER NODIG ───────────────────────────────────────────────────────
 *
 * `initdb` + `pg_ctl` uit een lokaal geïnstalleerde PostgreSQL. Dat scheelt de
 * Supabase CLI en een draaiende Docker-daemon, en het maakt het verschil tussen
 * een test die iedereen kan draaien en een test die alleen op de goede machine
 * werkt.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { chownSync, mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { userInfo } from "node:os";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "pg";

/**
 * Postgres weigert als root te draaien, en in containers is root de norm.
 *
 * `initdb` stopt met "cannot be run as root", terecht, want een database die
 * als root draait kan elk bestand op de machine schrijven. We zoeken daarom een
 * gewone gebruiker om de server onder te hangen. Draait de test al als
 * niet-root, dan verandert er niets.
 */
function unprivilegedIds(): { uid: number; gid: number } | null {
  if (typeof process.getuid !== "function" || process.getuid() !== 0) return null;

  const opgegeven = Number(process.env.PG_RUN_AS_UID);
  if (Number.isFinite(opgegeven) && opgegeven > 0) {
    return { uid: opgegeven, gid: Number(process.env.PG_RUN_AS_GID) || opgegeven };
  }

  // De eerste gewone gebruiker op het systeem. In vrijwel elke image is dat
  // uid 1000; bestaat die niet, dan is er niets om naar terug te vallen en
  // zeggen we dat liever hardop dan dat de test onverklaarbaar faalt.
  for (const uid of [1000, 1001, 65534]) {
    try {
      userInfo({ encoding: "utf8" });
      execFileSync("id", ["-u", String(uid)], { stdio: "pipe" });
      const gid = Number(execFileSync("id", ["-g", String(uid)], { encoding: "utf8" }).trim());
      return { uid, gid: Number.isFinite(gid) ? gid : uid };
    } catch {
      continue;
    }
  }
  throw new Error(
    "De ketentest draait als root en er is geen gewone gebruiker gevonden om Postgres onder " +
      "te starten. Zet PG_RUN_AS_UID op een bestaande uid.",
  );
}

/** Waar de PostgreSQL-binaries staan. Ubuntu zet ze niet standaard in PATH. */
function findBinDir(): string {
  const kandidaten = [
    process.env.PG_BIN_DIR,
    ...["18", "17", "16", "15", "14"].map((v) => `/usr/lib/postgresql/${v}/bin`),
    "/usr/local/bin",
    "/opt/homebrew/bin",
  ].filter((p): p is string => Boolean(p));

  for (const dir of kandidaten) {
    if (existsSync(join(dir, "initdb")) && existsSync(join(dir, "pg_ctl"))) return dir;
  }
  throw new Error(
    "Geen PostgreSQL-binaries gevonden. Installeer postgresql (of zet PG_BIN_DIR). " +
      "De ketentest draait tegen een echte database; zonder is er niets te toetsen.",
  );
}

export interface TestDatabase {
  client: Client;
  stop: () => Promise<void>;
}

/**
 * `auth.users` bestaat in Supabase en niet in een kale Postgres, terwijl
 * migratie `0001` er een foreign key naar legt.
 *
 * Bewust een stub met dezelfde kolomnaam en hetzelfde type, en niet een
 * aangepaste migratie: dan zou de test op een ánder schema draaien dan
 * productie, en dat is precies wat deze opzet wil vermijden.
 */
const AUTH_STUB = `
  create schema if not exists auth;
  create table if not exists auth.users (
    id    uuid primary key,
    email text
  );
  -- Supabase levert deze functies; de RLS-migratie (0002) verwijst ernaar.
  -- De policies zelf doen in deze test niets: de pijplijn draait met de
  -- service-role en die omzeilt RLS (abcplan.md §5). Ze moeten alleen kunnen
  -- worden AANGEMAAKT, zodat het schema gelijk is aan dat op productie.
  create or replace function auth.uid() returns uuid
    language sql stable as $$ select null::uuid $$;
  create or replace function auth.role() returns text
    language sql stable as $$ select 'service_role'::text $$;
`;

/**
 * De rollen die Supabase standaard aanmaakt en waar migraties rechten aan geven.
 *
 * Ook hier: liever de rollen erbij dan de migratie aanpassen. Een `grant` die
 * lokaal wegvalt is een verschil tussen dit schema en dat op productie, en dan
 * toetst de ketentest iets anders dan er draait.
 */
const ROL_STUB = `
  do $$
  begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
      create role service_role nologin;
    end if;
  end
  $$;
`;

/**
 * Migraties die lokaal niet kunnen draaien, met de reden erbij.
 *
 * `0015` installeert pg_cron en pg_net en plant de werker in. Dat gaat over de
 * MOTOR (wie roept de wachtrij aan) en niet over het datamodel; de ketentest
 * roept de handlers zelf aan, dus er valt niets te missen. Alle andere migraties
 * draaien wél, inclusief de constraints en indexen waar het om gaat.
 *
 * `0050` doet hetzelfde voor de dagelijkse schrijfronde van het contentplan: ook
 * pg_cron, ook alleen een aanroeper. Wat die route beslist staat in
 * `lib/plan-writing.ts` en wordt hierboven wél getest.
 */
const OVERSLAAN = new Set([
  "0015_worker_cron_via_pg_cron.sql",
  "0050_plan_cron.sql",
]);

/** Start een lege Postgres, past alle migraties toe, en geeft een verbinding terug. */
export async function startTestDatabase(migrationsDir: string): Promise<TestDatabase> {
  const bin = findBinDir();
  const dataDir = mkdtempSync(join(tmpdir(), "geo-chain-pg-"));
  const socketDir = mkdtempSync(join(tmpdir(), "geo-chain-sock-"));
  const port = 5000 + Math.floor(Math.random() * 10_000);

  const ids = unprivilegedIds();
  if (ids) {
    chownSync(dataDir, ids.uid, ids.gid);
    chownSync(socketDir, ids.uid, ids.gid);
  }
  const alsGebruiker = ids ? { uid: ids.uid, gid: ids.gid } : {};

  execFileSync(join(bin, "initdb"), ["-D", dataDir, "-U", "postgres", "--auth=trust"], {
    stdio: "pipe",
    ...alsGebruiker,
  });
  execFileSync(
    join(bin, "pg_ctl"),
    ["-D", dataDir, "-o", `-p ${port} -k ${socketDir} -h ""`, "-l", join(dataDir, "server.log"), "start"],
    { stdio: "pipe", ...alsGebruiker },
  );

  const client = new Client({ host: socketDir, port, user: "postgres", database: "postgres" });
  await client.connect();

  const stop = async () => {
    await client.end().catch(() => {});
    spawnSync(join(bin, "pg_ctl"), ["-D", dataDir, "-m", "immediate", "stop"], {
      stdio: "pipe",
      ...alsGebruiker,
    });
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(socketDir, { recursive: true, force: true });
  };

  try {
    await client.query(ROL_STUB);
    await client.query(AUTH_STUB);
    await applyMigrations(client, migrationsDir);
  } catch (err) {
    await stop();
    throw err;
  }

  return { client, stop };
}

/**
 * Alle migraties in volgorde, één transactie per bestand.
 *
 * De `RUN_*.sql`-bestanden zijn bundels die de genummerde migraties herhalen
 * (ze bestaan om ze in één keer in de Supabase-editor te kunnen plakken); die
 * overslaan we, anders draait alles twee keer.
 */
async function applyMigrations(client: Client, dir: string): Promise<void> {
  const bestanden = readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && /^\d{4}_/.test(f))
    .sort();

  for (const bestand of bestanden) {
    if (OVERSLAAN.has(bestand)) continue;
    const sql = readFileSync(join(dir, bestand), "utf8");
    try {
      await client.query(sql);
    } catch (err) {
      throw new Error(`Migratie ${bestand} mislukt: ${err instanceof Error ? err.message : err}`);
    }
  }
}
