// Akkauntlar bilan bazada ishlash. Boshqa joyda to'g'ridan-to'g'ri baza chaqirilmaydi.
import { sb } from '../core/supabase.js';
import { getState, setState, upsertAccount, dropAccount } from '../core/store.js';

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export async function loadAccounts() {
  try {
    const rows = must(await sb.from('accounts').select('*').order('created_at', { ascending: false }));
    setState({ accounts: rows || [], loaded: true, loadError: false });
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

export const markSold = (id, { price, date, buyer = '', partnerPaid = false }) =>
  updateAccount(id, { status: 'sold', sold_price: price, sold_at: date, buyer, partner_paid: partnerPaid });

export const unsell = (id) =>
  updateAccount(id, { status: 'active', sold_price: null, sold_at: null, partner_paid: false, buyer: '' });

export const setPartnerPaid = (id, paid) => updateAccount(id, { partner_paid: paid });

export const currentAccounts = () => getState().accounts;
