// Parol maydonlari + kuch o'lchagich + talablar ro'yxati (yangi parol, ro'yxatdan o'tish, parolni almashtirish uchun).
import { checkPassword } from '../logic/password.js';
import { icon } from './icons.js';

const eye = (extra = '') =>
  `<button type="button" class="eye" data-act="toggle-pw" aria-label="Parolni ko'rsatish / yashirish">${icon('eye', 18)}</button>${extra}`;

export function passwordFieldsHtml({ label = 'Yangi parol', confirm = true } = {}) {
  return `
  <label class="field"><span>${label}</span>
    <div class="input-wrap"><span class="lead">${icon('lock', 18)}</span>
      <input name="password" type="password" autocomplete="new-password" required data-pw-main placeholder="Kamida 10 ta belgi">${eye()}
    </div>
  </label>
  <div class="meter" data-meter data-score="0">
    <div class="meter-bar"><i></i><i></i><i></i><i></i></div><span class="meter-label">Parol kiriting</span>
  </div>
  <ul class="checks" data-checks>${['len', 'lower', 'upper', 'digit', 'sym'].map((id) => `<li data-id="${id}"><span class="dot"></span><span class="t"></span></li>`).join('')}</ul>
  <p class="hint warn" data-warn hidden></p>
  ${
    confirm
      ? `<label class="field"><span>Parolni takrorlang</span>
          <div class="input-wrap"><span class="lead">${icon('lock', 18)}</span>
            <input name="confirm" type="password" autocomplete="new-password" required data-pw-confirm placeholder="Yana bir marta">${eye()}
          </div></label>
        <p class="hint" data-match></p>`
      : ''
  }`;
}

// Forma ichidagi maydonlarni jonlantiradi. Qaytaradi: () => {ok, message}
export function mountPasswordFields(form, getEmail = () => '') {
  const main = form.querySelector('[data-pw-main]');
  const conf = form.querySelector('[data-pw-confirm]');
  const meter = form.querySelector('[data-meter]');
  const label = meter.querySelector('.meter-label');
  const items = [...form.querySelectorAll('[data-checks] li')];
  const warn = form.querySelector('[data-warn]');
  const match = form.querySelector('[data-match]');
  const submit = form.querySelector('[type=submit]');

  const state = () => {
    const r = checkPassword(main.value, getEmail());
    const same = !conf || (conf.value.length > 0 && conf.value === main.value);
    return { r, same, ok: r.valid && same };
  };

  const update = () => {
    const { r, same } = state();
    meter.dataset.score = String(r.score);
    label.textContent = main.value ? r.label : 'Parol kiriting';
    r.checks.forEach((c, i) => {
      items[i].classList.toggle('ok', c.ok);
      items[i].querySelector('.t').textContent = c.label;
    });
    warn.hidden = r.warnings.length === 0;
    warn.textContent = r.warnings.join(' · ');
    if (match) {
      if (!conf.value) match.textContent = '';
      else {
        match.textContent = same ? '✓ Parollar bir xil' : '✗ Parollar bir xil emas';
        match.className = `hint ${same ? 'ok' : 'bad'}`;
      }
    }
    if (submit) submit.disabled = !state().ok;
  };

  form.addEventListener('input', update);
  update();
  return () => {
    const s = state();
    if (!s.r.valid) return { ok: false, message: 'Parol talablarga javob bermaydi' };
    if (!s.same) return { ok: false, message: 'Parollar bir xil emas' };
    return { ok: true };
  };
}
