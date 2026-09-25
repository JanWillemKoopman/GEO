// Gebruik: post.mjs <api-pad> <json-body>. Een POST via dezelfde route als het scherm.
export default async ({ page, args, BASIS }) => {
  const r = await page.request.post(BASIS + args[0], { data: JSON.parse(args[1]), timeout: 180000 });
  console.log(r.status(), (await r.text()).slice(0, 800));
};
