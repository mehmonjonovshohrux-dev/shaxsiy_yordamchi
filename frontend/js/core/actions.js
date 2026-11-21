// Markaziy hodisa tizimi: HTML da  data-act="nom"  /  data-form="nom"  /  data-input="nom"
// Har bir ekran o'z amallarini registerActions/registerForms/registerInputs bilan qo'shadi.
import { toast } from '../ui/toast.js';

const acts = new Map();
const forms = new Map();
const inputs = new Map();

export const registerActions = (o) => Object.entries(o).forEach(([k, v]) => acts.set(k, v));
export const registerForms = (o) => Object.entries(o).forEach(([k, v]) => forms.set(k, v));
export const registerInputs = (o) => Object.entries(o).forEach(([k, v]) => inputs.set(k, v));

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = acts.get(el.dataset.act);
  if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  try {
    await fn(el, e);
  } catch (err) {
    console.error(err);
    toast('Kutilmagan xatolik. Qayta urinib ko\'ring.', { type: 'error' });
  }
});

// Klaviatura: role="button" elementlarda Enter/Space
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest?.('[data-act][role="button"]');
  if (el) {
    e.preventDefault();
    el.click();
  }
});

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const fn = forms.get(form.dataset.form);
  if (!fn) return;
  try {
    await fn(form, new FormData(form));
  } catch (err) {
    console.error(err);
    toast('Kutilmagan xatolik. Qayta urinib ko\'ring.', { type: 'error' });
  }
});

document.addEventListener('input', (e) => {
  const el = e.target.closest?.('[data-input]');
  if (!el) return;
  const fn = inputs.get(el.dataset.input);
  if (fn) fn(el, e);
});

document.addEventListener('change', (e) => {
  const el = e.target.closest?.('[data-change]');
  if (!el) return;
  const fn = inputs.get(el.dataset.change);
  if (fn) fn(el, e);
});

// Boshqa joydan amalni nomi bilan ishga tushirish
export const trigger = (name, el = document.body) => acts.get(name)?.(el);
