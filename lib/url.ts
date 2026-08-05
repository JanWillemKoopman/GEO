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

  return { ok: true };
}

/** Bouwt de auto-gegenereerde analysenaam (abcplan.md §3.4). */
export function buildAnalysisName(url: string, topic: string | null): string {
  return topic && topic.trim() ? `${url} · ${topic.trim()}` : `${url} (hele site)`;
}
