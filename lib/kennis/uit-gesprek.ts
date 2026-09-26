import "server-only";

/**
 * WAT DE KLANT VERTELT, IN DE KENNISLAAG (K5 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * De items komen uit `gesprek.ts` en gaan door de schrijfingang: `legVast()`
 * voor wat nieuw gezegd is, `vervang()` voor een nieuwere versie van een
 * antwoord of veld, `wijsAf()` voor wat een mens weghaalde, en `bevestig()` voor
 * de keuze van de consultant bij een tegenstrijdigheid. Alles met een mens als
 * actor: dit is de enige plek buiten het terugvullen waar verklaard en
 * bevestigd vandaan komen (§4 regel 2), en een test in `scripts/test-unit.ts`
 * bewaakt wie deze module mag aanroepen.
 *
 * ── WAAROM DIT NOOIT EEN FOUT GOOIT ─────────────────────────────────────────
 *
 * Tot K8 is de oude tabel nog de bron die de rest van de app leest, en het
 * antwoord van de klant staat daar al als deze module draait. Zou een mislukte
 * schrijfactie hier het opslaan laten mislukken, dan ziet de klant "opslaan
 * mislukt" bij een antwoord dat er wel staat, en typt hij het opnieuw. Dus:
 * tellen, loggen, doorgaan, zoals `uit-onderzoek.ts` (K4).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Klantkennis } from "@/lib/types/database";
import { bevestig, legVast, metSleutel, vervang, wijsAf, type Door, type NieuwKennisItem } from "@/lib/kennis/vastleggen";
import { isAfgewezen } from "@/lib/kennis/regels";
import { domeinVanFeit, type BronAanbod, type BronProfiel, type BronStrategie, type BronVraag, type PlanItem } from "@/lib/kennis/terugvullen";
import {
  GESPREKSVELDEN,
  kennisUitAntwoord,
  kennisUitGesprek,
  kennisUitProfielveld,
  sleutelVan,
  wijzigingen,
  type VeldBron,
  type Wijzigingen,
} from "@/lib/kennis/gesprek";

type Mens = Extract<Door, { actor: "mens" }>;

export interface GesprekTelling {
  vastgelegd: number;
  vervangen: number;
  afgewezen: number;
  bevestigd: number;
  ongewijzigd: number;
  geweigerd: number;
}

function nieuweTelling(): GesprekTelling {
  return { vastgelegd: 0, vervangen: 0, afgewezen: 0, bevestigd: 0, ongewijzigd: 0, geweigerd: 0 };
}

function alsNieuw(profileId: string, item: PlanItem): NieuwKennisItem {
  return {
    profileId,
    domein: item.domein,
    soort: item.soort,
    bewering: item.bewering,
    waarde: item.waarde,
    status: item.status,
    bewijskracht: item.bewijskracht,
    bron: item.bron,
    bronUrl: item.bronUrl,
    citaat: item.citaat,
    gebruik: item.gebruik,
    // Een antwoord of veld van een mens verwijst nooit naar andere items: de
    // reikwijdte zit in `analysis_id` en `content_piece_id` (besluit V13).
    geldtVoor: [],
    analysisId: item.analysisId,
    contentPieceId: item.contentPieceId,
    herkomst: item.herkomst,
    ruw: item.ruw,
  };
}

/** Het item dat bij dit plan-item hoort, of null. */
async function bestaand(admin: SupabaseClient, profileId: string, item: PlanItem): Promise<Klantkennis | null> {
  const sleutel = sleutelVan(item);
  return sleutel ? metSleutel(admin, profileId, sleutel) : null;
}

/**
 * Iets wat een mens nu zegt. Stond het er al als vermoeden van het model, of had
 * een mens het eerder afgewezen, dan is wat de mens nu zegt de nieuwe versie:
 * `legVast()` zou het bestaande item teruggeven en de uitspraak verdwijnen.
 */
async function zeg(admin: SupabaseClient, profileId: string, item: PlanItem, door: Mens, telling: GesprekTelling, redenen: string[]): Promise<void> {
  const uitkomst = await legVast(admin, alsNieuw(profileId, item), door);
  switch (uitkomst.soort) {
    case "vastgelegd":
      telling.vastgelegd++;
      return;
    case "geweigerd":
      telling.geweigerd++;
      redenen.push(`${item.ref}: ${uitkomst.fouten.join(" ")}`);
      return;
    case "bestond":
      if (uitkomst.item.status !== "afgeleid") {
        telling.ongewijzigd++;
        return;
      }
      break;
    case "eerder_afgewezen":
      break;
  }
  const nieuw = await vervang(admin, { profileId, oudId: uitkomst.item.id, nieuw: alsNieuw(profileId, item) }, door);
  if (nieuw.ok) telling.vervangen++;
  else {
    telling.geweigerd++;
    redenen.push(`${item.ref}: ${nieuw.fout}`);
  }
}

async function verwerk(admin: SupabaseClient, profileId: string, w: Wijzigingen, door: Mens, wat: string): Promise<GesprekTelling> {
  const telling = nieuweTelling();
  const redenen: string[] = [];
  try {
    for (const { oud, nieuw } of w.vervangen) {
      const vorige = await bestaand(admin, profileId, oud);
      // De vorige versie staat niet (meer) in de kennislaag, of een mens wees
      // hem al af: dan is dit gewoon iets nieuws.
      if (!vorige || isAfgewezen(vorige)) {
        await zeg(admin, profileId, nieuw, door, telling, redenen);
        continue;
      }
      const uitkomst = await vervang(admin, { profileId, oudId: vorige.id, nieuw: alsNieuw(profileId, nieuw) }, door);
      if (uitkomst.ok) telling.vervangen++;
      else {
        telling.geweigerd++;
        redenen.push(`${nieuw.ref}: ${uitkomst.fout}`);
      }
    }
    for (const item of w.erbij) await zeg(admin, profileId, item, door, telling, redenen);
    for (const item of w.weg) {
      const vorige = await bestaand(admin, profileId, item);
      if (!vorige || isAfgewezen(vorige)) continue;
      const uitkomst = await wijsAf(admin, { profileId, itemId: vorige.id }, door);
      if (uitkomst.ok) telling.afgewezen++;
      else {
        telling.geweigerd++;
        redenen.push(`${item.ref}: ${uitkomst.fout}`);
      }
    }
  } catch (err) {
    telling.geweigerd++;
    redenen.push(err instanceof Error ? err.message : String(err));
  }
  log(profileId, wat, telling, redenen);
  return telling;
}

function log(profileId: string, wat: string, t: GesprekTelling, redenen: string[]): void {
  if (t.vastgelegd + t.vervangen + t.afgewezen + t.bevestigd + t.geweigerd === 0) return;
  console.info(
    `Kennislaag ${wat} voor merk ${profileId}: ${t.vastgelegd} nieuw, ${t.vervangen} vervangen, ${t.afgewezen} afgewezen, ` +
      `${t.bevestigd} bevestigd, ${t.geweigerd} geweigerd.`,
  );
  if (redenen.length > 0) console.warn(`Kennislaag ${wat} voor merk ${profileId}, geweigerd: ${redenen.slice(0, 10).join("; ")}`);
}

// ── 1. Een antwoord op een vraag ─────────────────────────────────────────────

/**
 * Het antwoord van de ondernemer, verklaard, met de reikwijdte van de vraag:
 * een pagina (`content_piece_id`), een cluster (`analysis_id`) of het hele merk.
 * De open vraag van een pagina wordt letterlijk een item in het domein verhaal,
 * alleen voor die pagina (besluit B3), tenzij de vraag voor het merk gold.
 *
 * `vorige` is de vraag zoals hij vóór dit antwoord in de tabel stond: een
 * gewijzigd antwoord wordt een nieuwe versie van het oude item.
 */
export async function legAntwoordVast(
  admin: SupabaseClient,
  args: { profileId: string; vorige: BronVraag | null; nu: BronVraag },
  door: Mens,
): Promise<GesprekTelling> {
  const oud = args.vorige ? kennisUitAntwoord(args.vorige) : [];
  return verwerk(admin, args.profileId, wijzigingen(oud, kennisUitAntwoord(args.nu)), door, "antwoord");
}

// ── 2. Een veld op het gespreksscherm of in de wizard ────────────────────────

/**
 * De velden die een mens net opsloeg. `oud` is het profiel van vóór het
 * opslaan, `nieuw` wat er nu in staat. Alleen de velden in `velden` tellen.
 */
export async function legProfielVast(
  admin: SupabaseClient,
  args: {
    profileId: string;
    url: string;
    velden: readonly string[];
    oud: Partial<BronProfiel>;
    nieuw: Partial<BronProfiel>;
    bron: VeldBron;
    aanbod?: readonly Pick<BronAanbod, "name" | "removed_at">[];
    vragen?: readonly Pick<BronVraag, "question">[];
  },
  door: Mens,
): Promise<GesprekTelling> {
  const alle: Wijzigingen = { erbij: [], vervangen: [], weg: [] };
  for (const veld of GESPREKSVELDEN.filter((v) => args.velden.includes(String(v)))) {
    const zo = (p: Partial<BronProfiel>) =>
      kennisUitProfielveld({ profiel: { ...p, id: args.profileId, url: args.url }, veld, bron: args.bron, aanbod: args.aanbod, vragen: args.vragen });
    const w = wijzigingen(zo(args.oud), zo(args.nieuw));
    alle.erbij.push(...w.erbij);
    alle.vervangen.push(...w.vervangen);
    alle.weg.push(...w.weg);
  }
  return verwerk(admin, args.profileId, alle, door, "gesprek (profiel)");
}

// ── 3. De aantekeningen en veranderingen van het gesprek ─────────────────────

export async function legGesprekVast(
  admin: SupabaseClient,
  args: { profileId: string; vorige: BronStrategie | null; nu: BronStrategie },
  door: Mens,
): Promise<GesprekTelling> {
  return verwerk(admin, args.profileId, wijzigingen(kennisUitGesprek(args.vorige), kennisUitGesprek(args.nu)), door, "gesprek (strategie)");
}

// ── 4. De keuze bij een tegenstrijdigheid ────────────────────────────────────

/**
 * De consultant koos op de conflictlijst welk van twee feiten klopt. Het item
 * van de winnaar wordt bevestigd, met de consultant als wie; de items van de
 * andere feiten worden afgewezen. Heeft de winnaar nog geen item (een feit dat
 * na het terugvullen ontstond), dan legt de consultant het hier vast.
 *
 * Wat de ondernemer zelf kiest als de consultant het hem laat vragen, is een
 * antwoord als elk ander (`legAntwoordVast()`): verklaard, niet bevestigd.
 * Bevestigen doet alleen de consultant (besluit V6).
 */
export async function legConflictkeuzeVast(
  admin: SupabaseClient,
  args: { profileId: string; winnaarFeitId: string; feitIds: readonly string[] },
  door: Mens,
): Promise<GesprekTelling> {
  const telling = nieuweTelling();
  const redenen: string[] = [];
  try {
    const { data } = await admin
      .from("klantkennis")
      .select("*")
      .eq("profile_id", args.profileId)
      .eq("herkomst_tabel", "brand_facts")
      .in("herkomst_id", [...new Set([args.winnaarFeitId, ...args.feitIds])])
      .is("vervangen_door", null);
    const items = (data ?? []) as Klantkennis[];

    let winnaar = items.find((i) => i.herkomst_id === args.winnaarFeitId && !isAfgewezen(i)) ?? null;
    if (!winnaar) {
      const { data: feit } = await admin
        .from("brand_facts")
        .select("id, text, soort, waarde")
        .eq("id", args.winnaarFeitId)
        .eq("profile_id", args.profileId)
        .maybeSingle();
      const f = feit as { id: string; text: string; soort: string | null; waarde: unknown } | null;
      if (f?.text?.trim()) {
        const nieuw: NieuwKennisItem = {
          profileId: args.profileId, domein: domeinVanFeit(f.soort), soort: f.soort, bewering: f.text.trim(), waarde: f.waarde ?? null,
          status: "verklaard", bron: "gesprek", gebruik: "content", herkomst: { tabel: "brand_facts", id: f.id },
        };
        const uitkomst = await legVast(admin, nieuw, door);
        if (uitkomst.soort === "vastgelegd" || uitkomst.soort === "bestond") {
          winnaar = uitkomst.item;
          if (uitkomst.soort === "vastgelegd") telling.vastgelegd++;
        } else if (uitkomst.soort === "eerder_afgewezen") {
          const terug = await vervang(admin, { profileId: args.profileId, oudId: uitkomst.item.id, nieuw }, door);
          if (terug.ok) {
            winnaar = terug.item;
            telling.vervangen++;
          } else redenen.push(terug.fout);
        } else redenen.push(uitkomst.fouten.join(" "));
      }
    }

    if (winnaar && winnaar.status !== "bevestigd") {
      const b = await bevestig(admin, { profileId: args.profileId, itemId: winnaar.id }, door);
      if (b.ok) telling.bevestigd++;
      else redenen.push(b.fout);
    } else if (!winnaar) {
      redenen.push(`Het gekozen feit ${args.winnaarFeitId} is niet terug te vinden.`);
    }

    for (const ander of items.filter((i) => i.herkomst_id !== args.winnaarFeitId && !isAfgewezen(i))) {
      const a = await wijsAf(admin, { profileId: args.profileId, itemId: ander.id }, door);
      if (a.ok) telling.afgewezen++;
      else redenen.push(a.fout);
    }
  } catch (err) {
    redenen.push(err instanceof Error ? err.message : String(err));
  }
  telling.geweigerd += redenen.length;
  log(args.profileId, "keuze bij een tegenstrijdigheid", telling, redenen);
  return telling;
}
