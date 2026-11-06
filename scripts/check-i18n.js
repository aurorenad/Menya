// Verifies that every t('...') key used in the code exists in English and Kinyarwanda.
// Run: node scripts/check-i18n.js
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../src/i18n.ts'), 'utf8');
const keysIn = (block) => new Set([...block.matchAll(/'([a-zA-Z0-9_.]+)':|^\s+([a-z]+):/gm)].map((m) => m[1] || m[2]));
const enBlock = src.split('const en')[1].split('const rw')[0];
const rwBlock = src.split('const rw')[1].split('const dict')[0];
const en = new Set([...enBlock.matchAll(/'([^']+)':/g)].map((m) => m[1]).concat(['disclaimer']));
const rw = new Set([...rwBlock.matchAll(/'([^']+)':/g)].map((m) => m[1]).concat(['disclaimer']));

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : /\.(tsx?|ts)$/.test(e.name) ? [p] : [];
  });
}

const used = new Set();
for (const f of walk(path.join(__dirname, '../src'))) {
  if (f.endsWith('i18n.ts')) continue;
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1]);
  for (const m of s.matchAll(/(?:Key|title|text|label|labelKey|icon):\s*'((?:[a-z]+\.)+[a-zA-Z0-9.]+)'/g)) used.add(m[1]);
  // dynamic keys
  for (const m of s.matchAll(/t\(`([^`]+)`/g)) {
    const tpl = m[1];
    if (tpl.startsWith('home.msg.')) ['normal', 'watch', 'followup'].forEach((x) => used.add('home.msg.' + x));
    else if (tpl.startsWith('types.${c.id}.text')) ['dry', 'wet', 'uncertain'].forEach((x) => used.add(`types.${x}.text`));
    else if (tpl.startsWith('types.${c.id}')) ['dry', 'wet', 'uncertain'].forEach((x) => used.add(`types.${x}`));
    else if (tpl.startsWith('types.conf.')) ['high', 'medium', 'low'].forEach((x) => used.add('types.conf.' + x));
    else if (tpl.startsWith('day.')) for (let i = 0; i < 7; i++) used.add('day.' + i);
    else if (tpl.startsWith('month.')) for (let i = 0; i < 12; i++) used.add('month.' + i);
    else if (tpl.startsWith('help.q')) for (let i = 1; i <= 6; i++) used.add('help.q' + i), used.add('help.a' + i);
    else if (tpl.startsWith('privacy.')) 'abcd'.split('').forEach((k) => (used.add(`privacy.${k}.title`), used.add(`privacy.${k}.text`)));
    else console.log('dynamic key not checked:', f, tpl);
  }
}
const keyLike = (k) => /^[a-z]+(\.[a-zA-Z0-9]+)+$/.test(k) && !k.includes('/');
const missingEn = [...used].filter((k) => keyLike(k) && !en.has(k) && !k.startsWith('expo') && !/^(react|Poppins)/.test(k));
const missingRw = [...en].filter((k) => !rw.has(k));
console.log('used keys:', used.size, '| en keys:', en.size, '| rw keys:', rw.size);
console.log('missing in EN:', missingEn);
console.log('missing in RW:', missingRw);


