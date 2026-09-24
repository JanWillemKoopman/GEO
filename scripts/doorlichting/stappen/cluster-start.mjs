// args: profielId  titel-regex
export default async ({ page, shot, args, BASIS }) => {
  const [id, patroon] = args;
  await page.goto(`${BASIS}/merk/${id}/strategie/clusters`, { waitUntil: 'networkidle' });
  const open = page.getByText('Onderwerpen om op te meten');
  if (await open.count()) { await open.first().click(); await page.waitForTimeout(800); }
  await shot('onderwerpen-' + id.slice(0, 4));
  const tekst = await page.locator('main').innerText();
  console.log(tekst.slice(tekst.indexOf('Onderwerpen om op te meten'), tekst.indexOf('Onderwerpen om op te meten') + 3000));
  if (!patroon) return;
  const re = new RegExp(patroon, 'i');
  // De knop in de kaart van het gekozen onderwerp: het kleinste blok met die titel en precies één startknop.
  const knoppen = page.getByRole('button', { name: 'Cluster starten' });
  let gevonden = -1;
  for (let i = 0; i < (await knoppen.count()); i++) {
    const past = await knoppen.nth(i).evaluate((el, bron) => {
      const re = new RegExp(bron, 'i');
      let n = el.parentElement;
      while (n) {
        const aantal = [...n.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Cluster starten').length;
        if (aantal > 1) return false;
        if (re.test(n.textContent)) return true;
        n = n.parentElement;
      }
      return false;
    }, patroon);
    if (past) { gevonden = i; break; }
  }
  if (gevonden < 0) throw new Error('onderwerp niet gevonden: ' + patroon);
  await knoppen.nth(gevonden).click();
  await page.waitForURL(/\/analyses\/[0-9a-f-]+\/concept/, { timeout: 60000 });
  await page.waitForLoadState('networkidle');
  console.log('ANALYSE', page.url().match(/analyses\/([0-9a-f-]+)/)[1]);
  await shot('cluster-gestart-' + id.slice(0, 4));
};
