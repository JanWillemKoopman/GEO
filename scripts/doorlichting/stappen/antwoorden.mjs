// Gebruik: antwoorden.mjs <pad naar json>. Stuurt elk antwoord via dezelfde route als het vragenscherm.
import { readFileSync, writeFileSync } from 'fs';
export default async ({ page, args, BASIS }) => {
  const alles = JSON.parse(readFileSync(args[0], 'utf8'));
  await page.goto(BASIS + '/merk', { waitUntil: 'networkidle' });
  const log = [];
  for (const [merk, antwoorden] of Object.entries(alles)) {
    for (const [factId, tekst] of Object.entries(antwoorden)) {
      const body = tekst === 'SKIP' ? { factId, skip: true } : { factId, answer: tekst };
      const t0 = Date.now();
      const r = await page.request.patch(`${BASIS}/api/profiles/${merk}/facts`, { data: body, timeout: 180000 });
      const ms = Date.now() - t0;
      const t = await r.text();
      log.push({ merk, factId, status: r.status(), ms, antwoord: t.slice(0, 300) });
      console.log(merk.slice(0, 4), factId.slice(0, 8), r.status(), ms + 'ms');
      if (r.status() !== 200) console.log(merk.slice(0, 4), factId.slice(0, 8), r.status(), t.slice(0, 300));
    }
  }
  writeFileSync(args[0].replace('.json', '-log.json'), JSON.stringify(log, null, 1));
  const tel = {}; for (const l of log) tel[l.status] = (tel[l.status] ?? 0) + 1;
  console.log('KLAAR', JSON.stringify(tel));
};
