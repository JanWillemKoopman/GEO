export default async ({ page, args, BASIS }) => {
  await page.goto(BASIS + args[0], { waitUntil: 'networkidle' });
  const links = await page.locator('a').evaluateAll((as) => as.map((a) => `${a.innerText.trim().slice(0, 50)} -> ${a.getAttribute('href')}`));
  console.log(links.join('\n'));
};
