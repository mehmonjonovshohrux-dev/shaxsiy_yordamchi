// Muhim amal (masalan parolni ko'rish) oldidan PIN so'raydi. PIN yoqilmagan bo'lsa, ruxsat beradi.
import { getState } from '../core/store.js';
import { openSheet } from './sheet.js';
import { toast } from './toast.js';
import { closeTop } from '../core/router.js';
import { pinPadHtml, mountPinPad } from './pinpad.js';
import * as lock from '../services/lock.service.js';
import { signOut } from '../services/auth.service.js';

let lastOk = 0;
const GRACE_MS = 2 * 60 * 1000; // 2 daqiqa ichida qayta so'ramaydi

export function requirePin(title = 'PIN-kodni kiriting') {
  const uid = getState().user.id;
  if (!lock.isEnabled(uid)) return Promise.resolve(true);
  if (Date.now() - lastOk < GRACE_MS) return Promise.resolve(true);
  return new Promise((resolve) => {
    let ok = false;
    const ctl = openSheet({
      title,
      size: 'md',
      html: `<p class="muted center-t">Bu ma'lumot himoyalangan</p>${pinPadHtml()}`,
      onClose: () => resolve(ok),
    });
    mountPinPad(ctl.body, {
      onComplete: async (pin, api) => {
        const r = await lock.verifyPin(uid, pin);
        if (r.ok) {
          ok = true;
          lastOk = Date.now();
          return closeTop();
        }
        api.reset();
        api.shake();
        if (r.exhausted) {
          lock.clearLock(uid);
          await signOut();
          toast("Juda ko'p xato urinish. Parol bilan qayta kiring.", { type: 'error' });
          setTimeout(() => location.reload(), 900);
          return;
        }
        api.message(`PIN noto'g'ri. Qolgan urinish: ${r.left}`, true);
      },
    });
  });
}
