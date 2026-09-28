import { NextResponse, after } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { MAX_PAGES_HARD_CAP } from "@/lib/crawler";
import { EDITABLE_PROFILE_FIELDS } from "@/lib/profile-editable";
import { resolveWriteSource } from "@/lib/profile-source";
import { isStaff } from "@/lib/staff";
import { normalizeUrl, checkUrlFormat } from "@/lib/url";
import { schoneAdressen } from "@/lib/pagina/stemvoorbeelden-regels";
import { haalStemvoorbeeldenOp } from "@/lib/pagina/stemvoorbeelden";
import { sluitVragenUitGesprek } from "@/lib/vraag-sluiten";
import { slaProfielOp } from "@/lib/kennis/uit-gesprek";
import { legStemVast } from "@/lib/kennis/uit-stem";
import { GESPREKSVELDEN, nietVanToepassingVelden } from "@/lib/kennis/gesprek";
import type { BronProfiel } from "@/lib/kennis/terugvullen";

/**
 * PATCH /api/profiles/[id], klantprofiel bewerken. Geen AI-call: pure CRUD op
 * al bestaande data. Zet edited_by_user = true. Zelfde patroon als de vroegere
 * brand-dna-route. `sitemap_url` en `max_inventory_pages` zijn de crawl-
 * instellingen voor de content-inventaris (§12.23).
 */
const EDITABLE_FIELDS = EDITABLE_PROFILE_FIELDS;

/** Ruimte voor het ophalen van hooguit drie stemvoorbeelden na het antwoord (§6.10). */
export const maxDuration = 60;

/** Lijstvelden: lege en niet-tekstuele items eruit, de rest getrimd. */
const LIST_FIELDS = [
  "taboo_phrases",
  // De commerciële laag (migratie 0060).
  "priority_offerings",
  "deprioritised_offerings",
  "growth_regions",
  "target_segments",
  "sales_objections",
  "forbidden_topics",
  "offline_proof",
  "name_exclusions",
  // A3: deze (toen zes, sinds K8 zonder `proof_points`) werden vóór 31 augustus 2026 alleen door de invoercomponent
  // getrimd, nooit door de route zelf. Conventie 1 wil de garantie hier, niet
  // alleen in de client: een ander scherm of een aanroep buiten de app om kon
  // een lege string in `aliases` zetten, waar de meting op vergelijkt.
  "products",
  "value_props",
  "competitors",
  "aliases",
  "service_regions",
] as const;

/** Vrije tekst: een leeg veld wordt `null`, nooit een lege string. */
const NULLABLE_TEXT_FIELDS = [
  "differentiator",
  // Migratie 0060.
  "seasonality",
  "goal_12m",
  "contact_name",
  "contact_email",
  "contact_phone",
  // Migratie 0115 (contentketen-opnieuw.md §6.3).
  "verhalen",
] as const;

/** De aanspreekvorm van de CONTENT, niet van ORBIT ENGINE's eigen interface. */
const PRONOUNS = ["je", "u", "wij"] as const;

/**
 * Wat een klant ongeveer waard is (migratie 0060). Vier woorden die in een
 * database-constraint staan, dus dezelfde behandeling als `pronoun_preference`:
 * nooit een client-string rechtstreeks doorlaten.
 */
const DEAL_VALUE_BANDS = ["onbekend", "klein", "midden", "groot"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  // ── Wie mag welke herkomst wegschrijven? ─────────────────────────────────
  //
  // Vóór het opslaan, niet erna: een verboden herkomst mag de waarde helemaal
  // niet in de database krijgen, ook niet met een verkeerd label erbij.
  const staf = await isStaff(user.id);
  const bron = resolveWriteSource({
    requested: body.bron,
    isStaff: staf,
    isOwner: profile.user_id === user.id,
  });
  if (!bron.ok) {
    return NextResponse.json({ error: bron.error }, { status: bron.status });
  }

  const update: Record<string, unknown> = { edited_by_user: true };
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }
  // ── Website wijzigen (onboarding ronde B, stap B8) ───────────────────────
  //
  // ⚠️ Bewust GEEN catalogusveld en niet in `EDITABLE_PROFILE_FIELDS`: `url`
  // heeft geen herkomstchip, dat zou suggereren dat een volgende
  // onderzoeksronde hem met rust laat, terwijl elke wijziging hier juist een
  // nieuwe crawl vereist. Dezelfde validatie als bij het aanmaken van een merk
  // (`app/api/profiles/route.ts`), zodat een halve of ongeldige URL nooit
  // opgeslagen wordt.
  if (typeof body.url === "string") {
    const format = checkUrlFormat(body.url);
    if (!format.ok) {
      return NextResponse.json({ error: format.message, field: "url" }, { status: 400 });
    }
    update.url = normalizeUrl(body.url)!;
  }
  // sitemap_url: lege string → null (dan valt de crawler terug op auto-detectie).
  if ("sitemap_url" in update) {
    const raw = typeof update.sitemap_url === "string" ? update.sitemap_url.trim() : "";
    update.sitemap_url = raw || null;
  }
  // max_inventory_pages: geheel getal, geklemd binnen [5, harde bovengrens].
  if ("max_inventory_pages" in body) {
    const n = Math.round(Number(body.max_inventory_pages));
    if (Number.isFinite(n)) {
      update.max_inventory_pages = Math.min(Math.max(n, 5), MAX_PAGES_HARD_CAP);
    }
  }
  // crawl_priority_paths: sitesecties die voorrang krijgen (migratie 0061).
  // Genormaliseerd naar "/segment", want dat is de vorm die `sectionOf()`
  // oplevert en waarmee `url-priority.ts` vergelijkt. Een consultant die
  // "diensten" of "/diensten/" typt bedoelt hetzelfde, en een lijst die stil
  // nergens op matcht is erger dan geen lijst.
  if ("crawl_priority_paths" in body) {
    const raw = body.crawl_priority_paths;
    const lijst = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? raw.split(/[\s,;]+/)
        : [];
    update.crawl_priority_paths = [
      ...new Set(
        lijst
          .map((v) => String(v).trim().toLowerCase().replace(/\/+$/, ""))
          .filter(Boolean)
          .map((v) => (v.startsWith("/") ? v : `/${v}`))
          // Alleen het eerste segment: dieper dan dat is geen sectie meer, en
          // `sectionOf()` zou er nooit op uitkomen.
          .map((v) => `/${v.split("/").filter(Boolean)[0] ?? ""}`)
          .filter((v) => v !== "/"),
      ),
    ].slice(0, 10);
  }
  // Stemvoorbeelden (besluit B14): alleen de adressen komen van de client. De
  // tekst haalt de server zelf op, na het antwoord (`after()`), zodat een
  // trage site het opslaan niet ophoudt. Tot dan staat er geen tekst.
  let stemAdressen: string[] | null = null;
  if ("stem_voorbeelden" in body) {
    stemAdressen = schoneAdressen(body.stem_voorbeelden);
    update.stem_voorbeelden = stemAdressen.map((url) => ({ url, tekst: null, opgehaald_op: null, fout: null }));
  }
  // Aanspreekvorm: alleen de drie bekende waarden, anders null. Nooit een
  // client-string rechtstreeks naar de databaseconstraint.
  if ("pronoun_preference" in update) {
    const raw = String(update.pronoun_preference ?? "");
    update.pronoun_preference = (PRONOUNS as readonly string[]).includes(raw) ? raw : null;
  }
  // Zelfde behandeling voor de waardeklasse van een klant (migratie 0060).
  if ("deal_value_band" in update) {
    const raw = String(update.deal_value_band ?? "");
    update.deal_value_band = (DEAL_VALUE_BANDS as readonly string[]).includes(raw)
      ? raw
      : null;
  }
  // Ja of nee, met "niet vastgesteld" als derde uitkomst (conventie 3). Alleen
  // een echte boolean telt: "false" als tekst is geen antwoord maar een fout.
  if ("respect_site_structure" in update) {
    const raw = update.respect_site_structure;
    update.respect_site_structure = typeof raw === "boolean" ? raw : null;
  }
  // Lijstvelden: lege of niet-tekstuele items eruit, net als TagListEditor
  // dat elders al doet voor products/value_props/competitors.
  for (const field of LIST_FIELDS) {
    if (field in update) {
      const raw = update[field];
      update[field] = Array.isArray(raw)
        ? raw
            .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
            .map((v) => v.trim())
        : [];
    }
  }
  // Vrije tekst: leeg wordt null. Conventie 3, en het scheelt overal een
  // controle op twee soorten leegte.
  for (const field of NULLABLE_TEXT_FIELDS) {
    if (field in update) {
      const raw = update[field];
      update[field] = typeof raw === "string" && raw.trim() ? raw.trim() : null;
    }
  }

  // ── Opslaan, en de kennislaag (K5, sinds K8 deel 3 in één handeling) ─────
  //
  // Wat een mens hier aan een veld veranderde, wordt verklaarde klantkennis:
  // nieuw gezegd, een nieuwere versie, of weggehaald. Een veld dat hetzelfde
  // bleef, verandert niet van status: laten staan is geen uitspraak
  // (`lib/kennis/gesprek.ts`). De kolommen op `profiles` zijn de kopie die de
  // meting leest; alleen `lib/kennis/` schrijft ze (besluit V22).
  //
  // "Niet van toepassing" (K7, gevonden in K5) zegt dat het veld voor dit merk
  // niet bestaat: voor de kennislaag is het veld dan leeg, en wat er stond wordt
  // afgewezen door wie het aanvinkte. Terugzetten doet niets: pas een nieuwe
  // waarde is weer een uitspraak.
  const nvt = body.nvt;
  const bewerkteVelden = EDITABLE_FIELDS.filter((f) => f in body);
  const nvtVelden = nietVanToepassingVelden(nvt);
  const kennisVelden = [...new Set([...bewerkteVelden.filter((f) => (GESPREKSVELDEN as readonly string[]).includes(f)), ...nvtVelden])];
  const { data: aanbod } = kennisVelden.includes("products")
    ? await admin.from("profile_offerings").select("name, removed_at").eq("profile_id", id)
    : { data: [] };
  const { error } = await slaProfielOp(
    admin,
    {
      profileId: id,
      url: profile.url,
      kolommen: update,
      oud: profile as unknown as Partial<BronProfiel>,
      velden: kennisVelden,
      nietVanToepassing: nvtVelden,
      bron: bron.source,
      aanbod: (aanbod ?? []) as { name: string; removed_at: string | null }[],
    },
    { actor: "mens", gebruikerId: user.id },
  );
  if (error) {
    return NextResponse.json({ error: "Opslaan is niet gelukt." }, { status: 500 });
  }

  // ── Herkomst vastleggen (3 aug 2026) ──────────────────────────────────────
  //
  // `edited_by_user = true` zegt dát er iets met de hand is aangepast, niet WÁT.
  // `filterProtectedFields()` in prepare-profile.ts beslist per veld, en leest
  // daarvoor `profile_field_sources`. Die tabel werd tot nu alleen gevuld door
  // de strategieroute, en dan nog uitsluitend voor aliassen en werkgebied uit de
  // contextfactoren.
  //
  // Gevolg: dit, de gewone manier waarop iemand een profiel corrigeert, liet
  // geen spoor achter, en de knop "onderzoek opnieuw" zou elke correctie zonder
  // waarschuwing overschrijven. Precies het scenario waar migratie 0039 voor
  // gemaakt is, en precies het scenario dat hij niet dekte.
  //
  // 'klant' als de eigenaar zelf bewerkt, 'gesprek' als de consultant het voor
  // hem doet, 'consultant' als er nog geen klant aan tafel zat. Alle drie
  // menselijk (`isHumanSet`), dus voor de bescherming maakt het niet uit, voor
  // de vraag "wie zei dit?" een halfjaar later wel. Welke van de drie het mag
  // zijn, is hierboven al beslist door `resolveWriteSource()`.
  // ── Niet van toepassing, per veld (migratie 0060) ────────────────────────
  //
  // ⚠️ Geen eigen route. Dit is per-veld-metadata op dezelfde tabel als de
  // herkomst, gezet vanaf hetzelfde scherm, in dezelfde handeling. Een tweede
  // opslagroute ernaast is precies wat dit plan niet doet.
  //
  // Een leeg veld is zonder dit dubbelzinnig: het kan "weten we nog niet"
  // betekenen of "niet van toepassing". Een merk zonder auteur heeft geen
  // auteursbio, en dat is geen gat.
  if (nvt && typeof nvt === "object" && !Array.isArray(nvt)) {
    const rijen = Object.entries(nvt as Record<string, unknown>)
      .filter(([field]) => (EDITABLE_FIELDS as readonly string[]).includes(field))
      .map(([field, waarde]) => ({
        profile_id: id,
        field,
        source: bron.source,
        confidence: 1,
        set_by: user.id,
        set_at: new Date().toISOString(),
        not_applicable: waarde === true,
      }));
    if (rijen.length > 0) {
      const { error: nvtError } = await admin
        .from("profile_field_sources")
        .upsert(rijen, { onConflict: "profile_id,field" });
      if (nvtError) {
        return NextResponse.json(
          { error: "Opslaan is niet gelukt." },
          { status: 500 },
        );
      }
    }
  }

  if (bewerkteVelden.length > 0) {
    const nu = new Date().toISOString();
    const { error: bronError } = await admin.from("profile_field_sources").upsert(
      bewerkteVelden.map((field) => ({
        profile_id: id,
        field,
        source: bron.source,
        confidence: 1,
        set_by: user.id,
        set_at: nu,
      })),
      { onConflict: "profile_id,field" },
    );
    // Bewust geen 500: het profiel ís opgeslagen. Een mislukte herkomstregel
    // teruggeven als "opslaan mislukt" zou de klant zijn wijziging laten
    // overtypen terwijl hij er al staat.
    if (bronError) {
      console.error(
        `Herkomst vastleggen mislukt voor profiel ${id} ` +
          `(${bewerkteVelden.length} veld(en) wél opgeslagen): ${bronError.message}`,
      );
    }
  }

  // ── Vragen die het gesprek nu beantwoordt, dicht (punt 35) ──────────────
  // Het merkonderzoek zet zijn vragen klaar vóór het gesprek; bij de
  // installateur 19 minuten ervoor. Zonder deze stap vroeg de app daarna nog
  // steeds hoeveel monteurs er werken, terwijl "Twaalf monteurs in dienst" net
  // was opgeslagen.
  if (bewerkteVelden.some((f) => ["offline_proof", "service_regions", "growth_regions"].includes(f))) {
    const gesloten = await sluitVragenUitGesprek(admin, id);
    if (gesloten > 0) {
      console.log(`Profiel ${id}: ${gesloten} open vraag of vragen gesloten, het gesprek beantwoordt ze.`);
    }
  }

  // De tekst van de stemvoorbeelden gaat na het ophalen ook de kennislaag in
  // (K8): waargenomen, met het adres als bron. Een weggehaald adres wijst de
  // mens af die het weghaalde, ook als er geen adres meer over is.
  if (stemAdressen) {
    const adressen = stemAdressen;
    const door = { actor: "mens" as const, gebruikerId: user.id };
    after(async () => {
      const voorbeelden = adressen.length > 0 ? await haalStemvoorbeeldenOp(adressen) : [];
      // Veranderden de adressen intussen, dan slaat `legStemVast()` niets op:
      // de latere opslag doet dit werk.
      await legStemVast(admin, { profileId: id, url: profile.url, voorbeelden, gekozen: adressen }, door);
    });
  }

  return NextResponse.json({ ok: true });
}
