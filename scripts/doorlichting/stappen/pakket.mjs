export default async ({ page, shot, args, BASIS }) => {
  await page.goto(BASIS + `/merk/${args[0]}/admin/toewijzen`, { waitUntil: 'networkidle' });
  const select = page.locator('select').filter({ has: page.locator('option', { hasText: "10 pagina's per maand" }) });
  await select.selectOption({ label: `${args[1]} pagina's per maand` });
  await page.getByRole('button', { name: 'Afspraak opslaan' }).click();
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle');
  await shot('pakket-opgeslagen');
  const t = await page.locator('main').innerText();
  console.log(t.slice(t.indexOf('Verkoopafspraak'), t.indexOf('Verkoopafspraak') + 700));
};
