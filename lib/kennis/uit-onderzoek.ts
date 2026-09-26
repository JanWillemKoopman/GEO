import "server-only";

/**
 * HET ONDERZOEK SCHRIJFT IN DE KENNISLAAG (K4 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * De items komen uit `onderzoek.ts` en gaan één voor één door `legVast()`, met
 * dezelfde controles als elke andere schrijver. Ouders eerst: `geldt_voor` van
 * een kind wijst naar het id dat zijn ouder net kreeg (of al had).
 *
 * ── WAAROM DIT NOOIT EEN FOUT GOOIT ─────────────────────────────────────────
 *
 * Tot K8 is de oude tabel nog de bron die de rest van de app leest. Zou een
 * mislukte schrijfactie hier de onderzoeksstap laten mislukken, dan draait de
 * taak opnieuw, betaalt hij de AI-aanroep nog eens, en komt de klant later aan
 * zijn dossier, voor iets wat nog niemand leest. Dus: tellen, loggen, doorgaan.
 * De telling staat in de log van de taak, zodat de controle op productie (K4,
 * "klaar als") hem kan terugvinden.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { legVast } from "@/lib/kennis/vastleggen";
import { doorVoor, type OnderzoekTaak } from "@/lib/kennis/onderzoek";
import type { PlanItem } from "@/lib/kennis/terugvullen";

export interface OnderzoekTelling {
  vastgelegd: number;
  bestond: number;
  eerderAfgewezen: number;
  geweigerd: number;
}

export async function legOnderzoekVast(
  admin: SupabaseClient,
  profileId: string,
  items: readonly PlanItem[],
  taak: OnderzoekTaak,
): Promise<OnderzoekTelling> {
  const telling: OnderzoekTelling = { vastgelegd: 0, bestond: 0, eerderAfgewezen: 0, geweigerd: 0 };
  const idVan = new Map<string, string>();
  const redenen: string[] = [];

  for (const item of items) {
    // Wijst `geldt_voor` naar een item dat niet vastgelegd kon worden, dan het
    // kind ook niet. Anders zou het stil voor het hele merk gaan gelden, en dat
    // is precies hoe een prijs op een pagina over iets anders belandt (V16).
    const geldtVoor = item.geldtVoorRefs.map((r) => idVan.get(r));
    if (geldtVoor.some((id) => !id)) {
      telling.geweigerd++;
      redenen.push(`${item.ref}: hoort bij een item dat niet vastgelegd is`);
      continue;
    }
    try {
      const uitkomst = await legVast(
        admin,
        {
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
          geldtVoor: geldtVoor as string[],
          analysisId: item.analysisId,
          contentPieceId: item.contentPieceId,
          herkomst: item.herkomst,
          ruw: item.ruw,
        },
        doorVoor(item, taak),
      );
      switch (uitkomst.soort) {
        case "vastgelegd":
          telling.vastgelegd++;
          idVan.set(item.ref, uitkomst.item.id);
          break;
        case "bestond":
          telling.bestond++;
          idVan.set(item.ref, uitkomst.item.id);
          break;
        case "eerder_afgewezen":
          // Een mens wees dit af; het komt niet stil terug, en een kind ervan
          // hoort er dan ook niet bij.
          telling.eerderAfgewezen++;
          break;
        case "geweigerd":
          telling.geweigerd++;
          redenen.push(`${item.ref}: ${uitkomst.fouten.join(" ")}`);
          break;
      }
    } catch (err) {
      telling.geweigerd++;
      redenen.push(`${item.ref}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.info(
    `Kennislaag ${taak} voor merk ${profileId}: ${telling.vastgelegd} nieuw, ${telling.bestond} bestond al, ` +
      `${telling.eerderAfgewezen} eerder afgewezen, ${telling.geweigerd} geweigerd.`,
  );
  if (redenen.length > 0) console.warn(`Kennislaag ${taak} voor merk ${profileId}, geweigerd: ${redenen.slice(0, 10).join("; ")}`);
  return telling;
}
