export default async ({ page, args, BASIS }) => {
  await page.goto(BASIS + args[0], { waitUntil: 'networkidle' });
  const k = await page.locator('button').evaluateAll((bs) => bs.map((b) => b.innerText.trim()).filter(Boolean));
  console.log(k.join(' | '));
};
