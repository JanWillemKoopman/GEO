// args: profielId  pad-naar-json   ; JSON: [{key, kind, value}] ; kind: lijst|tekst|lange-tekst|keuze
import { readFileSync } from 'fs';
export default async ({ page, shot, args, BASIS }) => {
  const [id, pad] = args;
  const velden = JSON.parse(readFileSync(pad, 'utf8'));
  await page.goto(`${BASIS}/merk/${id}/admin/onboarding`, { waitUntil: 'networkidle' });
  await shot('gesprek-voor');
  const log = [];
  for (const v of velden) {
    if (v.key === '__strategie') {
      const ta = page.getByPlaceholder(/Wat wil de klant bereiken/);
      await ta.scrollIntoViewIfNeeded();
      await ta.fill(v.value);
      await shot('gesprek-strategie');
      await page.getByRole('button', { name: /Gesprek vastleggen/ }).click();
      await page.waitForTimeout(4000);
      const melding = await page.locator('text=/Opgeslagen|niet gelukt/').first().innerText().catch(() => 'geen melding');
      log.push(`GESPREK VASTGELEGD: ${melding}`);
      continue;
    }
    let box = page.locator(`#veld-anker-${v.key}`);
    if (!(await box.count())) {
      // Een compleet blok klapt vanzelf dicht: openklappen zoals een consultant dat doet.
      const knoppen = page.getByRole('button', { name: /van de \d+ ingevuld/ });
      for (let i = 0; i < (await knoppen.count()); i++) {
        const k = knoppen.nth(i);
        if ((await k.getAttribute('aria-expanded')) === 'false') { await k.click(); await page.waitForTimeout(300); }
      }
      box = page.locator(`#veld-anker-${v.key}`);
      if (!(await box.count())) { log.push(`${v.key}: VELD NIET GEVONDEN`); continue; }
      log.push(`${v.key}: gevonden na openklappen van een compleet blok`);
    }
    await box.scrollIntoViewIfNeeded();
    for (const weg of v.remove ?? []) {
      const knop = box.getByRole('button', { name: `Verwijder ${weg}` });
      if (await knop.count()) { await knop.first().click(); await page.waitForTimeout(900); log.push(`${v.key}: verwijderd "${weg}"`); }
    }
    if (v.kind === 'lijst') {
      const bestaand = (await box.locator('span.chip').allInnerTexts()).map((t) => t.replace(/×$/, '').trim());
      for (const item of v.value) {
        if (bestaand.includes(item)) continue;
        const inp = box.locator('input[type=text]').last();
        await inp.fill(item);
        await inp.press('Enter');
        await page.waitForTimeout(700);
      }
    } else if (v.kind === 'keuze') {
      const knop = box.getByRole('radio').filter({ hasText: v.value }).first();
      if ((await knop.getAttribute('aria-checked')) !== 'true') await knop.click();
      await page.waitForTimeout(700);
    } else {
      const inp = box.locator(v.kind === 'lange-tekst' ? 'textarea' : 'input.field').first();
      await inp.fill(v.value);
      await inp.blur();
      await page.waitForTimeout(700);
    }
    // Stand van het opslaan aflezen, zoals een consultant hem ziet.
    await page.waitForTimeout(800);
    const stand = (await box.locator('.chip-success, .chip-neutral').allInnerTexts()).join(',');
    const mislukt = await box.getByText('Dit veld is niet opgeslagen').count();
    log.push(`${v.key}: ${mislukt ? 'MISLUKT' : stand || 'geen chip'}`);
  }
  console.log(log.join('\n'));
  await page.reload({ waitUntil: 'networkidle' });
  await shot('gesprek-na');
};
