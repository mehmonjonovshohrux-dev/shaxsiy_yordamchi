// Ilovaning yagona holati (state). Boshqa modullar shu yerdan o'qiydi.
const state = {
  user: null,
  accounts: [],
  payments: [], // muddatli to'lovlar
  weeklyReady: true, // false: bazada 008 ishga tushirilmagan (haftalik rejim yashiriladi)
  devices: [],
  devicesReady: true, // false: bazada 009 ishga tushirilmagan
  instReady: true, // false: bazada 006 ishga tushirilmagan
  loaded: false,
  loadError: false,
  tab: 'home',
  sort: 'new', // new | old | price | profit
  query: '',
  period: 'month', // month | prev | 3m | year | all
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  locked: false,
  mfaEnforced: null, // serverda 2FA majburiymi (null: hali bilinmaydi)
  update: null, // { version } — yangi versiya bor bo'lsa
};

const subs = new Set();
export const getState = () => state;
export function setState(patch) {
  Object.assign(state, patch);
  subs.forEach((fn) => fn(state));
}
export const subscribe = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

export const findAccount = (id) => state.accounts.find((a) => a.id === id);

export function upsertAccount(row) {
  const i = state.accounts.findIndex((a) => a.id === row.id);
  if (i >= 0) state.accounts[i] = row;
  else state.accounts.unshift(row);
}
export function dropAccount(id) {
  state.accounts = state.accounts.filter((a) => a.id !== id);
}
