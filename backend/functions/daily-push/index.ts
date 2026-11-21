// Supabase Edge Function: har kuni foydalanuvchilarga kunlik hisobot / eslatma yuboradi (Web Push).
// Ishga tushirish: backend/PUSH.md. Himoya: faqat to'g'ri `x-cron-secret` sarlavhasi bilan chaqiriladi.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const need = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`${k} o'rnatilmagan`);
  return v;
};
const som = (n: number) => `${n < 0 ? '−' : ''}${String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;
const DAY = 864e5;

type Acc = { kind: string; status: string; buy_price: number; est_price: number; sold_price: number | null; sold_at: string | null; created_at: string; partner_paid: boolean; title: string };

// Hisob-kitob frontend/js/logic/finance.js bilan bir xil: 50/50 da foydaning yarmi (pastga yaxlitlab) sizga
function my(a: Acc) {
  const price = a.status === 'sold' ? (a.sold_price ?? 0) : a.est_price;
  const base = price - a.buy_price;
  return a.kind === 'partner' ? Math.floor(base / 2) : base;
}
function partnerShare(a: Acc) {
  const price = a.status === 'sold' ? (a.sold_price ?? 0) : a.est_price;
  const base = price - a.buy_price;
  return base - Math.floor(base / 2);
}

function build(accs: Acc[], prefs: { daily?: boolean; tips?: boolean }) {
  const now = Date.now();
  const active = accs.filter((a) => a.status === 'active');
  const ym = new Date().toISOString().slice(0, 7);
  const monthSold = accs.filter((a) => a.status === 'sold' && (a.sold_at || '').startsWith(ym));
  const monthProfit = monthSold.reduce((s, a) => s + my(a), 0);
  const est = active.reduce((s, a) => s + my(a), 0);
  const stale = active.filter((a) => (now - new Date(a.created_at).getTime()) / DAY >= 14);
  const unpaid = accs.filter((a) => a.kind === 'partner' && a.status === 'sold' && !a.partner_paid && partnerShare(a) > 0);
  const unpaidSum = unpaid.reduce((s, a) => s + partnerShare(a), 0);

  if (prefs.tips !== false && unpaidSum > 0) return { title: 'Sherik bilan hisob-kitob', body: `Sherik(lar)ga ${som(unpaidSum)} to'lash qoldi (${unpaid.length} ta akkaunt).` };
  if (prefs.tips !== false && stale.length > 0) return { title: 'Diqqat!', body: `${stale.length} ta akkaunt 14 kundan beri sotilmayapti. Narxni ko'rib chiqing.` };
  if (prefs.daily !== false && accs.length > 0) {
    return { title: 'Kunlik hisobot', body: `Sotuvda ${active.length} ta akkaunt, kutilayotgan foyda ${som(est)}. Bu oy ${monthSold.length} ta sotuv, foyda ${som(monthProfit)}.` };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== need('CRON_SECRET')) return new Response('forbidden', { status: 403 });
  webpush.setVapidDetails(need('VAPID_SUBJECT'), need('VAPID_PUBLIC_KEY'), need('VAPID_PRIVATE_KEY'));
  const db = createClient(need('SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

  const { data: subs, error } = await db.from('push_subscriptions').select('*');
  if (error) return new Response(error.message, { status: 500 });

  const byUser = new Map<string, typeof subs>();
  for (const s of subs || []) byUser.set(s.user_id, [...(byUser.get(s.user_id) || []), s]);

  let sent = 0, removed = 0, failed = 0;
  for (const [uid, list] of byUser) {
    const { data: accs } = await db.from('accounts').select('kind,status,buy_price,est_price,sold_price,sold_at,created_at,partner_paid,title').eq('user_id', uid);
    for (const s of list) {
      const msg = build((accs || []) as Acc[], s.prefs || {});
      if (!msg) continue;
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...msg, tag: 'daily', url: './' }));
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
          removed++;
        } else failed++;
      }
    }
  }
  return Response.json({ sent, removed, failed });
});
