/**
 * Normaliseert een door de klant ingevoerde website naar een schone hostnaam
 * (bv. "https://www.MediaMarkt.nl/" → "mediamarkt.nl"). Retourneert null als de
 * invoer duidelijk geen website is.
 */
export function normalizeUrl(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
  // Minimale sanity-check: bevat een punt, geen spaties.
  if (!s.includes(".") || /\s/.test(s)) return null;
  return s;
}

/**
 * ── Formaatcontrole mét uitleg (optimalisatie.md 0.12) ──────────────────────
 *
 * `normalizeUrl` geeft alleen null terug bij een fout, genoeg voor de server,
 * te weinig voor een formulier: de klant weet dan niet WAT er mis is. Deze
 * variant geeft dezelfde beoordeling plus een boodschap in gewone taal, zodat
 * de onboarding het probleem kan aanwijzen op het moment van typen.
 *
 * Zonder dit kwam een typefout ("mediamarkt" zonder extensie) pas minuten later
 * boven water als een mislukt profiel met een technische foutmelding, het
 * slechtst denkbare moment, want de klant is dan al weg van het formulier.
 *
 * Bewust mild: dit weert wat aantoonbaar geen webadres is. Of de site ook echt
 * bestaat is een netwerkvraag, geen formaatvraag.
 */
export interface UrlCheck {
  ok: boolean;
  /** Uitleg in gewone taal; alleen gevuld als ok = false. */
  message?: string;
}

export function checkUrlFormat(input: string): UrlCheck {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: "Vul het webadres van de website in." };

  if (/\s/.test(trimmed.replace(/^https?:\/\//, ""))) {
    return { ok: false, message: "Een webadres bevat geen spaties. Bedoelde je bijvoorbeeld voorbeeld.nl?" };
  }

  const host = normalizeUrl(trimmed);
  if (!host) {
    return {
      ok: false,
      message: "Dit lijkt geen compleet webadres. Vul het in met extensie, bijvoorbeeld voorbeeld.nl.",
    };
  }

  // Alleen het domeingedeelte beoordelen; een pad (/nl/winkel) mag blijven staan.
  const domain = host.split("/")[0];
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) {
    return { ok: false, message: "Er staat een punt te veel of te weinig in het adres." };
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    return { ok: false, message: "Dit adres bevat tekens die niet in een webadres horen." };
  }
  // Een extensie van één letter bestaat niet, vangt de typefout "voorbeeld.n".
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2) {
    return { ok: false, message: "De extensie klopt niet. Bedoelde je bijvoorbeeld .nl of .com?" };
  }

  // ⚠️ Weert adressen die naar een intern netwerk wijzen. Zie isInternalHostname.
  if (isInternalHostname(domain)) {
    return {
      ok: false,
      message: "Dit adres wijst naar een intern netwerk en kan niet als website gebruikt worden.",
    };
  }

  return { ok: true };
}

/**
 * Wijst deze hostnaam naar een intern of gereserveerd adres?
 *
 * ── DE FOUT DIE DIT DICHT, EN HIJ WAS ERGER DAN HIJ LEEK ────────────────────
 *
 * ⚠️ Gevonden bij de beveiligingsaudit van 29 augustus 2026 (antihack.md K1).
 * `checkUrlFormat` weerde alleen wat aantoonbaar geen webadres was, en keek niet
 * WAAR het adres heen wees. Nagemeten met de functie zelf kwamen deze er
 * allemaal doorheen:
 *
 *     169.254.169.254   het metadata-adres van de cloud
 *     10.0.0.55         privé netwerk
 *     192.168.1.10      privé netwerk
 *     172.17.0.12       Docker-netwerk
 *     100.64.0.10       carrier grade NAT
 *
 * Dat 127.0.0.1 en 10.0.0.5 wél geweigerd werden, was TOEVAL en geen
 * bescherming: hun laatste deel is één cijfer, en dat sneuvelde op de regel
 * `tld.length < 2` hierboven, die bedoeld is voor de typefout "voorbeeld.n".
 * Eén cijfer erbij (10.0.0.55) en het adres kwam er gewoon langs.
 *
 * Waar dat op uitliep: sinds 27 augustus 2026 mag elke klant zelf een merk
 * aanmaken (`lib/cost-rules.ts`, STAFF_ONLY_ACTIONS bevat alleen nog
 * `reputatie_starten`). De pijplijn haalt de opgegeven website op, bewaart de
 * platte tekst (`lib/pipeline/refresh-inventory.ts`) en toont hem terug in het
 * merkdossier. Een klant kon ORBIT ENGINE dus een intern adres laten ophalen en
 * het antwoord op zijn eigen scherm teruglezen.
 *
 * ── DIT IS DE HELFT VAN DE OPLOSSING ────────────────────────────────────────
 *
 * Deze functie kijkt alleen naar wat er STAAT. Een keurige publieke naam die
 * naar binnen wijst (127.0.0.1.nip.io, of een eigen domein met een A-record naar
 * 10.0.0.5) komt hier langs, want dat verraadt alleen het OPZOEKEN van de naam.
 * Dat gebeurt in `lib/safe-fetch.ts`, en die is de echte poort. Deze functie is
 * de eerste zeef, en staat hier omdat hij puur is en dus in het formulier
 * dezelfde melding kan geven op het moment van typen.
 *
 * Puur en zonder `server-only` (conventie 2), zodat `scripts/test-unit.ts` erbij kan.
 */
export function isInternalHostname(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;

  // Een naam zonder punt is nooit een website op internet (localhost, een
  // containernaam, een machine op het eigen netwerk).
  if (!h.includes(".")) return true;

  // Topniveaus die per definitie binnen een netwerk blijven.
  if (/\.(local|internal|localhost|intranet|lan|corp|home\.arpa)$/.test(h)) return true;

  // IPv6 laten we in z'n geheel niet toe. ORBIT ENGINE crawlt websites op naam,
  // nooit op een letterlijk IPv6-adres, dus dit kost geen enkele echte klant iets.
  if (h.includes(":")) return true;

  // Vanaf hier: is dit een letterlijk IPv4-adres, en zo ja, is het intern?
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return false;

  const delen = [Number(v4[1]), Number(v4[2]), Number(v4[3]), Number(v4[4])];
  // Onbekend is geen toegang (conventie 3): een adres met een deel boven 255 is
  // geen geldig IPv4-adres, en dan weten we niet wat het is.
  if (delen.some((d) => d > 255)) return true;

  const [a, b] = delen;
  if (a === 0) return true; // dit netwerk
  if (a === 10) return true; // privé
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local, waaronder het metadata-adres
  if (a === 172 && b >= 16 && b <= 31) return true; // privé
  if (a === 192 && b === 168) return true; // privé
  if (a === 192 && b === 0) return true; // IETF-protocoltoewijzingen
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier grade NAT
  if (a === 198 && (b === 18 || b === 19)) return true; // testnetwerk
  if (a >= 224) return true; // multicast en gereserveerd

  return false;
}

/** Bouwt de auto-gegenereerde analysenaam (abcplan.md §3.4). */
export function buildAnalysisName(url: string, topic: string | null): string {
  return topic && topic.trim() ? `${url} · ${topic.trim()}` : `${url} (hele site)`;
}
