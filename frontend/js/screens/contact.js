// Admin bilan bog'lanish: Telegram va telefon (bosilsa tanlov chiqadi)
import { CONFIG } from '../config.js';
import { registerActions } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { formatLocal, localDigits } from '../logic/phone.js';

const PHONE_PRETTY = formatLocal(localDigits(CONFIG.ADMIN_PHONE));
const TG_URL = `https://t.me/${CONFIG.ADMIN_TG}`;

async function copy(text, msg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    toast("Nusxalab bo'lmadi", { type: 'error' });
  }
}

export function openContact() {
  openSheet({
    title: 'Admin bilan bog\'lanish',
    size: 'md',
    html: `
    <p class="muted small mb">Savol, taklif yoki muammo bo'lsa, adminga yozing. Odatda tez javob beriladi.</p>
    <div class="card list">
      <div class="set-row tap" role="button" tabindex="0" data-act="contact-tg">
        <span class="set-ic">${icon('send', 20)}</span>
        <span class="set-tx"><b>Telegram</b><small>@${CONFIG.ADMIN_TG}</small></span>
        <span class="set-right">${icon('right', 18)}</span>
      </div>
      <div class="set-row tap" role="button" tabindex="0" data-act="contact-phone">
        <span class="set-ic">${icon('phonecall', 20)}</span>
        <span class="set-tx"><b>Telefon</b><small>${PHONE_PRETTY}</small></span>
        <span class="set-right">${icon('right', 18)}</span>
      </div>
    </div>`,
  });
}

function openChoice(title, rows) {
  const ctl = openSheet({
    title,
    size: 'sm',
    html: `<div class="choice">${rows.map((r) => (r.href ? `<a class="btn ghost block" href="${r.href}" ${r.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${icon(r.ic, 18)} ${r.label}</a>` : `<button type="button" class="btn ghost block" data-copy="${r.copy}" data-msg="${r.msg}">${icon('copy', 18)} ${r.label}</button>`)).join('')}</div>`,
  });
  ctl.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (b) copy(b.dataset.copy, b.dataset.msg);
  });
}

registerActions({
  'open-contact': () => openContact(),
  'contact-tg': () =>
    openChoice(`Telegram: @${CONFIG.ADMIN_TG}`, [
      { href: TG_URL, ic: 'send', label: 'Telegramda ochish' },
      { copy: `@${CONFIG.ADMIN_TG}`, msg: 'Username nusxalandi', label: 'Username nusxalash' },
    ]),
  'contact-phone': () =>
    openChoice(`Telefon: ${PHONE_PRETTY}`, [
      { href: `tel:${CONFIG.ADMIN_PHONE}`, ic: 'phonecall', label: "Qo'ng'iroq qilish" },
      { href: `sms:${CONFIG.ADMIN_PHONE}`, ic: 'chat', label: 'SMS yozish' },
      { copy: CONFIG.ADMIN_PHONE, msg: 'Raqam nusxalandi', label: 'Raqamni nusxalash' },
    ]),
});
