// Gebruik: plan-opstellen.mjs <merkId> [opmerking]
export default async ({ page, shot, args, BASIS }) => {
  await page.goto(BASIS + `/merk/${args[0]}/strategie/plan`, { waitUntil: 'networkidle' });
  if (args[1]) await page.locator('textarea').first().fill(args[1]);
  page.on('response', async (r) => {
    if (r.url().includes('/api/')) console.log('API', r.request().method(), r.status(), r.url(), (await r.text().catch(() => '')).slice(0, 600));
  });
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  const knop = page.getByRole('button', { name: 'Stel het contentplan op' });
  console.log('knop actief:', await knop.isEnabled());
  await knop.click();
  await page.waitForTimeout(8000);
  await page.waitForLoadState('networkidle');
  console.log('URL', page.url());
  await shot('plan-opgesteld');
  const t = await page.locator('main').innerText();
  console.log(t.slice(0, 6000));
};
