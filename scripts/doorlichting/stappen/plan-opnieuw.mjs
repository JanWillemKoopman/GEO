// Gebruik: plan-opnieuw.mjs <merkId> [opmerking]
export default async ({ page, shot, args, BASIS }) => {
  page.on('response', async (r) => {
    if (r.url().includes('/api/') && r.request().method() !== 'GET') console.log('API', r.request().method(), r.status(), r.url(), (await r.text().catch(() => '')).slice(0, 400));
  });
  page.on('dialog', (d) => { console.log('DIALOOG', d.message()); d.accept(); });
  await page.goto(BASIS + `/merk/${args[0]}/strategie/plan`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Opnieuw opzetten' }).click();
  await page.waitForTimeout(1500);
  await shot('opnieuw-opzetten-dialoog');
  const dlg = page.locator('[role=dialog], dialog').last();
  console.log('DIALOOG-TEKST:', (await dlg.innerText().catch(() => '?')).slice(0, 1500));
  const ta = dlg.locator('textarea');
  if (args[1] && (await ta.count()) > 0) await ta.first().fill(args[1]);
  await dlg.getByRole('button', { name: 'Opnieuw opzetten' }).click();
  await page.waitForTimeout(9000);
  await page.waitForLoadState('networkidle');
  await shot('plan-opnieuw-klaar');
};
