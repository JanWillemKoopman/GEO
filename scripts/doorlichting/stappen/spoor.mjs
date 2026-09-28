// args: profielId  uitvoerpad.json   -> haalt alle bladzijden op via de ingelogde sessie
import { writeFileSync } from 'fs';
export default async ({ page, args, BASIS }) => {
  const [id, uit] = args;
  let na = null, alle = [], taken = null, merk = null;
  for (let i = 0; i < 100; i++) {
    const url = `${BASIS}/api/beheer/spoor/${id}?aantal=100${na ? '&na=' + encodeURIComponent(na) : ''}`;
    const r = await page.request.get(url);
    if (!r.ok()) throw new Error(`HTTP ${r.status()} op ${url}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    merk = j.merk; if (j.taken) taken = j.taken;
    alle = alle.concat(j.aanroepen);
    if (!j.volgende) break;
    na = j.volgende;
  }
  writeFileSync(uit, JSON.stringify({ merk, aanroepen: alle, taken }, null, 1));
  const kosten = alle.reduce((s, a) => s + Number(a.cost_usd ?? 0), 0);
  console.log(`${merk?.name}: ${alle.length} aanroepen, ${taken?.length ?? 0} taken, $${kosten.toFixed(3)} -> ${uit}`);
};
