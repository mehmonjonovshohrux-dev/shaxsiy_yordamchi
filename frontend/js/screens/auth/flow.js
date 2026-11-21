// Kirish bosqichlari boshqaruvchisi (login -> parolni unutdim -> kod -> yangi parol ...).
// Har bir bosqich alohida faylda; ular registerStep bilan shu yerga ulanadi.
import { $ } from '../../core/dom.js';
import { openOverlay, closeTop, dropOverlays } from '../../core/router.js';
import { registerActions } from '../../core/actions.js';
import { icon } from '../../ui/icons.js';
import { logo } from '../../ui/brand.js';

const steps = new Map();
let stack = [];
export const flowData = {};

export const registerStep = (name, def) => steps.set(name, def);

export function startAuth(first, onDone) {
  Object.keys(flowData).forEach((k) => delete flowData[k]);
  flowData.onDone = onDone;
  stack = [first];
  render();
}

// Yangi bosqichga o'tish ("Orqaga" tugmasi oldingisiga qaytaradi)
export function go(step, data = {}) {
  Object.assign(flowData, data);
  stack.push(step);
  openOverlay({
    close: () => {
      stack.pop();
      render();
    },
  });
  render();
}

// Joriy bosqichni almashtirish (orqaga qaytib bo'lmaydi)
export function replaceStep(step, data = {}) {
  Object.assign(flowData, data);
  stack[stack.length - 1] = step;
  render();
}

export function finish() {
  dropOverlays();
  const done = flowData.onDone;
  stack = [];
  if (done) done();
}

export const canGoBack = () => stack.length > 1;

function render() {
  const name = stack[stack.length - 1];
  const def = steps.get(name);
  if (!def) return;
  const app = $('#app');
  app.innerHTML = def.view(flowData);
  def.mount?.(app, flowData);
  window.scrollTo(0, 0);
}

export function authLayout({ title, subtitle = '', body, back = false }) {
  return `
  <div class="auth">
    <div class="auth-hero">
      <div class="auth-brand">${logo(46)}<span>AccSavdo</span></div>
      <p class="auth-tag">Akkaunt savdosi hisobi: foyda, sherik ulushi va eslatmalar bir joyda</p>
    </div>
    <section class="auth-card">
      ${back ? `<button type="button" class="back-link" data-act="auth-back">${icon('left', 18)} Orqaga</button>` : ''}
      <h1>${title}</h1>
      ${subtitle ? `<p class="sub">${subtitle}</p>` : ''}
      ${body}
    </section>
    <p class="auth-foot">${icon('shieldcheck', 16)} Ma'lumotlaringiz shifrlangan va faqat sizga ko'rinadi</p>
  </div>`;
}

registerActions({ 'auth-back': () => closeTop() });
