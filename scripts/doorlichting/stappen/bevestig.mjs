export default async ({ page, shot, args, BASIS }) => {
  await page.goto(BASIS + args[0], { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Bevestig en start/ }).first().click();
  await page.waitForTimeout(1500);
  // Eventuele bevestigingsdialoog
  const dlg = page.getByRole('dialog');
  if (await dlg.count()) {
    console.log('DIALOOG:', (await dlg.innerText()).slice(0, 600));
    await shot('bevestig-dialoog');
    await dlg.getByRole('button').filter({ hasText: /Bevestig|Start|Ja/ }).first().click();
  }
  await page.waitForTimeout(5000);
  console.log('NA:', page.url(), (await page.locator('main').innerText()).slice(0, 500));
  await shot('bevestigd');
};
