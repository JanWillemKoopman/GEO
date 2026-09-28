export default async ({ page, shot, args, BASIS }) => {
  await page.goto(BASIS + (args[0] ?? '/merk'), { waitUntil: 'networkidle' });
  await shot(args[1] ?? 'kijk');
  const tekst = await page.locator('main').innerText().catch(() => page.locator('body').innerText());
  console.log(tekst.slice(0, Number(args[2] ?? 3000)));
};
