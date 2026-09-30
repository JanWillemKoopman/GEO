import "server-only";

/**
 * WAT EEN HANDMATIGE UPLOAD OPLEVERT, IN DE KENNISLAAG (30 september 2026).
 *
 * De items komen uit `haalKennisUitUpload()` en `controleerUpload()` en gaan door
 * de schrijfingang (`legVast()`, `vervang()`), met als bron `upload`: in de tabel
 * staat dat als "Handmatige upload".
 *
 * ── WIE HET VASTLEGT ────────────────────────────────────────────────────────
 *
 * Wat in het materiaal staat (feiten en kennis, status verklaard) legt de mens
 * vast die het materiaal aanleverde, zoals bij het merkdossier (besluit V21):
 * het is wat de klant of de consultant zelf zegt. Een vermoeden is iets wat het
 * model afleidt, dus dat legt het model vast (actor model, taak `upload_kennis`),
 * altijd afgeleid, intern, met het document als herkomst. Een model verklaart
 * nooit iets namens de klant (§4 regel 2).
 *
 * ── WAT NIET OVERSCHREVEN WORDT ─────────────────────────────────────────────
 *
 * Staat een bewering er al als feit of kennis, dan blijft het zoals het was. Was
 * het er alleen als vermoeden en zegt het materiaal het nu zelf, dan komt er een
 * nieuwe versie (`vervang()`, de oude blijft in de geschiedenis), net als bij een
 * antwoord in het gesprek. Wat een mens eerder afkeurde komt niet stil terug als
 * vermoeden; zegt een mens het nu zelf in een upload, dan telt dat als nieuwe
 * uitspraak.
 *
 * Gooit nooit een fout per item: tellen en doorgaan, zoals `uit-gesprek.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { vervang, legVast, type Door, type NieuwKennisItem } from "@/lib/kennis/vastleggen";
import { nieuweUploadTelling, type GecontroleerdUploadItem, type UploadTelling } from "@/lib/kennis/upload-verify";

type Mens = Extract<Door, { actor: "mens" }>;

const MODEL_TAAK = "upload_kennis";

function alsNieuw(profileId: string, documentId: string, i: GecontroleerdUploadItem, ruw: unknown): NieuwKennisItem {
  return {
    profileId,
    domein: i.domein,
    soort: i.soort,
    bewering: i.bewering,
    status: i.status,
    bron: "upload",
    citaat: i.citaat,
    gebruik: i.gebruik,
    verlooptOp: i.verlooptOp,
    herkomst: { tabel: "brand_documents", id: documentId },
    ruw,
  };
}

export async function legUploadVast(
  admin: SupabaseClient,
  args: { profileId: string; documentId: string; items: readonly GecontroleerdUploadItem[]; ruw: unknown },
  mens: Mens,
): Promise<UploadTelling> {
  const telling = nieuweUploadTelling();
  const redenen: string[] = [];

  for (const i of args.items) {
    const nieuw = alsNieuw(args.profileId, args.documentId, i, { modelUitvoer: args.ruw, zekerheid: i.status === "verklaard" ? "staat_er" : "vermoeden" });
    const door: Door = i.status === "verklaard" ? mens : { actor: "model", taak: MODEL_TAAK };
    const uitkomst = await legVast(admin, nieuw, door);

    if (uitkomst.soort === "vastgelegd") {
      if (i.status === "afgeleid") telling.vermoedens++;
      else if (i.tab === "feiten") telling.feiten++;
      else telling.kennis++;
      continue;
    }
    if (uitkomst.soort === "geweigerd") {
      telling.geweigerd++;
      redenen.push(uitkomst.fouten.join(" "));
      continue;
    }

    // Het stond er al (of een mens wees het af). Een vermoeden doet daar niets
    // aan; een uitspraak van een mens vervangt alleen een vermoeden of een afwijzing.
    const eerder = uitkomst.item;
    const teVervangen = i.status === "verklaard" && (uitkomst.soort === "eerder_afgewezen" || eerder.status === "afgeleid");
    if (!teVervangen) {
      telling.alBekend++;
      continue;
    }
    const vervangen = await vervang(admin, { profileId: args.profileId, oudId: eerder.id, nieuw }, mens);
    if (vervangen.ok) {
      if (i.tab === "feiten") telling.feiten++;
      else telling.kennis++;
    } else {
      telling.geweigerd++;
      redenen.push(vervangen.fout);
    }
  }

  if (telling.feiten + telling.kennis + telling.vermoedens + telling.geweigerd > 0) {
    console.info(
      `Kennislaag upload voor merk ${args.profileId}: ${telling.feiten} feiten, ${telling.kennis} kennis, ` +
        `${telling.vermoedens} vermoedens, ${telling.alBekend} al bekend, ${telling.geweigerd} geweigerd.`,
    );
    if (redenen.length > 0) console.warn(`Kennislaag upload voor merk ${args.profileId}, geweigerd: ${redenen.slice(0, 10).join("; ")}`);
  }
  return telling;
}
