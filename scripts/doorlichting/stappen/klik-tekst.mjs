// Gebruik: klik-tekst.mjs <startpad> <tekst om op te klikken> <naam> [maxTekens]
export default async ({ page, shot, args, BASIS }) => {
  await page.goto(BASIS + args[0], { waitUntil: 'networkidle' });
  await page.getByText(args[1], { exact: false }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  console.log('URL', page.url());
  await shot(args[2]);
  const tekst = await page.locator('main').innerText().catch(() => page.locator('body').innerText());
  console.log(tekst.slice(0, Number(args[3] ?? 6000)));
};
