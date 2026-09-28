// args: pad  uitvoerbestand  [schermnaam]
import { writeFileSync } from 'fs';
export default async ({ page, shot, args, BASIS }) => {
  await page.goto(BASIS + args[0], { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  writeFileSync(args[1], await page.locator('main').innerText());
  if (args[2]) await shot(args[2]);
  console.log('ok', args[1]);
};
