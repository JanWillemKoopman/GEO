/**
 * DE ONTDUBBELSLEUTELS VAN DE KENNISLAAG OPNIEUW UITREKENEN.
 *
 * Nodig na een wijziging van `kennisSleutel()` (`lib/kennis/samenvoegen.ts`),
 * zoals op 26 september 2026 in K5: getallen van één of twee cijfers tellen
 * sindsdien mee. Zonder dit script zou een volgende run van het onderzoek of
 * het terugvullen een bestaand item met zo'n getal niet herkennen en dubbel
 * vastleggen.
 *
 * Zelfde route als het terugvullen (besluit V15), omdat de werkomgeving de
 * sleutel van de productiedatabase niet heeft:
 *
 *   npx tsx scripts/kennis-sleutels-herberekenen.ts --export-sql
 *   (draai die query met de databasetool, bewaar de uitvoer als rijen.json)
 *   npx tsx scripts/kennis-sleutels-herberekenen.ts --bron rijen.json
 *   (draai de update die het script afdrukt met de databasetool)
 *
 * Alleen rijen waarvan de sleutel verandert, komen in de update. De nieuwe
 * sleutel is fijner dan de oude (hij voegt alleen iets toe), dus twee actuele
 * rijen kunnen er niet op dezelfde sleutel door uitkomen. Een tweede run drukt
 * niets af.
 */
import { readFileSync } from "node:fs";
import { SLEUTELS_EXPORT_SQL, sleutelUpdateSql, type SleutelRij } from "@/lib/kennis/sleutels";

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--export-sql")) {
    console.log(SLEUTELS_EXPORT_SQL);
    return;
  }
  const i = args.indexOf("--bron");
  if (i < 0 || !args[i + 1]) {
    console.error("Gebruik: --export-sql, of --bron rijen.json");
    process.exit(1);
  }
  const ruw = JSON.parse(readFileSync(args[i + 1], "utf8")) as unknown;
  const rijen = (Array.isArray(ruw) ? ruw : ((ruw as { rijen?: unknown }).rijen ?? [])) as SleutelRij[];
  const { sql, aantal } = sleutelUpdateSql(rijen);
  console.error(`${rijen.length} rijen gelezen, ${aantal} met een andere sleutel.`);
  if (sql) console.log(sql);
}

if (process.argv[1]?.endsWith("kennis-sleutels-herberekenen.ts")) main();
