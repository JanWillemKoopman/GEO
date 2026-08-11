import "server-only";

/**
 * Inloggen bij Google met een service account, zonder bibliotheek.
 *
 * ── WAAROM GEEN `googleapis` ────────────────────────────────────────────────
 *
 * Dat pakket is tientallen megabytes voor élke Google-API die bestaat, terwijl
 * hier twee HTTP-verzoeken nodig zijn: een JWT tekenen en hem inruilen voor een
 * toegangstoken. Node kan RS256 zelf (`crypto.createSign`). Een afhankelijkheid
 * die honderd keer groter is dan wat je ervan gebruikt, is een afhankelijkheid
 * die je bij elke build betaalt en bij elke kwetsbaarheid moet nakijken.
 *
 * ── DE SLEUTEL STAAT IN ÉÉN ENV-VARIABELE ───────────────────────────────────
 *
 * `GOOGLE_SERVICE_ACCOUNT_JSON`, de volledige JSON die Google levert bij het
 * aanmaken van de sleutel. Niet uitgesplitst in twee variabelen: de private key
 * bevat regeleindes, en die overleven het knippen en plakken door een
 * instellingenscherm zelden ongeschonden. Eén blok tekst dat je in zijn geheel
 * kopieert, gaat vaker goed.
 *
 * ⚠️ Ontbreekt de variabele, dan is dat GEEN fout maar een toestand: de
 * koppeling is nog niet ingericht. Het scherm hoort dat te zeggen, niet te
 * crashen.
 */
import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
/** Alleen lezen. Aura dient niets in, dus meer recht is meer risico voor niets. */
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export interface TokenResult {
  ok: true;
  token: string;
  /** Het adres dat de klant in Search Console moet toevoegen. */
  clientEmail: string;
}

export interface TokenProblem {
  ok: false;
  /** In gewone taal, klaar om te tonen. */
  reason: string;
}

/** De sleutel, of null als hij niet is ingesteld. Gooit nooit. */
export function serviceAccount(): ServiceAccount | null {
  const ruw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!ruw || ruw.trim().length === 0) return null;
  try {
    const j = JSON.parse(ruw) as Partial<ServiceAccount>;
    if (!j.client_email || !j.private_key) return null;
    // Sommige omgevingen bewaren `\n` als twee tekens. Dan is de sleutel
    // syntactisch één regel en weigert OpenSSL hem, met een foutmelding die
    // nergens naar de oorzaak wijst.
    return {
      client_email: j.client_email,
      private_key: j.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

/** Het adres dat de klant moet toevoegen. Null zolang de sleutel ontbreekt. */
export function serviceAccountEmail(): string | null {
  return serviceAccount()?.client_email ?? null;
}

/**
 * Een toegangstoken, geldig voor een uur.
 *
 * Bewust niet gecachet over aanroepen heen: de synchronisatie draait één keer
 * per dag per merk, dus een cache zou een token bewaren dat vrijwel nooit
 * hergebruikt wordt. Binnen één taak is er precies één aanroep nodig.
 */
export async function accessToken(): Promise<TokenResult | TokenProblem> {
  const sa = serviceAccount();
  if (!sa) {
    return {
      ok: false,
      reason:
        "De Google-sleutel is nog niet ingesteld. Zet GOOGLE_SERVICE_ACCOUNT_JSON in de omgevingsvariabelen.",
    };
  }

  const nu = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: nu + 3600,
    iat: nu,
  };

  const basis = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  let handtekening: string;
  try {
    const sign = createSign("RSA-SHA256");
    sign.update(basis);
    sign.end();
    handtekening = sign.sign(sa.private_key).toString("base64url");
  } catch {
    return {
      ok: false,
      reason: "De Google-sleutel is onleesbaar. Plak de volledige JSON opnieuw, inclusief de regeleindes.",
    };
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${basis}.${handtekening}`,
      }),
    });

    if (!res.ok) {
      const tekst = await res.text().catch(() => "");
      return {
        ok: false,
        reason: `Google weigerde de sleutel (${res.status}). ${kort(tekst)}`,
      };
    }

    const j = (await res.json()) as { access_token?: string };
    if (!j.access_token) {
      return { ok: false, reason: "Google gaf geen toegangstoken terug." };
    }
    return { ok: true, token: j.access_token, clientEmail: sa.client_email };
  } catch {
    return { ok: false, reason: "Google was niet bereikbaar. Probeer het later opnieuw." };
  }
}

function base64url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

/** Een foutmelding van Google is soms een halve pagina JSON. */
function kort(s: string): string {
  const schoon = s.replace(/\s+/g, " ").trim();
  return schoon.length > 200 ? `${schoon.slice(0, 200)}…` : schoon;
}
