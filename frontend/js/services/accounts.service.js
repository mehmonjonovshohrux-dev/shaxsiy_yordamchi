// Akkauntlar bilan bazada ishlash. Boshqa joyda to'g'ridan-to'g'ri baza chaqirilmaydi.
import { sb } from '../core/supabase.js';
import { getState, setState, upsertAccount, dropAccount } from '../core/store.js';
import { loadPayments } from './payments.service.js';

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export async function loadAccounts() {
  try {
    const rows = must(await sb.from('accounts').select('*').order('created_at', { ascending: false }));
    setState({ accounts: rows || [], loaded: true, loadError: false });
    await loadPayments();
  } catch (e) {
    console.error(e);
    setState({ loaded: true, loadError: true });
    throw e;
  }
}

export async function createAccount(row) {
  const saved = must(await sb.from('accounts').insert(row).select().single());
  upsertAccount(saved);
  return saved;
}

export async function updateAccount(id, patch) {
  const saved = must(await sb.from('accounts').update(patch).eq('id', id).select().single());
  upsertAccount(saved);
  return saved;
}

export async function deleteAccount(id) {
  must(await sb.from('accounts').delete().eq('id', id));
  dropAccount(id);
}

export async function markSold(id, { price, date, buyer = '', partnerPaid = false, inst = null }) {
  const base = { status: 'sold', sold_price: price, sold_at: date, partner_paid: partnerPaid };
  if (inst === false) Object.assign(base, { inst_on: false });
  else if (inst) Object.assign(base, { inst_on: true, inst_start: inst.start, inst_end: inst.end, inst_parts: inst.parts });
  try {
    return await updateAccount(id, { ...base, buyer });
  } catch (e) {
    // Bazada «buyer» ustuni yo'q (eski 001) bo'lsa: xaridorsiz saqlaymiz, foydalanuvchiga 001 ni qayta ishga tushirish aytiladi
    if (/buyer/i.test(String(e?.message || ''))) {
      const saved = await updateAccount(id, base);
      saved._buyerSkipped = true;
      return saved;
    }
    throw e;
  }
}

export const unsell = (id) =>
  updateAccount(id, { status: 'active', sold_price: null, sold_at: null, partner_paid: false, buyer: '', ...(getState().instReady ? { inst_on: false } : {}) });

export const setPartnerPaid = (id, paid) => updateAccount(id, { partner_paid: paid });

export const currentAccounts = () => getState().accounts;
