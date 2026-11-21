// "Orqaga" tugmasi (Android / brauzer) boshqaruvi.
//
// Qoida:
//  - ochiq oyna/varaq (sheet) bo'lsa: orqaga uni yopadi, ilovadan chiqmaydi
//  - boshqa bo'limda bo'lsa: orqaga "Bosh" ga qaytaradi
//  - Bosh sahifada: birinchi bosish ogohlantiradi, ikkinchisi (2 soniya ichida) chiqaradi
//  - PIN bilan qulflangan bo'lsa: orqaga hech narsa qilmaydi
import { toast } from '../ui/toast.js';

const overlays = []; // { close(), guard?(), onBlocked?() }
let ignore = 0;
let exitArmed = false;
let exitTimer = null;
let hooks = { getTab: () => 'home', goHome: () => {}, isLocked: () => false };

export function initRouter(h) {
  hooks = { ...hooks, ...h };
  history.replaceState({ root: 1 }, '');
  history.pushState({ buf: 1 }, '');
  window.addEventListener('popstate', onPop);
}

export function openOverlay(o) {
  overlays.push(o);
  history.pushState({ ov: overlays.length }, '');
  return o;
}

// Eng ustki oynani yopish (tarixdan ham chiqadi)
export function closeTop() {
  if (overlays.length) history.back();
}

// Hamma ochiq oynalarni jimgina yopish (masalan, saqlangandan keyin)
export function dropOverlays() {
  const n = overlays.length;
  if (!n) return;
  const list = overlays.splice(0).reverse();
  list.forEach((o) => {
    try {
      o.close();
    } catch (e) {
      console.error(e);
    }
  });
  ignore += 1;
  setTimeout(() => {
    ignore = 0;
  }, 700);
  history.go(-n);
}

export const overlayCount = () => overlays.length;

function onPop(e) {
  if (ignore > 0) {
    ignore = 0;
    return;
  }
  const st = e.state || {};
  const depth = st.ov || 0;

  if (overlays.length > depth) {
    const top = overlays[overlays.length - 1];
    if (top.guard && top.guard()) {
      history.pushState({ ov: overlays.length }, ''); // yopishni to'xtatamiz
      if (top.onBlocked) top.onBlocked();
      return;
    }
    while (overlays.length > depth) {
      const o = overlays.pop();
      try {
        o.close();
      } catch (err) {
        console.error(err);
      }
    }
    return;
  }
  if (st.root) rootBack();
}

function rootBack() {
  if (hooks.isLocked()) {
    history.pushState({ buf: 1 }, '');
    return;
  }
  if (hooks.getTab() !== 'home') {
    hooks.goHome();
    history.pushState({ buf: 1 }, '');
    return;
  }
  if (exitArmed) {
    exitArmed = false;
    history.back(); // ilovadan chiqish
    return;
  }
  exitArmed = true;
  history.pushState({ buf: 1 }, '');
  toast('Chiqish uchun yana bir marta «Orqaga» bosing');
  clearTimeout(exitTimer);
  exitTimer = setTimeout(() => {
    exitArmed = false;
  }, 2200);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeTop();
});
