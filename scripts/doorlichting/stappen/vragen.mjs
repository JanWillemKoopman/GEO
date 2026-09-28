import { writeFileSync } from 'fs';
export default async ({ page, args, BASIS }) => {
  await page.goto(BASIS + args[0], { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const vragen = await page.locator('textarea').evaluateAll((els) => els.map((e) => e.value).filter((v) => v.trim().endsWith('?') || v.length > 30));
  writeFileSync(args[1], vragen.map((v, i) => `${i + 1}. ${v}`).join('\n'));
  console.log(vragen.length, 'vragen');
};
