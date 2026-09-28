export default async ({ page, shot, args, BASIS }) => {
  page.on('response', async (r) => {
    if (r.url().includes('/api/') && r.request().method() !== 'GET') console.log('API', r.request().method(), r.status(), r.url().replace(BASIS, ''), (await r.text().catch(() => '')).slice(0, 400));
  });
  await page.goto(BASIS + `/merk/${args[0]}/strategie/plan`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Vrijgeven', exact: true }).first().click();
  await page.waitForTimeout(1500);
  const dlg = page.locator('[role=dialog], dialog').last();
  if (await dlg.count()) {
    console.log('DIALOOG:', (await dlg.innerText().catch(() => '')).slice(0, 1200));
    const bevestig = dlg.getByRole('button').filter({ hasNotText: 'Annuleren' }).last();
    console.log('BEVESTIG-KNOP:', await bevestig.innerText());
    await bevestig.click();
  }
  await page.waitForTimeout(6000);
  await page.waitForLoadState('networkidle');
  await shot('vrijgegeven');
};
