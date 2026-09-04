/**
 * DE LIVE APP BEDIENEN ZONDER BROWSER
 *
 * ── WAAROM DIT EEN SCRIPT IS EN GEEN ALINEA IN EEN DOCUMENT ─────────────────
 *
 * Elke echte doorloop op productie tot nu toe (de klantreis van 31 augustus, de
 * contentronde van Gasservice Brabant op 1 september, de technische audit van
 * 2 september) is gedaan door met de hand in te loggen bij de Auth-API, de
 * sessie in een cookie te zetten en die met `curl` mee te sturen. Die werkwijze
 * stond als één alinea in een takenbestand dat inmiddels weg is, en werd
 * daardoor elke sessie opnieuw uitgevonden, met het wachtwoord erbij in de repo
 * omdat dat de makkelijkste plek leek.
 *
 * Twee dingen worden hier beter van. Het is één commando in plaats van vier
 * stappen die je fout kunt doen, en het wachtwoord komt uit de omgeving in
 * plaats van uit een bestand dat in git staat.
 *
 * ── GEBRUIK ─────────────────────────────────────────────────────────────────
 *
 *   npm run live -- GET  /api/analyses/<id>/content
 *   npm run live -- POST /api/profiles payload.json
 *   npm run live -- POST /api/analyses/<id>/confirm
 *
 * De inloggegevens komen uit `.env.local`, net als bij `test:openai` en
 * `eval:mention`, of anders uit de omgeving:
 *
 *   LIVE_EMAIL=...      het account waarmee je wilt handelen
 *   LIVE_PASSWORD=...   het wachtwoord daarvan
 *   LIVE_BASE_URL=...   optioneel, standaard de productieomgeving
 *
 * ⚠️ Er staat met opzet GEEN standaardwachtwoord in dit bestand en er komt er
 * ook nooit een in. Een wachtwoord in de repo is een wachtwoord dat je niet meer
 * kunt intrekken zonder de geschiedenis te herschrijven. `.env.local` staat in
 * `.gitignore` en is daarom de juiste plek; een wachtwoord in de commandoregel
 * belandt in de geschiedenis van je shell en is dat niet.
 *
 * ── DE SESSIE WORDT HERGEBRUIKT ─────────────────────────────────────────────
 *
 * Een sessie is een uur geldig. Elke aanroep opnieuw inloggen zou bij een ronde
 * van honderd verzoeken honderd keer een token aanmaken, en dat is precies het
 * patroon waar een inlogbegrenzing (migratie 0090) op afgaat. De sessie gaat
 * daarom in `.live-session.json`, buiten git.
 *
 * ⚠️ Dit script schrijft naar PRODUCTIE. Elke POST kost mogelijk geld (een
 * meetronde is ongeveer $0,85, een contentpagina ongeveer $1,00) en is zichtbaar
 * voor de klant. Lees `docs/tasks/benchmarkronde-twee-klanten.md` §1 voordat je
 * een ronde start.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

// .env.local heeft voorrang op .env, zoals Next.js dat ook doet.
loadEnv({ path: ".env.local", override: true });

/**
 * De productieomgeving.
 *
 * ⚠️ Niet `geo-janwillemkoopmans-projects.vercel.app`: dat adres bestaat, maar
 * staat achter Vercel Deployment Protection en geeft op élke route een 302 naar
 * `vercel.com/sso-api`. Wie dat test, concludeert ten onrechte dat de app
 * onbereikbaar is. Dat is op 3 september 2026 gebeurd en heeft een hele
 * benchmarkronde opgehouden.
 */
const STANDAARD_BASE_URL = "https://geo-ten-blush.vercel.app";
const STANDAARD_SUPABASE_URL = "https://kosauqzjbpweluiqgmwv.supabase.co";

/**
 * De anon-sleutel is PUBLIEK: hij wordt naar elke browser gestuurd die de app
 * opent en geeft in zijn eentje geen enkele toegang (RLS staat op select-only en
 * op de eigen rijen). Hij mag daarom als standaardwaarde in de repo staan, in
 * tegenstelling tot het wachtwoord.
 */
const STANDAARD_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvc2F1cXpqYnB3ZWx1aXFnbXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3OTgyNjQsImV4cCI6MjEwMDM3NDI2NH0." +
  "roPfKrozieUnO9IBIcErMzmySdi0C_eCvRya1mw7WJQ";

const BASE_URL = (process.env.LIVE_BASE_URL ?? STANDAARD_BASE_URL).replace(/\/$/, "");
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? STANDAARD_SUPABASE_URL).replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? STANDAARD_ANON_KEY;

/**
 * De cookienaam die de Supabase-client in de browser gebruikt: `sb-<ref>-auth-token`.
 * De projectverwijzing komt uit de URL, zodat een andere omgeving vanzelf de
 * juiste naam krijgt in plaats van een hardgecodeerde die stil de verkeerde is.
 */
function cookieNaam(): string {
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

const SESSIEBESTAND = join(process.cwd(), ".live-session.json");

interface Sessie {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  user: { id: string; email: string };
}

function leesBewaardeSessie(email: string): Sessie | null {
  if (!existsSync(SESSIEBESTAND)) return null;
  try {
    const rij = JSON.parse(readFileSync(SESSIEBESTAND, "utf8")) as Record<string, Sessie>;
    const sessie = rij[email];
    if (!sessie) return null;
    // Een minuut marge: een sessie die tijdens het verzoek verloopt geeft een
    // 401 die eruitziet als een rechtenprobleem, en dat is een dure verwarring.
    if (sessie.expires_at * 1000 < Date.now() + 60_000) return null;
    return sessie;
  } catch {
    return null;
  }
}

function bewaarSessie(email: string, sessie: Sessie): void {
  const rij = existsSync(SESSIEBESTAND)
    ? (JSON.parse(readFileSync(SESSIEBESTAND, "utf8")) as Record<string, Sessie>)
    : {};
  rij[email] = sessie;
  writeFileSync(SESSIEBESTAND, JSON.stringify(rij, null, 2), { mode: 0o600 });
}

async function logIn(email: string, wachtwoord: string): Promise<Sessie> {
  const bewaard = leesBewaardeSessie(email);
  if (bewaard) return bewaard;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: wachtwoord }),
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok || !body.access_token) {
    throw new Error(
      `Inloggen als ${email} mislukt (HTTP ${res.status}): ${body.error_description ?? body.msg ?? "onbekend"}`,
    );
  }
  const sessie = body as unknown as Sessie;
  bewaarSessie(email, sessie);
  return sessie;
}

/**
 * De sessie als cookie, in de vorm die `@supabase/ssr` op de server terugleest:
 * `base64-` gevolgd door de sessie-JSON in base64url.
 */
function cookieVan(sessie: Sessie): string {
  const payload = Buffer.from(JSON.stringify(sessie)).toString("base64url");
  return `${cookieNaam()}=base64-${payload}`;
}

function toon(hulp: string): never {
  console.error(hulp.trim());
  process.exit(1);
}

async function main(): Promise<void> {
  const [methode, pad, payloadPad] = process.argv.slice(2);

  if (!methode || !pad) {
    toon(`
De live app bedienen zonder browser.

  npm run live -- GET  /api/analyses/<id>/content
  npm run live -- POST /api/profiles payload.json
  npm run live -- POST /api/analyses/<id>/confirm

Omgeving:
  LIVE_EMAIL      het account waarmee je handelt (verplicht)
  LIVE_PASSWORD   het wachtwoord daarvan (verplicht)
  LIVE_BASE_URL   standaard ${STANDAARD_BASE_URL}

Dit schrijft naar PRODUCTIE en kan geld kosten. Lees eerst
docs/tasks/benchmarkronde-twee-klanten.md §1.
`);
  }

  const email = process.env.LIVE_EMAIL;
  const wachtwoord = process.env.LIVE_PASSWORD;
  if (!email || !wachtwoord) {
    toon(`
LIVE_EMAIL en LIVE_PASSWORD ontbreken. Zet ze in .env.local:

  LIVE_EMAIL=e2e-consultant@orbit-test.nl
  LIVE_PASSWORD=...

Ze staan met opzet niet in de repo: een wachtwoord dat je commit, kun je niet
meer intrekken zonder de geschiedenis te herschrijven.
`);
  }

  const sessie = await logIn(email, wachtwoord);

  const body = payloadPad ? readFileSync(payloadPad, "utf8") : undefined;
  const res = await fetch(`${BASE_URL}${pad.startsWith("/") ? pad : `/${pad}`}`, {
    method: methode.toUpperCase(),
    headers: {
      Cookie: cookieVan(sessie),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body,
    redirect: "manual",
  });

  const tekst = await res.text();
  console.error(`${methode.toUpperCase()} ${pad} → HTTP ${res.status} (als ${email})`);
  // De inhoud naar stdout en de status naar stderr, zodat `| python3 -m json.tool`
  // of `> uitkomst.json` gewoon werkt zonder dat de statusregel ertussen komt.
  console.log(tekst);

  // Een 401 betekent bijna altijd een verlopen sessie en niet een rechtenfout.
  // Weggooien, zodat de volgende aanroep opnieuw inlogt in plaats van dezelfde
  // fout te herhalen.
  if (res.status === 401 && existsSync(SESSIEBESTAND)) unlinkSync(SESSIEBESTAND);
  if (!res.ok) process.exit(2);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
