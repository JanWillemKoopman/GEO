/**
 * Het meetrapport voor de eerste echte klant (`docs/tasks/meting-eerste-klant.md`).
 *
 *   npx tsx scripts/klantmeting.ts export.json > rapport.md
 *
 * `export.json` is de uitvoer van de query in dat document: één rij per
 * pagina. Dit script leest alleen een bestand en schrijft niets naar de
 * database; het rekenen staat in `lib/pagina/klantmeting.ts`.
 */
import { readFileSync } from "node:fs";
import { meetrapport, type MeetPagina } from "@/lib/pagina/klantmeting";

const pad = process.argv[2];
if (!pad) {
  console.error("Gebruik: npx tsx scripts/klantmeting.ts export.json");
  process.exit(1);
}
const ruw = JSON.parse(readFileSync(pad, "utf8")) as unknown;
// De export van de Supabase-tool is een lijst rijen met één kolom `pagina`.
const rijen = (Array.isArray(ruw) ? ruw : []) as ({ pagina?: MeetPagina } & Partial<MeetPagina>)[];
const paginas = rijen.map((r) => (r.pagina ?? r) as MeetPagina).filter((p) => p && typeof p.titel === "string");
if (paginas.length === 0) {
  console.error("Geen pagina's gevonden in het bestand.");
  process.exit(1);
}
process.stdout.write(meetrapport(paginas));
