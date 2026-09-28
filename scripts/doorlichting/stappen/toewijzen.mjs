// args: profielId  e-mail-klant
export default async ({ page, shot, args, BASIS }) => {
  const [id, email] = args;
  await page.goto(`${BASIS}/merk/${id}/admin/toewijzen`, { waitUntil: 'networkidle' });
  await shot('toewijzen-voor-' + id.slice(0, 4));
  const sel = page.locator('select').first();
  await sel.waitFor();
  await page.waitForFunction(() => document.querySelectorAll('select option').length > 1, null, { timeout: 20000 });
  const opties = await sel.locator('option').allInnerTexts();
  const keuze = opties.find((o) => o.includes(email));
  if (!keuze) throw new Error('klant niet in de lijst: ' + opties.join(' | '));
  await sel.selectOption({ label: keuze });
  const knop = page.getByRole('button', { name: 'Toewijzen', exact: true });
  console.log('knop:', await knop.innerText());
  await knop.click();
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: 'networkidle' });
  console.log((await page.locator('main').innerText()).slice(0, 1500));
  await shot('toewijzen-na-' + id.slice(0, 4));
};
