// Umumiy kiritish maydonlari: pul formati, parolni ko'rsatish.
import { registerActions, registerInputs } from '../core/actions.js';
import { group } from '../core/format.js';
import { icon } from './icons.js';

registerInputs({
  // data-input="money": 1250000 -> "1 250 000"
  money: (el) => {
    const digits = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
    el.value = digits ? group(Number(digits), ' ') : '';
  },
  // data-input="digits": faqat raqam (kodlar uchun)
  digits: (el) => {
    el.value = el.value.replace(/\D/g, '').slice(0, 10);
  },
});

registerActions({
  'toggle-pw': (btn) => {
    const input = btn.closest('.input-wrap').querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = icon(show ? 'eyeoff' : 'eye', 18);
  },
});
