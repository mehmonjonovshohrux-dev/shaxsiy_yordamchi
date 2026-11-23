// Muddatli to'lov: to'lovlar (payments) bilan ishlash va reja (accounts.inst_*) ni saqlash.
import { sb } from '../core/supabase.js';
import { getState, setState } from '../core/store.js';
import { updateAccount } from './accounts.service.js';

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const missingTable = (e) => {
  const m = `${e?.code || ''} ${e?.message || ''}`.toLowerCase();
  return m.includes('42p01') || m.includes('pgrst205') || m.includes('schema cache') || m.includes('does not exist');
};

// accounts yuklangach chaqiriladi. Jadval yo'q bo'lsa: muddatli to'lov yashirinadi (instReady=false)
export async function loadPayments() {
  const { data, error } = await sb.from('payments').select('*').order('paid_at', { ascending: true });
  if (error) {
    setState({ payments: [], instReady: !missingTable(error) ? getState().instReady : false });
    if (!missingTable(error)) console.warn('payments:', error);
    return;
  }
  setState({ payments: data || [], instReady: true });
}

export async function addPayment(accountId, { amount, date, note = '' }) {
  const row = must(await sb.from('payments').insert({ account_id: accountId, amount, paid_at: date, note }).select().single());
  setState({ payments: [...getState().payments, row] });
  return row;
}

export async function removePayment(id) {
  must(await sb.from('payments').delete().eq('id', id));
  setState({ payments: getState().payments.filter((p) => p.id !== id) });
}

export const savePlan = (accountId, { start, end, parts }) => updateAccount(accountId, { inst_on: true, inst_start: start, inst_end: end, inst_parts: parts });
export const clearPlan = (accountId) => updateAccount(accountId, { inst_on: false });
