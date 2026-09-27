/**
 * DE OPEN PUNTEN VAN DE KENNISLAAG AFHANDELEN, ALS SQL (besluit V16, V15).
 *
 * Het terugvullen (K3) zette twintig punten op een lijst voor de consultant
 * (`docs/tasks/kennislaag-open-punten.md`, verwijderd zodra hij leeg was). Hier
 * staan de vier handelingen waarmee zo'n punt wordt afgehandeld, als SQL die via
 * de databaseverbinding van de beheertool naar productie gaat (V15: de
 * werkomgeving heeft de sleutel van de productiedatabase niet). De besluiten
 * zelf staan in `scripts/kennis-open-punten.ts`.
 *
 * Dezelfde regels als de schrijfingang (`lib/kennis/vastleggen.ts`):
 *   - een nieuw item gaat door `controleerItem()` en krijgt zijn sleutel van
 *     `kennisSleutel()`;
 *   - vervangen gaat in drie stappen (nieuwe rij zonder sleutel, oude laat
 *     verwijzen, dan de sleutel), zodat de unieke sleutelindex nooit twee
 *     actuele rijen ziet;
 *   - niets wordt verwijderd: een oud item houdt een verwijzing naar wat het
 *     verving;
 *   - een citaat moet letterlijk op de opgeslagen pagina staan
 *     (`profile_pages.text_excerpt`), anders stopt het hele blok.
 * Alles in één `do`-blok: gaat één stap mis, dan gebeurt er niets. Een tweede
 * run doet niets, want elke stap kijkt eerst of het oude item nog actueel is.
 *
 * Puur, zonder `server-only` (conventie 2).
 */
import { controleerItem } from "@/lib/kennis/regels";
import { kennisSleutel } from "@/lib/kennis/samenvoegen";

/** Wie het vastlegt: de code, op besluit van de eigenaar (geen mens-kolom, want die zou suggereren dat hij elk punt zelf aanklikte). */
export const OPEN_PUNTEN_TAAK = "kennis_open_punten";

export interface NieuwWaargenomen {
  profileId: string;
  domein: string;
  soort: string;
  bewering: string;
  citaat: string;
  bronUrl: string;
  geldtVoor: string[];
  /** De oude rij waar het vandaan kwam. */
  herkomst: { tabel: string; id: string };
}

export type Besluit =
  /** Koppelen aan een dienst: een nieuwe versie met dezelfde inhoud en `geldt_voor`. */
  | { soort: "koppelen"; id: string; geldtVoor: string[]; reden: string }
  /** Merkbreed laten: niets verandert, alleen het besluit komt in `ruw`. */
  | { soort: "merkbreed"; id: string; reden: string }
  /** Vervangen door een nieuw, waargenomen item met een citaat dat op de site staat. */
  | { soort: "vervangen"; id: string; nieuw: NieuwWaargenomen; naam: string; reden: string }
  /** Opgaan in een ander item (bestaand, of een `naam` van een vervanging hierboven). */
  | { soort: "opgaan"; id: string; doel: { id: string } | { naam: string }; reden: string }
  /** Een extra waargenomen item naast een vervanging, uit hetzelfde oude item. */
  | { soort: "erbij"; nieuw: NieuwWaargenomen; reden: string };

function lit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function uuidArray(ids: readonly string[]): string {
  return ids.length === 0 ? "'{}'::uuid[]" : `array[${ids.map((i) => `${lit(i)}::uuid`).join(", ")}]`;
}

function besluitJson(reden: string, datum: string): string {
  return `jsonb_build_object('besluit_open_punt', jsonb_build_object('reden', ${lit(reden)}, 'op', ${lit(datum)}, 'door', 'Claude, op verzoek van de eigenaar'))`;
}

/** De fouten van een nieuw item volgens dezelfde regels als `legVast()`. Leeg is goed. */
export function foutenVan(n: NieuwWaargenomen): string[] {
  return controleerItem({
    domein: n.domein,
    bewering: n.bewering,
    status: "waargenomen",
    bron: "website",
    gebruik: "content",
    bron_url: n.bronUrl,
    citaat: n.citaat,
    vastgelegd_door_taak: OPEN_PUNTEN_TAAK,
  });
}

function sleutelVan(n: NieuwWaargenomen): string | null {
  return kennisSleutel({ domein: n.domein, soort: n.soort, bewering: n.bewering, analysis_id: null, content_piece_id: null });
}

function citaatControle(n: NieuwWaargenomen): string {
  return `  if not exists (select 1 from public.profile_pages where url = ${lit(n.bronUrl)} and position(${lit(n.citaat)} in text_excerpt) > 0) then
    raise exception 'Citaat niet letterlijk op %: %', ${lit(n.bronUrl)}, ${lit(n.citaat)};
  end if;`;
}

function insertNieuw(n: NieuwWaargenomen, reden: string, datum: string, variabele: string): string {
  return `  insert into public.klantkennis (profile_id, domein, soort, bewering, status, bron, bron_url, citaat, gebruik, geldt_voor,
      vastgelegd_door_taak, laatst_gecontroleerd_op, herkomst_tabel, herkomst_id, ruw)
    values (${lit(n.profileId)}::uuid, ${lit(n.domein)}, ${lit(n.soort)}, ${lit(n.bewering)}, 'waargenomen', 'website', ${lit(n.bronUrl)},
      ${lit(n.citaat)}, 'content', ${uuidArray(n.geldtVoor)}, ${lit(OPEN_PUNTEN_TAAK)}, now(), ${lit(n.herkomst.tabel)}, ${lit(n.herkomst.id)}::uuid,
      ${besluitJson(reden, datum)})
    returning id into ${variabele};`;
}

/**
 * Het hele `do`-blok. Gooit (bij het bouwen) als een nieuw item de regels van
 * de schrijfingang niet haalt, zodat er nooit SQL ontstaat die de code zelf
 * zou weigeren.
 */
export function openPuntenSql(besluiten: readonly Besluit[], datum: string): string {
  for (const b of besluiten) {
    if (b.soort === "vervangen" || b.soort === "erbij") {
      const fouten = foutenVan(b.nieuw);
      if (fouten.length > 0) throw new Error(`${b.nieuw.bewering}: ${fouten.join(" ")}`);
    }
  }
  const namen = besluiten.filter((b): b is Extract<Besluit, { soort: "vervangen" }> => b.soort === "vervangen").map((b) => b.naam);
  const regels: string[] = [];
  regels.push("do $$");
  regels.push("declare");
  regels.push("  nieuw_id uuid;");
  for (const n of namen) regels.push(`  ${n} uuid;`);
  regels.push("begin");

  // Eerst alle citaten: klopt er één niet, dan verandert er niets.
  for (const b of besluiten) if (b.soort === "vervangen" || b.soort === "erbij") regels.push(citaatControle(b.nieuw));

  for (const b of besluiten) {
    const actueel = (id: string) => `exists (select 1 from public.klantkennis where id = ${lit(id)}::uuid and vervangen_door is null)`;
    if (b.soort === "merkbreed") {
      regels.push(`  -- merkbreed: ${b.reden}`);
      regels.push(`  update public.klantkennis set ruw = coalesce(ruw, '{}'::jsonb) || ${besluitJson(b.reden, datum)}, updated_at = now()
    where id = ${lit(b.id)}::uuid and vervangen_door is null and not (coalesce(ruw, '{}'::jsonb) ? 'besluit_open_punt');`);
    } else if (b.soort === "koppelen") {
      regels.push(`  -- koppelen: ${b.reden}`);
      regels.push(`  if ${actueel(b.id)} then
    insert into public.klantkennis (profile_id, domein, soort, bewering, waarde, status, bewijskracht, bron, bron_url, citaat,
        vastgelegd_door_taak, laatst_gecontroleerd_op, verloopt_op, gebruik, geldt_voor, analysis_id, content_piece_id,
        herkomst_tabel, herkomst_id, ruw)
      select profile_id, domein, soort, bewering, waarde, status, bewijskracht, bron, bron_url, citaat,
        ${lit(OPEN_PUNTEN_TAAK)}, laatst_gecontroleerd_op, verloopt_op, gebruik, ${uuidArray(b.geldtVoor)}, analysis_id, content_piece_id,
        herkomst_tabel, herkomst_id, coalesce(ruw, '{}'::jsonb) || ${besluitJson(b.reden, datum)}
      from public.klantkennis where id = ${lit(b.id)}::uuid
      returning id into nieuw_id;
    update public.klantkennis set vervangen_door = nieuw_id, updated_at = now() where id = ${lit(b.id)}::uuid;
    update public.klantkennis set sleutel = (select sleutel from public.klantkennis where id = ${lit(b.id)}::uuid), updated_at = now() where id = nieuw_id;
  end if;`);
    } else if (b.soort === "vervangen") {
      regels.push(`  -- vervangen: ${b.reden}`);
      regels.push(`  if ${actueel(b.id)} then
${insertNieuw(b.nieuw, b.reden, datum, b.naam)}
    update public.klantkennis set vervangen_door = ${b.naam}, updated_at = now() where id = ${lit(b.id)}::uuid;
    update public.klantkennis set sleutel = ${sleutelVan(b.nieuw) === null ? "null" : lit(sleutelVan(b.nieuw)!)}, updated_at = now()
      where id = ${b.naam} and not exists (select 1 from public.klantkennis where profile_id = ${lit(b.nieuw.profileId)}::uuid
        and sleutel = ${lit(sleutelVan(b.nieuw) ?? "")} and vervangen_door is null);
  else
    select vervangen_door into ${b.naam} from public.klantkennis where id = ${lit(b.id)}::uuid;
  end if;`);
    } else if (b.soort === "opgaan") {
      const doel = "id" in b.doel ? `${lit(b.doel.id)}::uuid` : b.doel.naam;
      regels.push(`  -- opgaan: ${b.reden}`);
      regels.push(`  if ${actueel(b.id)} then
    update public.klantkennis set vervangen_door = ${doel},
        ruw = coalesce(ruw, '{}'::jsonb) || ${besluitJson(b.reden, datum)}, updated_at = now()
      where id = ${lit(b.id)}::uuid;
  end if;`);
    } else {
      const sleutel = sleutelVan(b.nieuw);
      regels.push(`  -- erbij: ${b.reden}`);
      regels.push(`  if not exists (select 1 from public.klantkennis where profile_id = ${lit(b.nieuw.profileId)}::uuid
      and sleutel = ${lit(sleutel ?? "")} and vervangen_door is null) then
${insertNieuw(b.nieuw, b.reden, datum, "nieuw_id").replace(/^/gm, "  ")}
    update public.klantkennis set sleutel = ${sleutel === null ? "null" : lit(sleutel)} where id = nieuw_id;
  end if;`);
    }
  }
  regels.push("end $$;");
  return regels.join("\n");
}
