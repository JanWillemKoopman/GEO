/**
 * De Supabase-query-builder, vertaald naar SQL tegen een echte Postgres
 * (implementatieplan.md S7).
 *
 * ── WAT HIER NAGEBOOTST IS, EN WAT NIET ─────────────────────────────────────
 *
 * Alleen de wire-vertaling. Het schema is echt (dezelfde migraties), de
 * constraints zijn echt, de enums zijn echt, de unieke indexen zijn echt, en de
 * jobhandlers en pijplijncode die erop draaien zijn echt. Wat deze module doet
 * is `.from("x").select("*").eq("id", y).maybeSingle()` omzetten naar SQL: het
 * stuk dat in productie PostgREST voor z'n rekening neemt.
 *
 * ── WAAROM DIT HET "JE TEST JE NABOOTSING"-BEZWAAR OVERLEEFT ────────────────
 *
 * Omdat hij VALT bij het eerste geval dat hij niet kent. Elke onbekende
 * operator, elk onbekend filter en elke onbekende optie gooit een fout met de
 * naam erin. Een shim die stilletjes iets anders teruggeeft zou het bezwaar
 * terecht maken; een shim die niet stil kan afwijken kan hooguit een test laten
 * falen die eigenlijk had moeten slagen, en dát merk je meteen.
 *
 * Bewust géén poging tot volledigheid: wat de contentketen niet gebruikt, staat
 * er niet in. Zodra een nieuwe stap iets anders nodig heeft, zegt de test dat.
 */
import type { Client } from "pg";

type Rij = Record<string, unknown>;

interface Antwoord<T> {
  data: T;
  /**
   * De foutvorm van de echte client, mét `code`.
   *
   * Die code is geen bijzaak: `enqueue()` kijkt naar `error.code === "23505"`
   * om een botsing op de dedupe-index te herkennen en dan stil over te slaan in
   * plaats van te gooien. Zonder de code zou de shim gooien waar productie
   * doorloopt, en dan test de ketentest ander gedrag dan er draait. Precies het
   * soort stille afwijking dat deze opzet moet uitsluiten.
   */
  error: { message: string; code?: string } | null;
  count?: number | null;
}

/** Eén filtervoorwaarde, al vertaald naar SQL met genummerde parameters. */
interface Filter {
  sql: string;
  params: unknown[];
}

function fout(bericht: string): never {
  throw new Error(
    `supabase-shim: ${bericht}. Voeg het toe aan scripts/chain/supabase-shim.ts, ` +
      `de shim gooit met opzet in plaats van iets anders terug te geven.`,
  );
}

/** Kolomnaam ontsmetten. De aanroepers zijn onze eigen code, maar stil fout gaan mag nooit. */
function kolom(naam: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(naam)) fout(`ongeldige kolomnaam "${naam}"`);
  return `"${naam}"`;
}

class QueryBuilder<T> implements PromiseLike<Antwoord<T>> {
  private filters: Filter[] = [];
  private orderBy: { kolom: string; oplopend: boolean }[] = [];
  private limiet: number | null = null;
  private enkel: "single" | "maybeSingle" | null = null;
  private telling: "exact" | null = null;
  private headOnly = false;
  private kolommen = "*";
  private genest: Embed[] = [];

  constructor(
    private client: Client,
    private tabel: string,
    private soort: "select" | "insert" | "update" | "delete" | "upsert",
    private payload: Rij | Rij[] | null = null,
    private conflictKolom: string | null = null,
  ) {}

  select(kolommen = "*", opties?: { count?: "exact"; head?: boolean }): this {
    // Bij insert/update/delete is `.select()` de "geef de rij terug"-vraag; bij
    // een echte select bepaalt hij de kolommen. In beide gevallen halen we
    // gewoon alles op: minder kolommen levert hier geen snelheid en wél de kans
    // dat een test iets mist wat de productiecode wél zou zien.
    this.kolommen = "*";
    // ⚠️ GENESTE SELECTS WERDEN HIER STIL WEGGEGOOID.
    //
    // `"*, accounts(name)"` werd simpelweg `*`, en dan mist het antwoord de
    // geneste tabel zonder dat iemand iets merkt. Dat is precies het "stil
    // afwijken" dat de kop van dit bestand verbiedt, en het kostte een valse
    // testfout: `lookupInvite()` leek de accountnaam niet terug te geven,
    // terwijl PostgREST hem op productie gewoon levert.
    //
    // Nu worden ze uitgevoerd (zie `voegGenesteToe`), en wat de shim niet kan
    // gooit met de reden erin.
    this.genest = parseEmbeds(kolommen);
    if (opties?.count) this.telling = opties.count;
    if (opties?.head) this.headOnly = true;
    return this;
  }

  eq(kol: string, waarde: unknown): this {
    if (waarde === null) return this.is(kol, null);
    this.filters.push({ sql: `${kolom(kol)} = $$`, params: [waarde] });
    return this;
  }

  neq(kol: string, waarde: unknown): this {
    this.filters.push({ sql: `${kolom(kol)} is distinct from $$`, params: [waarde] });
    return this;
  }

  in(kol: string, waarden: unknown[]): this {
    if (waarden.length === 0) {
      this.filters.push({ sql: "false", params: [] });
      return this;
    }
    this.filters.push({ sql: `${kolom(kol)} = any($$)`, params: [waarden] });
    return this;
  }

  is(kol: string, waarde: null | boolean): this {
    if (waarde === null) {
      this.filters.push({ sql: `${kolom(kol)} is null`, params: [] });
    } else {
      this.filters.push({ sql: `${kolom(kol)} is ${waarde ? "true" : "false"}`, params: [] });
    }
    return this;
  }

  not(kol: string, operator: string, waarde: unknown): this {
    if (operator === "is" && waarde === null) {
      this.filters.push({ sql: `${kolom(kol)} is not null`, params: [] });
      return this;
    }
    if (operator === "eq") {
      this.filters.push({ sql: `${kolom(kol)} is distinct from $$`, params: [waarde] });
      return this;
    }
    fout(`.not() met operator "${operator}"`);
  }

  /**
   * PostgREST's `or`-taal: "scope.eq.merk,analysis_id.eq.<uuid>".
   *
   * Alleen `eq` en `is`, meer gebruikt de contentketen niet. Zie
   * `planContentDraft()`, waar deze vorm de merkbrede antwoorden meetelt.
   */
  or(uitdrukking: string): this {
    const delen = uitdrukking.split(",").map((d) => d.trim()).filter(Boolean);
    const stukken: string[] = [];
    const params: unknown[] = [];

    for (const deel of delen) {
      const [kol, op, ...rest] = deel.split(".");
      const waarde = rest.join(".");
      if (op === "eq") {
        stukken.push(`${kolom(kol)} = $$`);
        params.push(waarde);
      } else if (op === "is" && waarde === "null") {
        stukken.push(`${kolom(kol)} is null`);
      } else if (op === "in") {
        // PostgREST schrijft dit als `kolom.in.(a,b,c)`. Gebruikt door
        // `listBrands()`: "mijn eigen merken OF de merken van mijn accounts".
        // Een lege lijst is `()` en betekent "niets", niet "alles".
        const binnen = waarde.replace(/^\(/, "").replace(/\)$/, "");
        const items = binnen.split(",").map((x) => x.trim()).filter(Boolean);
        if (items.length === 0) {
          stukken.push("false");
        } else {
          stukken.push(`${kolom(kol)} = any($$)`);
          params.push(items);
        }
      } else {
        fout(`.or() met "${deel}"`);
      }
    }

    this.filters.push({ sql: `(${stukken.join(" or ")})`, params });
    return this;
  }

  contains(kol: string, waarde: unknown): this {
    this.filters.push({ sql: `${kolom(kol)} @> $$::jsonb`, params: [JSON.stringify(waarde)] });
    return this;
  }

  order(kol: string, opties?: { ascending?: boolean }): this {
    this.orderBy.push({ kolom: kol, oplopend: opties?.ascending !== false });
    return this;
  }

  limit(n: number): this {
    this.limiet = n;
    return this;
  }

  single(): this {
    this.enkel = "single";
    return this;
  }

  maybeSingle(): this {
    this.enkel = "maybeSingle";
    return this;
  }

  then<R1 = Antwoord<T>, R2 = never>(
    onfulfilled?: ((value: Antwoord<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private whereClause(startIndex: number): { sql: string; params: unknown[] } {
    if (this.filters.length === 0) return { sql: "", params: [] };
    const params: unknown[] = [];
    let i = startIndex;
    const delen = this.filters.map((f) => {
      let sql = f.sql;
      for (const p of f.params) {
        sql = sql.replace("$$", `$${i++}`);
        params.push(p);
      }
      return sql;
    });
    return { sql: ` where ${delen.join(" and ")}`, params };
  }

  private async run(): Promise<Antwoord<T>> {
    try {
      const rijen = await this.execute();
      if (this.genest.length > 0 && rijen.length > 0) {
        await voegGenesteToe(this.client, this.tabel, rijen, this.genest);
      }

      if (this.enkel === "single") {
        if (rijen.length !== 1) {
          return {
            data: null as T,
            // PGRST116 is de code die PostgREST geeft als `.single()` niet
            // precies één rij vindt.
            error: { message: `verwachtte precies 1 rij, kreeg er ${rijen.length}`, code: "PGRST116" },
          };
        }
        return { data: rijen[0] as T, error: null };
      }
      if (this.enkel === "maybeSingle") {
        if (rijen.length > 1) {
          return {
            data: null as T,
            error: { message: `verwachtte hooguit 1 rij, kreeg er ${rijen.length}` },
          };
        }
        return { data: (rijen[0] ?? null) as T, error: null };
      }
      return { data: rijen as T, error: null, count: this.laatsteTelling };
    } catch (err) {
      // Een databasefout is voor de aanroeper een `error`-veld, niet een
      // exception: precies zoals de echte client zich gedraagt. Anders zou een
      // botsing op een unieke index de test laten klappen in plaats van de
      // code die hem netjes opvangt (zie runBriefing) te laten werken.
      const code = (err as { code?: string })?.code;
      return {
        data: null as T,
        error: { message: err instanceof Error ? err.message : String(err), code },
      };
    }
  }

  private laatsteTelling: number | null = null;

  private async execute(): Promise<Rij[]> {
    const tabel = kolom(this.tabel);

    if (this.soort === "select") {
      if (this.telling === "exact") {
        const { sql, params } = this.whereClause(1);
        const res = await this.client.query(`select count(*)::int as n from ${tabel}${sql}`, params);
        this.laatsteTelling = res.rows[0]?.n ?? 0;
        if (this.headOnly) return [];
      }
      const { sql, params } = this.whereClause(1);
      const orde = this.orderBy.length
        ? ` order by ${this.orderBy.map((o) => `${kolom(o.kolom)} ${o.oplopend ? "asc" : "desc"}`).join(", ")}`
        : "";
      const lim = this.limiet != null ? ` limit ${Number(this.limiet)}` : "";
      const res = await this.client.query(
        `select ${this.kolommen} from ${tabel}${sql}${orde}${lim}`,
        params,
      );
      return res.rows as Rij[];
    }

    if (this.soort === "insert" || this.soort === "upsert") {
      const rijen = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      if (rijen.length === 0) return [];
      const kolommen = Array.from(new Set(rijen.flatMap((r) => Object.keys(r))));
      const params: unknown[] = [];
      const waardeRijen = rijen.map((r) => {
        const stukken = kolommen.map((k) => {
          params.push(serialiseer(r[k]));
          return `$${params.length}`;
        });
        return `(${stukken.join(", ")})`;
      });

      const conflict = this.conflictKolom
        ? ` on conflict (${this.conflictKolom.split(",").map((c) => kolom(c.trim())).join(", ")}) do update set ` +
          kolommen
            .filter((k) => !this.conflictKolom!.split(",").map((c) => c.trim()).includes(k))
            .map((k) => `${kolom(k)} = excluded.${kolom(k)}`)
            .join(", ")
        : "";

      const res = await this.client.query(
        `insert into ${tabel} (${kolommen.map(kolom).join(", ")}) values ${waardeRijen.join(", ")}` +
          `${conflict} returning *`,
        params,
      );
      return res.rows as Rij[];
    }

    if (this.soort === "update") {
      const patch = (this.payload ?? {}) as Rij;
      const kolommen = Object.keys(patch);
      if (kolommen.length === 0) return [];
      const params: unknown[] = [];
      const sets = kolommen.map((k) => {
        params.push(serialiseer(patch[k]));
        return `${kolom(k)} = $${params.length}`;
      });
      const { sql, params: whereParams } = this.whereClause(params.length + 1);
      const res = await this.client.query(
        `update ${tabel} set ${sets.join(", ")}${sql} returning *`,
        [...params, ...whereParams],
      );
      return res.rows as Rij[];
    }

    if (this.soort === "delete") {
      const { sql, params } = this.whereClause(1);
      const res = await this.client.query(`delete from ${tabel}${sql} returning *`, params);
      return res.rows as Rij[];
    }

    fout(`onbekende bewerking "${this.soort}"`);
  }
}

/**
 * Objecten en arrays gaan als JSON naar Postgres.
 *
 * `pg` maakt van een JS-array een Postgres-array, en dat is voor een `jsonb`- of
 * `text[]`-kolom niet hetzelfde. Voor `text[]` klopt het wél, dus alleen
 * objecten en arrays-van-objecten worden geserialiseerd. Precies de vorm die de
 * `*_json`-kolommen krijgen.
 */
function serialiseer(waarde: unknown): unknown {
  if (waarde === null || waarde === undefined) return null;
  if (Array.isArray(waarde)) {
    return waarde.some((v) => typeof v === "object" && v !== null) ? JSON.stringify(waarde) : waarde;
  }
  if (typeof waarde === "object" && !(waarde instanceof Date)) return JSON.stringify(waarde);
  return waarde;
}

/**
 * Een object dat zich naar buiten gedraagt als de Supabase-client die de
 * pijplijn verwacht.
 *
 * Het `as never` is bewust: de echte `SupabaseClient` heeft een enorm
 * gegenereerd type dat we hier niet namaken. De vertaling wordt niet door de
 * typechecker bewaakt maar door de test zelf, en door het feit dat elke
 * onbekende aanroep gooit.
 */
/** Eén geneste tabel uit een select, bv. `accounts(name)`. */
interface Embed {
  tabel: string;
  /** De naam waaronder hij in het antwoord komt te staan. */
  alias: string;
}

/**
 * Haalt de geneste tabellen uit een selectstring.
 *
 * Gooit bij alles wat deze shim niet kan: `!inner`, `!left` en geneste filters
 * veranderen de RIJEN van de hoofdquery, en dat stil negeren zou een test laten
 * slagen op data die productie nooit zou teruggeven.
 */
function parseEmbeds(kolommen: string): Embed[] {
  if (!kolommen.includes("(")) return [];

  const embeds: Embed[] = [];
  let diepte = 0;
  let huidig = "";
  const delen: string[] = [];
  for (const teken of kolommen) {
    if (teken === "(") diepte++;
    if (teken === ")") diepte--;
    if (teken === "," && diepte === 0) {
      delen.push(huidig);
      huidig = "";
      continue;
    }
    huidig += teken;
  }
  if (huidig.trim()) delen.push(huidig);

  for (const deel of delen) {
    const schoon = deel.trim();
    const haakje = schoon.indexOf("(");
    if (haakje === -1) continue; // gewone kolom

    const naam = schoon.slice(0, haakje).trim();
    if (naam.includes("!")) {
      fout(
        `geneste select met "${naam}" wordt niet ondersteund: !inner en !left bepalen ` +
          `welke rijen de hoofdquery teruggeeft, en dat kan deze shim niet nabootsen`,
      );
    }
    if (schoon.slice(haakje + 1, schoon.length - 1).includes("(")) {
      fout(`dubbel geneste select ("${naam}") wordt niet ondersteund`);
    }
    embeds.push({ tabel: naam, alias: naam });
  }
  return embeds;
}

/** Gevonden foreign keys, per (ouder → kind). Eén keer opzoeken is genoeg. */
const fkCache = new Map<string, string>();

/**
 * Vult de geneste tabellen aan op de opgehaalde rijen.
 *
 * De koppeling komt uit de ECHTE foreign keys van de testdatabase en niet uit
 * een naamconventie: `profile_topics` hangt aan `analyses` via `analysis_id`,
 * maar `planned_pages` hangt aan `profile_topics` via `topic_id`. Een conventie
 * zou daar omvallen; de catalogus weet het gewoon.
 */
async function voegGenesteToe(
  client: Client,
  ouder: string,
  rijen: Rij[],
  embeds: Embed[],
): Promise<void> {
  for (const embed of embeds) {
    const sleutel = `${ouder}→${embed.tabel}`;
    let fkKolom = fkCache.get(sleutel);

    if (!fkKolom) {
      const { rows } = await client.query(
        `select kcu.column_name
           from information_schema.table_constraints tc
           join information_schema.key_column_usage kcu
             on kcu.constraint_name = tc.constraint_name
           join information_schema.constraint_column_usage ccu
             on ccu.constraint_name = tc.constraint_name
          where tc.constraint_type = 'FOREIGN KEY'
            and tc.table_name = $1
            and ccu.table_name = $2
          limit 1`,
        [ouder, embed.tabel],
      );
      if (rows.length === 0) {
        fout(
          `geen foreign key gevonden van "${ouder}" naar "${embed.tabel}", ` +
            `dus deze geneste select is niet na te bootsen`,
        );
      }
      fkKolom = rows[0].column_name as string;
      fkCache.set(sleutel, fkKolom);
    }

    const ids = [...new Set(rijen.map((r) => r[fkKolom]).filter((v) => v !== null && v !== undefined))];
    if (ids.length === 0) {
      for (const r of rijen) r[embed.alias] = null;
      continue;
    }

    const { rows: kinderen } = await client.query(
      `select * from public.${embed.tabel} where id = any($1::uuid[])`,
      [ids],
    );
    const opId = new Map(kinderen.map((k) => [k.id, k]));
    for (const r of rijen) {
      const id = r[fkKolom];
      r[embed.alias] = id ? (opId.get(id) ?? null) : null;
    }
  }
}

export function createShimClient(client: Client) {
  return {
    from(tabel: string) {
      return {
        select: (kolommen?: string, opties?: { count?: "exact"; head?: boolean }) =>
          new QueryBuilder(client, tabel, "select").select(kolommen, opties),
        insert: (payload: Rij | Rij[]) => new QueryBuilder(client, tabel, "insert", payload),
        upsert: (payload: Rij | Rij[], opties?: { onConflict?: string }) =>
          new QueryBuilder(client, tabel, "upsert", payload, opties?.onConflict ?? null),
        update: (payload: Rij) => new QueryBuilder(client, tabel, "update", payload),
        delete: () => new QueryBuilder(client, tabel, "delete"),
      };
    },
    rpc() {
      fout("rpc() wordt niet ondersteund");
    },

    /**
     * De auth-beheerkant, net genoeg om het uitnodigingspad te kunnen testen.
     *
     * ── WAAROM DIT ERBIJ MOEST ──────────────────────────────────────────────
     *
     * `acceptInvite()` maakt de gebruiker aan met `admin.auth.admin.createUser`,
     * en dat is precies de stap waar het misgaat als hij misgaat: de link is dan
     * verbruikt en de klant staat buiten. Zonder deze drie functies was dat pad
     * alleen met de hand te testen, en het is het eerste dat een échte klant
     * doet.
     *
     * `auth.users` bestaat gewoon in de testdatabase (de migraties maken hem
     * aan), dus dit schrijft naar de echte tabel en niet naar een lijstje in
     * geheugen. Daardoor gelden de foreign keys en de unieke index op het adres
     * ook echt: een tweede uitnodiging voor hetzelfde adres botst hier net zo
     * hard als op productie.
     */
    auth: {
      admin: {
        async createUser(input: { email: string; password?: string; email_confirm?: boolean }) {
          try {
            const { rows } = await client.query(
              `insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id, email`,
              [input.email],
            );
            return { data: { user: { id: rows[0].id, email: rows[0].email } }, error: null };
          } catch (err) {
            return {
              data: { user: null },
              error: { message: err instanceof Error ? err.message : String(err) },
            };
          }
        },
        async listUsers(_opties?: { page?: number; perPage?: number }) {
          const { rows } = await client.query(`select id, email from auth.users order by email`);
          return { data: { users: rows }, error: null };
        },
        async getUserById(id: string) {
          const { rows } = await client.query(
            `select id, email from auth.users where id = $1`,
            [id],
          );
          return { data: { user: rows[0] ?? null }, error: null };
        },
        async deleteUser(id: string) {
          await client.query(`delete from auth.users where id = $1`, [id]);
          return { data: null, error: null };
        },
      },
    },
  } as never;
}
