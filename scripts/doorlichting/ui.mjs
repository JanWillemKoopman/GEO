// Schermbesturing voor de kwaliteitsdoorlichting.
// Gebruik: node ui.mjs <rol: consultant|klant> <stapscript.mjs> [args...]
// Het stapscript exporteert default async ({ page, shot, args, BASIS }) => {...}
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const BASIS = 'https://geo-ten-blush.vercel.app';
// Inloggegevens uit de omgeving, anders uit .env.local in de hoofdmap (staat in .gitignore).
const envPad = new URL('../../.env.local', import.meta.url);
const env = {
  ...(existsSync(envPad)
    ? Object.fromEntries(readFileSync(envPad, 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2)))
    : {}),
  ...process.env,
};
const rollen = {
  consultant: { email: env.LIVE_EMAIL, pw: env.LIVE_PASSWORD },
  klant: { email: env.LIVE_KLANT_EMAIL, pw: env.LIVE_KLANT_PASSWORD },
};
const [rol, script, ...args] = process.argv.slice(2);
// Schermafdrukken en de inlogstaat buiten de repository: de staat bevat een geldig toegangstoken.
const WERK = process.env.DOORLICHTING_WERKMAP ?? `${tmpdir()}/doorlichting`;
const SHOTS = `${WERK}/shots`;
mkdirSync(SHOTS, { recursive: true });
const staat = `${WERK}/state-${rol}.json`;
// De vingerafdruk van de CA van de sessieproxy, zodat Chromium alleen die extra vertrouwt.
const spki = execSync(
  'openssl x509 -in /root/.ccr/ca-bundle.crt -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64',
).toString().trim();

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PAD ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: { server: process.env.HTTPS_PROXY },
  // Vertrouwt alleen de CA van de sessieproxy (zelfde effect als hem in de trust store zetten).
  args: ['--ignore-certificate-errors-spki-list=' + spki],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: 'nl-NL',
  ...(existsSync(staat) ? { storageState: staat } : {}),
});
const page = await context.newPage();
const teller = existsSync(`${SHOTS}/.teller`) ? Number(readFileSync(`${SHOTS}/.teller`, 'utf8')) : 0;
let n = teller;
async function shot(naam) {
  // Wacht tot de laadblokken (skeletons) weg zijn, anders legt de afdruk een leeg scherm vast.
  await page.waitForFunction(() => !document.querySelector('[class*="skeleton"], [class*="animate-pulse"]'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  n += 1;
  writeFileSync(`${SHOTS}/.teller`, String(n));
  const pad = `${SHOTS}/${String(n).padStart(3, '0')}-${rol}-${naam}.png`;
  await page.screenshot({ path: pad, fullPage: true });
  console.log('📸', pad);
  return pad;
}

async function zorgVoorLogin() {
  await page.goto(BASIS + '/merk', { waitUntil: 'networkidle' });
  if (page.url().includes('/login')) {
    await page.fill('input[name=email]', rollen[rol].email);
    await page.fill('input[name=password]', rollen[rol].pw);
    await page.click('button[type=submit]');
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await context.storageState({ path: staat });
    console.log('ingelogd als', rollen[rol].email, '→', page.url());
  }
}

try {
  await zorgVoorLogin();
  const stap = (await import(resolve(script))).default;
  await stap({ page, shot, args, BASIS, context });
  await context.storageState({ path: staat });
} catch (e) {
  console.error('FOUT:', e.message);
  await shot('fout').catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
