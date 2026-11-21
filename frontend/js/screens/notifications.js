// Bildirishnomalar oynasi (qo'ng'iroqcha). Yangi versiya bo'lsa "Yangilash" tugmasi shu yerda chiqadi.
import { esc } from '../core/dom.js';
import { getState } from '../core/store.js';
import { registerActions } from '../core/actions.js';
import { icon } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { readSet, markRead } from '../logic/notifications.js';
import { currentNotes, paintBell, setTab } from './shell.js';
import { applyUpdate, checkUpdate } from '../services/update.service.js';
import { toast } from '../ui/toast.js';
import { agoUz } from '../core/format.js';

const LEVEL_ICON = { bad: 'alert', warn: 'alert', info: 'info', good: 'trend' };

function html() {
  const st = getState();
  const notes = currentNotes();
  const seen = readSet(st.user.id);
  if (!notes.length) {
    return `<div class="empty"><div class="empty-ic">${icon('bell', 34)}</div><h3>Yangi xabar yo'q</h3><p class="muted">Eslatmalar va yangiliklar shu yerda paydo bo'ladi.</p></div>
    <button type="button" class="btn ghost block" data-act="check-update">${icon('refresh', 18)} Yangilanishni tekshirish</button>`;
  }
  return `<div class="notes-list">${notes
    .map(
      (n) => `
    <article class="note ${n.level} ${seen.has(n.id) ? '' : 'new'}">
      <span class="note-ic">${icon(LEVEL_ICON[n.level] || 'info', 18)}</span>
      <div class="note-tx"><b>${esc(n.title)}</b><p>${esc(n.text)}</p>
        ${n.kind === 'update' ? `<button type="button" class="btn sm" data-act="apply-update">${icon('refresh', 16)} Yangilash</button>` : ''}
        ${n.kind === 'profile' ? '<button type="button" class="btn sm ghost" data-act="note-profile">Profilni ochish</button>' : ''}
        ${n.accId ? `<button type="button" class="btn sm ghost" data-act="note-open" data-id="${esc(n.accId)}">${esc(n.cta || 'Ochish')}</button>` : ''}
      </div>
    </article>`,
    )
    .join('')}</div>
  <button type="button" class="btn ghost block mt" data-act="refresh-all">${icon('refresh', 18)} Ma'lumotlarni yangilash</button>`;
}

export function openNotifications() {
  const st = getState();
  const ctl = openSheet({ title: 'Bildirishnomalar', size: 'full', html: html() });
  // ochilishi bilan o'qilgan deb belgilanadi (bu oynada "yangi" belgisi saqlanib turadi)
  markRead(st.user.id, currentNotes().map((n) => n.id));
  paintBell();
  return ctl;
}

registerActions({
  'open-notes': () => openNotifications(),
  'apply-update': () => applyUpdate(),
  'check-update': async () => {
    await checkUpdate();
    if (getState().update) toast('Yangi versiya topildi');
    else toast("Sizda eng so'nggi versiya ✅");
  },
  'refresh-all': async (el) => {
    el.disabled = true;
    await checkUpdate();
    const { loadAccounts } = await import('../services/accounts.service.js');
    try {
      await loadAccounts();
      toast('Yangilandi ✅');
    } catch {
      toast("Yangilab bo'lmadi. Internetni tekshiring.", { type: 'error' });
    }
    el.disabled = false;
    const { renderTab } = await import('./shell.js');
    renderTab();
    paintBell();
  },
  'note-profile': async () => {
    const { closeTop } = await import('../core/router.js');
    closeTop();
    setTimeout(async () => (await import('./profile.js')).openProfile(), 260);
  },
  'note-open': async (el) => {
    const { closeTop } = await import('../core/router.js');
    closeTop();
    setTimeout(async () => (await import('./account-detail.js')).openAccount(el.dataset.id), 260);
  },
});
export { agoUz };
