// Gebruik: onderwerpen.mjs <merkId> [titel]. Klapt "Onderwerpen om op te meten" open, toont de kaarten,
// en start met een titel het cluster via de knop in die kaart.
export default async ({ page, shot, args, BASIS }) => {
  const [id, titel] = args;
  await page.goto(`${BASIS}/merk/${id}/strategie/clusters`, { waitUntil: 'networkidle' });
  const kop = page.getByText('Onderwerpen om op te meten').first();
  await kop.click();
  await page.waitForTimeout(1200);
  const k = await page.locator('button').evaluateAll((bs) => bs.map((b) => b.innerText.trim()).filter(Boolean));
  console.log('KNOPPEN:', k.join(' | '));
  const tekst = await page.locator('main').innerText();
  const i = tekst.indexOf('Onderwerpen om op te meten');
  console.log(tekst.slice(i, i + 2500));
  if (!titel) return;
  const kaart = page.locator('li, article, [class*=card]').filter({ hasText: titel }).last();
  const knop = kaart.getByRole('button').filter({ hasText: /Cluster starten|Start|Meet/ }).first();
  console.log('KLIK:', await knop.innerText());
  await knop.click();
  await page.waitForURL(/\/analyses\/[0-9a-f-]+\//, { timeout: 60000 });
  console.log('ANALYSE', page.url().match(/analyses\/([0-9a-f-]+)/)[1]);
  await shot('cluster-gestart');
};
