// args: naam | url | alias1;alias2
export default async ({ page, shot, args, BASIS }) => {
  const [naam, url, aliassen] = args;
  await page.goto(BASIS + '/merk/nieuw', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('bijv. MediaMarkt').fill(naam);
  await page.getByPlaceholder('mediamarkt.nl').fill(url);
  await page.getByPlaceholder('mediamarkt.nl').blur();
  for (const a of (aliassen ?? '').split(';').filter(Boolean)) {
    const veld = page.getByPlaceholder('bijv. afkorting of merknaam-variant…');
    await veld.fill(a);
    await veld.press('Enter');
  }
  await shot('merk-ingevuld-' + naam.split(' ')[0]);
  await page.getByRole('button', { name: 'Start het onderzoek' }).click();
  await page.waitForURL(/\/merk\/[0-9a-f-]+\/admin\/0-meting/, { timeout: 60000 });
  await page.waitForLoadState('networkidle');
  console.log('PROFIEL', page.url().match(/merk\/([0-9a-f-]+)/)[1]);
  await shot('merk-gestart-' + naam.split(' ')[0]);
};
