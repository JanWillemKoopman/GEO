import "server-only";

/**
 * De ENIGE plek waar ORBIT ENGINE naar buiten mag.
 *
 * ── WAAROM DIT BESTAAT (antihack.md K1) ─────────────────────────────────────
 *
 * ⚠️ De crawler haalde adressen op die hij van de klant of van een vreemde
 * website kreeg, zonder te kijken waar ze heen wezen. Nagemeten op 29 augustus
 * 2026 kwamen 169.254.169.254 (het metadata-adres van de cloud), 10.0.0.55,
 * 192.168.1.10 en 172.17.0.12 allemaal door `checkUrlFormat()` heen.
 *
 * Sinds 27 augustus 2026 mag élke klant zelf een merk aanmaken
 * (`lib/cost-rules.ts`), en de pijplijn slaat de opgehaalde tekst op en toont
 * hem terug in het merkdossier. Een klant kon ORBIT ENGINE dus een intern adres
 * laten ophalen en het antwoord op zijn eigen scherm teruglezen.
 *
 * ── DRIE CONTROLES, EN DE TWEEDE IS DE BELANGRIJKSTE ────────────────────────
 *
 *   1. Alleen `http` en `https`. Geen `file:`, geen `data:`.
 *   2. De naam OPZOEKEN en naar het IP-adres kijken. Dit is wat `lib/url.ts`
 *      niet kan doen: `127.0.0.1.nip.io` is een keurige publieke naam die naar
 *      localhost wijst, en alleen het opzoeken verraadt dat. Hetzelfde geldt
 *      voor een eigen domein met een A-record naar 10.0.0.5, mét een geldig
 *      certificaat, want een certificaat hoort bij een naam en niet bij een IP.
 *   3. Elke omleiding opnieuw langs 1 en 2. Anders is één 302 genoeg om alsnog
 *      binnen te komen, en `fetch` volgt standaard ook een omleiding van https
 *      naar http.
 *
 * ── ⚠️ WAT ER OPEN BLIJFT, EN DAT HOORT HIER TE STAAN ───────────────────────
 *
 * Tussen het opzoeken van de naam en het daadwerkelijke ophalen zit een klein
 * tijdsgat waarin de naam naar een ander adres kan gaan wijzen. Dat heet DNS
 * rebinding. Volledig dichten vraagt een eigen verbindingslaag in `undici` die
 * per verbinding het IP-adres vastpint, en dat is een flinke ingreep voor een
 * aanval die een aanvaller met een eigen DNS-server en een strakke timing
 * vereist. Voor de dreiging hier is deze controle ruim voldoende. Maar het gat
 * is niet nul, en wie dat ooit wél wil sluiten leest dit als startpunt.
 */
import { lookup } from "node:dns/promises";
import { isInternalHostname, isInternalIp } from "@/lib/url";

/** Hoeveel omleidingen we volgen. `fetch` doet er standaard 20, dat is te veel. */
const MAX_OMLEIDINGEN = 5;

export class GeblokkeerdAdresError extends Error {
  readonly reden: string;
  constructor(url: string, reden: string) {
    super(`Adres geweigerd (${reden}): ${url}`);
    this.name = "GeblokkeerdAdresError";
    this.reden = reden;
  }
}

/**
 * Mag dit adres opgehaald worden? Gooit een `GeblokkeerdAdresError` zo niet.
 *
 * Geëxporteerd zodat de ketentest hem los kan aanroepen zonder echt te fetchen.
 */
export async function controleerAdres(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new GeblokkeerdAdresError(url.toString(), "alleen http en https");
  }
  if (isInternalHostname(url.hostname)) {
    throw new GeblokkeerdAdresError(url.toString(), "interne hostnaam");
  }

  let adressen: { address: string }[];
  try {
    adressen = await lookup(url.hostname, { all: true });
  } catch {
    // ⚠️ Een naam die niet op te zoeken is, LATEN we passeren. De fetch erna
    // faalt dan toch met ENOTFOUND, en dat is een boodschap die de klant snapt
    // ("we komen niet op je website"). Zou dit hier een beveiligingsfout
    // opleveren, dan zou een DNS-storing eruitzien als een aanvalspoging, en dan
    // gaat iemand die melding op een dag negeren.
    return;
  }

  const intern = adressen.find((a) => isInternalIp(a.address));
  if (intern) {
    throw new GeblokkeerdAdresError(url.toString(), `wijst naar het interne adres ${intern.address}`);
  }
}

/**
 * Als `fetch`, maar met de drie controles hierboven.
 *
 * Volgt omleidingen zelf (`redirect: "manual"`), zodat elke stap opnieuw
 * gecontroleerd wordt. Aanroepers hoeven `redirect` dus niet meer mee te geven.
 */
export async function safeFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new GeblokkeerdAdresError(input, "geen geldig adres");
  }

  for (let stap = 0; stap <= MAX_OMLEIDINGEN; stap++) {
    await controleerAdres(url);

    const res = await fetch(url, { ...init, redirect: "manual" });

    const isOmleiding = res.status >= 300 && res.status < 400;
    const locatie = res.headers.get("location");
    if (!isOmleiding || !locatie) return res;

    // De body van een omleiding is niet interessant, maar wel open. Sluiten
    // voorkomt dat de verbinding blijft hangen tijdens een lange keten.
    await res.body?.cancel().catch(() => {});

    try {
      url = new URL(locatie, url);
    } catch {
      throw new GeblokkeerdAdresError(locatie, "omleiding naar een ongeldig adres");
    }
  }

  throw new GeblokkeerdAdresError(input, `meer dan ${MAX_OMLEIDINGEN} omleidingen`);
}
