// Gebruik: patch.mjs <api-pad> <json-body>. Een PATCH via dezelfde route als het scherm, als consultant.
export default async ({ page, args, BASIS }) => {
  const r = await page.request.patch(BASIS + args[0], { data: JSON.parse(args[1]), timeout: 120000 });
  console.log(r.status(), (await r.text()).slice(0, 500));
};
