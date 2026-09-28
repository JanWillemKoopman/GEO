// Gebruik: node wacht-taken.mjs <type> <minuten>. Wacht tot er geen taken van dit type meer queued/running zijn voor de drie merken.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
const envPad = new URL('../../.env.local', import.meta.url);
const env = {
  ...(existsSync(envPad) ? Object.fromEntries(readFileSync(envPad, 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2))) : {}),
  ...process.env,
};
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const merken = ['f14e89ab-6db2-41ea-8bbc-0827d6025470', 'ca8313fb-3c2e-4b37-9985-0f8be8dc6e8b', '467f8307-74dd-4e84-b443-40cc1ce88f9e'];
const [type, minuten] = [process.argv[2], Number(process.argv[3] ?? 30)];
const eind = Date.now() + minuten * 60000;
let vorige = '';
while (Date.now() < eind) {
  const { data } = await db.from('jobs').select('status, profile_id').eq('type', type).in('profile_id', merken).gte('created_at', new Date(Date.now() - 6 * 3600000).toISOString());
  const t = {};
  for (const r of data ?? []) t[r.status] = (t[r.status] ?? 0) + 1;
  const s = JSON.stringify(t);
  if (s !== vorige) { console.log(new Date().toISOString().slice(11, 16), s); vorige = s; }
  if (!t.queued && !t.running && (data ?? []).length > 0) break;
  await new Promise((r) => setTimeout(r, 30000));
}
