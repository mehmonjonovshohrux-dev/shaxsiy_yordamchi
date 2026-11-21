// Rasmlarni to'liq ekranda ko'rish (asl sifatda), suring va yuklab oling
import { esc } from '../core/dom.js';
import { icon } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { hydrate, downloadUrl } from '../services/images.service.js';
import { registerActions } from '../core/actions.js';

let paths = [];

export function openGallery(list, start = 0) {
  paths = list;
  const ctl = openSheet({
    title: `Rasmlar (${list.length})`,
    size: 'full dark',
    html: `
    <div class="gallery" tabindex="0">
      ${list.map((p, i) => `<figure class="slide"><img data-path="${esc(p)}" alt="Rasm ${i + 1}" decoding="async"><span class="broken-note">Bu format brauzerda ko'rinmaydi: yuklab oling</span><figcaption>${i + 1} / ${list.length}</figcaption></figure>`).join('')}
    </div>
    <div class="gallery-bar"><button type="button" class="btn light" data-act="gallery-download">${icon('download', 18)} Yuklab olish</button></div>`,
  });
  hydrate(ctl.body);
  const g = ctl.body.querySelector('.gallery');
  requestAnimationFrame(() => g.children[start]?.scrollIntoView({ inline: 'center', block: 'nearest' }));
}

registerActions({
  'gallery-download': async (btn) => {
    const g = btn.closest('.sheet-body').querySelector('.gallery');
    const i = Math.round(g.scrollLeft / g.clientWidth);
    const path = paths[Math.min(Math.max(i, 0), paths.length - 1)];
    const url = await downloadUrl(path);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop();
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
  'open-gallery': (el) => {
    const acc = JSON.parse(el.dataset.list || '[]');
    openGallery(acc, Number(el.dataset.i || 0));
  },
});
