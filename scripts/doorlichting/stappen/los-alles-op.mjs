export default async ({ page, shot, args, BASIS }) => {
  page.on('response', async (r) => {
    if (r.url().includes('/api/') && r.request().method() !== 'GET') console.log('API', r.request().method(), r.status(), r.url().replace(BASIS, ''), (await r.text().catch(() => '')).slice(0, 500));
  });
  page.on('dialog', (d) => { console.log('DIALOOG', d.message()); d.accept(); });
  await page.goto(BASIS + args[0], { waitUntil: 'networkidle' });
  await page.getByText(args[1], { exact: false }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  console.log('URL', page.url());
  const knop = page.getByText(/in één keer oplossen/).first();
  console.log('KNOP', await knop.innerText().catch(() => 'niet gevonden'));
  await knop.click();
  await page.waitForTimeout(2500);
  const dlg = page.locator('[role=dialog], dialog').last();
  if (await dlg.count()) {
    console.log('VENSTER', (await dlg.innerText()).slice(0, 1500));
    const b = dlg.getByRole('button', { name: /nieuwe versie schrijven/ }).first();
    console.log('BEVESTIG', await b.innerText()); await b.click();
  }
  await page.waitForTimeout(6000);
  await shot('los-alles-op');
  const t = await page.locator('main').innerText();
  console.log(t.slice(0, 1200));
};
