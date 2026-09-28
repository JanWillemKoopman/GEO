/**
 * DE TWINTIG OPEN PUNTEN VAN HET TERUGVULLEN AFHANDELEN (besluit V16).
 *
 * Op verzoek van de eigenaar (27 september 2026) afgehandeld door Claude, niet
 * door een mens per punt: daarom geen afwijzing en geen bevestiging (die zijn
 * voor een mens, V6), alleen koppelen, merkbreed laten, en vervangen door wat
 * letterlijk op de site staat. Elk citaat hieronder staat op de opgeslagen
 * pagina (`profile_pages`); de SQL controleert dat nog eens voordat er iets
 * verandert.
 *
 *   npx tsx scripts/kennis-open-punten.ts > open-punten.sql
 *   (draai de uitvoer met de databasetool, besluit V15; een tweede run doet niets)
 *
 * De ids zijn de rijen van productie op 27 september 2026. Dit script is één
 * keer bedoeld; het blijft staan als verslag van wat er per punt besloten is.
 */
import { openPuntenSql, type Besluit, type NieuwWaargenomen } from "@/lib/kennis/open-punten";

const POMPERT = "c698f11c-d3e4-49db-8276-3beaa5ad7d37";
const KEERIS = "3e4e819a-a7f4-4331-88de-9b757f7c7c32";
const POMPERT_PRIJZEN = "https://www.autorijschoolpompert.nl/prijzen-lespakketten/";

// Diensten in de kennislaag (aanbodboom van Pompert).
const AUTORIJLES = "b2a50610-8ddb-4e97-9621-19bd5f972894";
const AUTOMAAT = "eb2fc814-fb35-44f4-80bd-a8fc69997eae";
const ELEKTRISCH = "b87e539b-16b5-4c3f-87d7-74ee6818aa33";
const SIMULATORLES = "8c88acce-47d8-4de4-aaea-8bb6179a6d1a";
const SIMULATORCURSUS = "c063d450-f4b3-4823-8316-b4baec276934";
const INTAKE = "8e0c5485-e5a8-4479-8af0-6ead142484b6";
const RIJANGST = "22d176c8-fcd5-436c-9833-20163a88699c";

const prijsPompert = (bewering: string, citaat: string, geldtVoor: string[], offering: string): NieuwWaargenomen => ({
  profileId: POMPERT,
  domein: "aanbod",
  soort: "prijs",
  bewering,
  citaat,
  bronUrl: POMPERT_PRIJZEN,
  geldtVoor,
  herkomst: { tabel: "profile_offerings", id: offering },
});

export const BESLUITEN: Besluit[] = [
  // ── Autorijschool Pompert: prijzen uit de aanbodboom zonder citaat ──
  {
    soort: "vervangen",
    id: "c1629728-1d90-4792-b780-64d5000693a6",
    naam: "automaat_prijs",
    nieuw: prijsPompert(
      "Rijles in een automaat: in een lespakket € 76 per uur.",
      "Ook mogelijk in automaat (76,- per uur)",
      // De elektrische lesauto is een automaat (aanbodboom, met citaat).
      [AUTOMAAT, ELEKTRISCH],
      "96cca551-875d-4e17-bad1-7a7a6bab12e1",
    ),
    reden: "De prijs staat op de prijzenpagina; het tweede deel (\"staan afzonderlijk vermeld\") was geen feit.",
  },
  {
    soort: "opgaan",
    id: "94811f89-9330-415d-ae53-52202e75cc35",
    doel: { naam: "automaat_prijs" },
    reden: "Dezelfde prijs als de automaat; de elektrische lesauto is een automaat. Nu één item voor beide diensten.",
  },
  {
    soort: "vervangen",
    id: "ed9ac524-05a2-41ec-9d8c-76221772b5f9",
    naam: "simulatorles_prijs",
    nieuw: prijsPompert(
      "Rijsimulatorles: een losse les van 60 minuten kost € 50.",
      "Losse les rijsimulator 60 minuten € 50,-",
      [SIMULATORLES],
      "b3a5ac4e-e2f3-4ca1-b96d-5aae3dfd3067",
    ),
    reden: "Staat letterlijk op de prijzenpagina. De cursus van 8 uur (€ 380) staat al als eigen item bij de cursus.",
  },
  {
    soort: "vervangen",
    id: "bfec7a2e-7c69-451c-ae2a-ed996e5dd970",
    naam: "intake_prijs",
    nieuw: prijsPompert(
      "Proefles / intake voor rijlessen: de intake van 60 minuten kost € 50; wie daarna bij de rijschool lest, krijgt die kosten terug.",
      "De intake kost € 50,-. Kom je daarna bij ons lessen dan krijg je deze kosten terug.",
      [INTAKE],
      "82eab52a-ac93-48bb-abc3-b9e104be4b8d",
    ),
    reden: "Staat letterlijk op de prijzenpagina.",
  },
  {
    soort: "vervangen",
    id: "fbdbd1b9-c187-4568-b304-b0b15b2546d6",
    naam: "autorijles_prijs",
    nieuw: prijsPompert(
      "Autorijles (handgeschakeld): een losse les van 60 minuten kost € 80.",
      "Losse autorijles van 60 minuten ** € 80,-",
      [AUTORIJLES],
      "b17d3821-ff3e-4856-8661-9b11b6d64c0f",
    ),
    reden:
      "Het oude item zei \"lessen als pakket vanaf € 76 per uur\"; op de site hoort € 76 per uur bij de automaat. Het handgeschakelde starterspakket kost € 2525 voor 25 uur. Opgesplitst in drie items die letterlijk op de site staan.",
  },
  {
    soort: "erbij",
    nieuw: prijsPompert(
      "Autorijles (handgeschakeld): het starterspakket van 20 lessen van 75 minuten kost € 2525, inclusief tussentijdse toets en praktijkexamen.",
      "Starterspakket 25 uur / 20 lessen (75 minuten) Incl. tussentijdse toets, praktijkexamen, gratis praktijkboek, gratis herexamen*. Ook mogelijk in automaat (76,- per uur). € 2525",
      [AUTORIJLES],
      "b17d3821-ff3e-4856-8661-9b11b6d64c0f",
    ),
    reden: "Uit het vervangen item over autorijles, nu met het letterlijke citaat.",
  },
  {
    soort: "erbij",
    nieuw: prijsPompert(
      "Autorijles (handgeschakeld): het basispakket van 32 lessen van 75 minuten kost € 3665, inclusief tussentijdse toets en praktijkexamen.",
      "Basispakket 40 uur / 32 lessen (75 minuten) Incl. tussentijdse toets, praktijkexamen, gratis praktijkboek, gratis herexamen*. Ook mogelijk in automaat (76,- per uur) € 3665",
      [AUTORIJLES],
      "b17d3821-ff3e-4856-8661-9b11b6d64c0f",
    ),
    reden: "Uit het vervangen item over autorijles, nu met het letterlijke citaat.",
  },

  // ── Autorijschool Pompert: feiten die voor iets gelden wat geen dienst is ──
  { soort: "koppelen", id: "fe5d4bae-b01a-4c9a-8bbc-c59d55ae842b", geldtVoor: [RIJANGST], reden: "Gaat over begeleiding bij faalangst: de dienst Begeleiding bij rijangst." },
  { soort: "koppelen", id: "c7d404ba-e17b-4d0c-b48f-8d3ffef0bd1f", geldtVoor: [SIMULATORLES], reden: "Gaat over lessen in de rijsimulator." },
  { soort: "koppelen", id: "ba8eafec-a7d7-43d6-9e87-bb10da27f9b9", geldtVoor: [AUTORIJLES], reden: "Het starterspakket is een pakket autorijlessen." },
  { soort: "koppelen", id: "e1cb22a9-faa9-4481-965f-6abf8f471e3a", geldtVoor: [AUTORIJLES], reden: "Het basispakket is een pakket autorijlessen." },
  { soort: "koppelen", id: "84de2e15-7235-4949-a19b-424b5e93cfa3", geldtVoor: [SIMULATORCURSUS], reden: "Gaat over de rijsimulatorcursus." },
  { soort: "merkbreed", id: "1b8ff72a-11d2-4348-b9f6-95456a073181", reden: "\"Alle prijzen gelden per 01-11-2025\": geldt voor alle prijzen van het merk, en is zelf geen prijs." },
  { soort: "merkbreed", id: "b37c7e95-1072-44e1-8f6f-64adfd8d80bb", reden: "Eén vaste instructeur geldt voor elke leerling, bij elke dienst." },

  // ── Wesley Keeris Installatietechniek ──
  {
    soort: "vervangen",
    id: "fd8f1556-ac2f-40c9-8738-159d783fb27e",
    naam: "keeris_offerte",
    nieuw: {
      profileId: KEERIS,
      domein: "aanbod",
      // Geen "werkwijze": dan zou het kennisgat (N6) bij elke dienst denken dat
      // bekend is hoe het in zijn werk gaat.
      soort: "offerte",
      bewering: "Een offerte aanvragen is vrijblijvend.",
      citaat: "vraag een vrijblijvende offerte aan",
      bronUrl: "https://www.wkinstallatie.nl/service",
      geldtVoor: [],
      herkomst: { tabel: "profile_offerings", id: "d5ee4e87-e6dd-47e2-97b7-4474c91306bd" },
    },
    reden: "\"Offerte op aanvraag\" is geen prijs. Wat wel op de site staat: een offerte is vrijblijvend, en dat geldt voor het hele bedrijf.",
  },
  {
    soort: "opgaan",
    id: "db79b321-40d8-4836-b519-19a1db18fdb0",
    doel: { naam: "keeris_offerte" },
    reden: "Hetzelfde als het punt hierboven, bij de categorie in plaats van de dienst.",
  },
  { soort: "merkbreed", id: "94a4e737-c6a9-47e8-9e90-4838dd2088f6", reden: "De openingstijden van het kantoor gelden voor het hele bedrijf." },
  { soort: "merkbreed", id: "3aaefec8-11a6-458a-bff7-96586c63885a", reden: "Het contactadres geldt voor het hele bedrijf." },

  // ── Hans Verstraaten Hoveniers ──
  {
    soort: "opgaan",
    id: "0c691c35-996d-482b-872d-112f772c09cf",
    doel: { id: "3ad103af-db40-4e88-8fc9-e6af437c4bbe" },
    reden: "\"Offerte op aanvraag\" is geen prijs; de site zegt \"Gratis offerte\", en dat staat al als feit voor het hele bedrijf.",
  },
  {
    soort: "opgaan",
    id: "25994597-d02e-41f8-9313-889516ac77e9",
    doel: { id: "3ad103af-db40-4e88-8fc9-e6af437c4bbe" },
    reden: "\"Offerte op aanvraag\" is geen prijs; de site zegt \"Gratis offerte\", en dat staat al als feit voor het hele bedrijf.",
  },
  { soort: "merkbreed", id: "3ad103af-db40-4e88-8fc9-e6af437c4bbe", reden: "Een gratis offerte geldt voor elke dienst." },
  { soort: "merkbreed", id: "6339c1c5-72f0-460a-be5c-519f212cdffa", reden: "Offertes binnen vier uur gelden voor elke dienst." },
];

if (process.argv[1]?.endsWith("kennis-open-punten.ts")) {
  console.log(openPuntenSql(BESLUITEN, "2026-09-27"));
}
