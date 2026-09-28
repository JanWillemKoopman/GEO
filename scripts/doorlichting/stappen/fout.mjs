export default async ({ page, shot, args, BASIS }) => {
  await page.goto(BASIS + args[0], { waitUntil: 'networkidle' });
  const d = page.getByText('TECHNISCHE DETAILS', { exact: false });
  if (await d.count()) { await d.first().click(); await page.waitForTimeout(500); }
  console.log((await page.locator('body').innerText()).slice(0, 2500));
  await shot(args[1] ?? 'fout');
};
