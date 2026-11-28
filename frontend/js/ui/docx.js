// Hisobotdan Word (.docx) fayl yasaydi (kutubxonasiz). Kirish: buildReport() natijasi.
import { zip } from './zip.js';

const X = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const BRAND = '4F46E5';
const GOOD = '15803D';
const BAD = 'B91C1C';

const run = (text, { b = false, color = '', size = 0 } = {}) =>
  `<w:r><w:rPr>${b ? '<w:b/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}${size ? `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` : ''}</w:rPr><w:t xml:space="preserve">${X(text)}</w:t></w:r>`;
const para = (runs, { jc = '', before = 0, after = 80 } = {}) => `<w:p><w:pPr><w:spacing w:before="${before}" w:after="${after}"/>${jc ? `<w:jc w:val="${jc}"/>` : ''}</w:pPr>${runs}</w:p>`;
const JC = { l: 'left', r: 'right' };
const borders = `<w:tblBorders><w:top w:val="single" w:sz="4" w:color="E2E8F0"/><w:left w:val="single" w:sz="4" w:color="E2E8F0"/><w:bottom w:val="single" w:sz="4" w:color="E2E8F0"/><w:right w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="single" w:sz="4" w:color="E2E8F0"/></w:tblBorders>`;
const cell = (content, { fill = '', w = 0 } = {}) =>
  `<w:tc><w:tcPr>${w ? `<w:tcW w:w="${w}" w:type="dxa"/>` : ''}${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}<w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>${content}</w:tc>`;

function table(block) {
  const n = block.head.length;
  const W = 10000;
  const first = n > 4 ? 2600 : 3200;
  const w = block.head.map((_, i) => (i === 0 ? first : Math.floor((W - first) / (n - 1))));
  const head = `<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${block.head.map((h, i) => cell(para(run(h, { b: true, color: 'FFFFFF', size: 19 }), { jc: JC[block.align[i]], after: 0 }), { fill: BRAND, w: w[i] })).join('')}</w:tr>`;
  const rows = block.rows
    .map((r, ri) => {
      const last = block.totalRow && ri === block.rows.length - 1;
      return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r
        .map((v, i) => {
          const neg = String(v).startsWith('−');
          const color = last || block.align[i] === 'r' ? (/^−/.test(v) ? BAD : /^\+/.test(v) ? GOOD : '') : '';
          return cell(para(run(v, { b: last, color, size: 19 }), { jc: JC[block.align[i]], after: 0 }), { fill: last ? 'EEF2FF' : ri % 2 ? 'F8FAFC' : '', w: w[i] });
        })
        .join('')}</w:tr>`;
    })
    .join('');
  return `${para(run(block.title, { b: true, color: '1E293B', size: 26 }), { before: 240, after: 100 })}<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/>${borders}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${w.map((x) => `<w:gridCol w:w="${x}"/>`).join('')}</w:tblGrid>${head}${rows}</w:tbl>`;
}

function kpis(block) {
  const w = 5000;
  const c = (it) =>
    cell(`${para(run(it[0], { color: '64748B', size: 18 }), { after: 20 })}${para(run(it[1], { b: true, size: 30, color: it[2] === 'neg' ? BAD : it[2] === 'pos' ? GOOD : '1E293B' }), { after: 0 })}`, { fill: 'EEF2FF', w });
  const row = (a, b) => `<w:tr>${c(a)}${c(b)}</w:tr>`;
  const it = block.items;
  return `<w:tbl><w:tblPr><w:tblW w:w="10000" w:type="dxa"/><w:tblBorders><w:insideH w:val="single" w:sz="18" w:color="FFFFFF"/><w:insideV w:val="single" w:sz="18" w:color="FFFFFF"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${w}"/><w:gridCol w:w="${w}"/></w:tblGrid>${row(it[0], it[1])}${row(it[2], it[3])}</w:tbl>`;
}

export function buildDocx(report) {
  const body = [
    para(run(report.title, { b: true, color: BRAND, size: 44 }), { after: 40 }),
    para(run(`Davr: ${report.period}`, { b: true, size: 22 }) + run(`   ·   Tuzilgan sana: ${report.created}${report.owner ? `   ·   ${report.owner}` : ''}`, { color: '64748B', size: 20 }), { after: 200 }),
    ...report.blocks.map((b) => (b.type === 'kpis' ? kpis(b) : table(b))),
    para(run("So'mda hisoblangan. Foyda: shaxsiy akkauntlarda to'liq sizga, 50/50 akkauntlarda yarmi sizga.", { color: '94A3B8', size: 17 }), { before: 300 }),
  ].join('');
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="uz-Latn-UZ"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
  return zip([
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'word/document.xml', data: doc },
    { name: 'word/styles.xml', data: styles },
  ]);
}
