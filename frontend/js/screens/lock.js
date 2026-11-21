// Qulf ekrani (PIN / barmoq izi) va "qachon qulflash" nazorati.
import { $ } from '../core/dom.js';
import { setState } from '../core/store.js';
import { registerActions } from '../core/actions.js';
import { logo } from '../ui/brand.js';
import { toast } from '../ui/toast.js';
import { pinPadHtml, mountPinPad } from '../ui/pinpad.js';
import * as lock from '../services/lock.service.js';
import { signOut } from '../services/auth.service.js';

let showing = false;
let current = null;

export function showLock({ uid, onUnlock }) {
  if (showing) return;
  showing = true;
  current = uid;
  setState({ locked: true });
  const el = $('#lock');
  const bioOn = lock.bioEnabled(uid);
  el.hidden = false;
  el.innerHTML = `
    <div class="lock-screen" role="dialog" aria-modal="true" aria-label="Ilova qulflangan">
      ${logo(60)}
      <h1>AccSavdo</h1>
      <p class="muted">PIN-kodni kiriting</p>
      ${pinPadHtml({ bio: bioOn })}
      <button type="button" class="link-btn" data-act="lock-forgot">PIN esdan chiqdimi? Parol bilan kirish</button>
    </div>`;
  document.body.classList.add('is-locked');

  const done = () => {
    showing = false;
    el.hidden = true;
    el.innerHTML = '';
    document.body.classList.remove('is-locked');
    setState({ locked: false });
    if (onUnlock) onUnlock();
  };
  const tryBio = async () => {
    if (await lock.bioUnlock(uid)) done();
  };

  mountPinPad(el, {
    onBio: tryBio,
    onComplete: async (pin, api) => {
      const r = await lock.verifyPin(uid, pin);
      if (r.ok) return done();
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
  if (bioOn) setTimeout(tryBio, 350);
}

export const isShowing = () => showing;

// Ilova fonga o'tib qaytganda (yoki yopilib-ochilganda) qulflash
export function watchVisibility({ getUser, onLock }) {
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    const u = getUser();
    if (!u || !lock.isEnabled(u.id)) return;
    if (document.hidden) {
      hiddenAt = Date.now();
      if (lock.lockAfter(u.id) === 0) onLock(); // "darhol" rejimi: ilovalar ro'yxatida ham ko'rinmasin
    } else if (hiddenAt && Date.now() - hiddenAt >= lock.lockAfter(u.id)) {
      onLock();
    }
  });
}

registerActions({
  'lock-forgot': async () => {
    if (current) lock.clearLock(current);
    await signOut();
    location.reload();
  },
});
