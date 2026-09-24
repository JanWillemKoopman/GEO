// Gebruik: herschrijf.mjs <bibliotheekpad> <paginatitel> <instructie>
export default async ({ page, shot, args, BASIS }) => {
  page.on('response', async (r) => {
    if (r.url().includes('/api/') && r.request().method() !== 'GET') console.log('API', r.request().method(), r.status(), r.url().replace(BASIS, ''), (await r.text().catch(() => '')).slice(0, 400));
  });
  await page.goto(BASIS + args[0], { waitUntil: 'networkidle' });
  await page.getByText(args[1], { exact: false }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  const veld = page.locator('textarea').filter({ hasNot: page.locator('[disabled]') });
  console.log('tekstvelden', await veld.count());
  const doel = page.getByLabel(/wat moet er anders/i);
  const ta = (await doel.count()) ? doel.first() : veld.last();
  await ta.fill(args[2]);
  await page.getByRole('button', { name: 'Schrijf een nieuwe versie' }).click();
  await page.waitForTimeout(5000);
  await shot('herschrijf');
};
