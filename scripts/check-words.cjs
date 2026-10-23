'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), vm = require('node:vm');
const root = path.resolve(__dirname, '../dist/words');
const C = require(path.join(root, 'core.js'));
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const db = C.index(data);
assert.ok(data.words.length >= 5600); assert.equal(db.words.size, data.words.length);
const base = JSON.parse(fs.readFileSync(path.resolve(root, '../../content/word-exam-base.json'), 'utf8'));
const legacy = JSON.parse(fs.readFileSync(path.resolve(root, '../../content/word-legacy-list.json'), 'utf8'));
assert.equal(base.entries.length, 5530);
for (const e of base.entries) assert.ok(db.words.has(e.word), 'exam list missing: ' + e.word);
for (const w of legacy) assert.ok(db.words.has(w), 'old word removed: ' + w);
assert.ok(data.meta.editorialWords >= 150);
assert.equal(data.groups.length, data.meta.groupCount); assert.equal(db.groups.size, data.groups.length);
assert.equal(db.questions.size, data.meta.questionCount);
assert.equal(data.groups[0].id, 'general-family');
assert.deepEqual(data.groups[0].entries.slice(0,3).map(e => e.word), ['generalization', 'generalize', 'generally']);
assert.match(db.words.get('generally').meaning, /通常/);
assert.doesNotMatch(db.words.get('generally').meaning, /逐渐/);
for (const w of data.words) {
  assert.match(w.word, /^[a-z]+(?:[-' ][a-z]+)*$/); assert.ok(w.meaning && w.brief);
  assert.ok(['curated', 'ECDICT', 'NETEM', 'exam-editorial'].includes(w.meaningSource));
  for (const key of ['shape', 'sound']) { assert.ok(w[key].length <= 24); assert.equal(new Set(w[key]).size, w[key].length); for (const n of w[key]) assert.ok(n !== w.word && db.words.has(n), w.word + ':' + n); }
  for (const id of w.groups) assert.ok(db.groups.get(id).entries.some(e => e.word === w.word));
}
for (const g of data.groups) {
  assert.ok(C.kinds[g.kind]); assert.ok(g.contrast); assert.equal(g.entries.length, g.questions.length);
  assert.ok(g.entries.length >= 2 && g.entries.length <= C.MAX_COMPARE);
  for (const entry of g.entries) { assert.ok(db.words.has(entry.word)); assert.ok(entry.meaning && entry.pos && entry.focus && entry.zh); assert.equal((entry.sentence.match(new RegExp('\\b' + entry.word + '\\b', 'gi')) || []).length, 1); }
  for (const q of g.questions) {
    assert.equal(q.group, g.id); assert.ok(q.answer.includes(q.target)); assert.equal(q.sentence.split('____').length, 2);
    assert.equal(new Set(q.options).size, q.options.length);
    for (const answer of q.answer) assert.ok(q.options.includes(answer));
    for (const answer of q.historicalChoices || []) assert.ok(q.answer.includes(answer) && answer !== q.target);
    assert.ok(q.intent && q.explanation);
  }
}
const groupSets = data.groups.map(g=>g.entries.map(e=>e.word).sort().join(','));
assert.equal(new Set(groupSets).size, groupSets.length, 'duplicate comparison group');
for (const a of data.affixes) { assert.ok(a.note && a.hint); a.words.forEach(w => assert.ok(db.words.has(w))); }
for (const [file, needle] of [['licenses/ECDICT.txt', 'MIT'], ['licenses/cmudict.txt', 'Redistribution'], ['licenses/NETEM.txt', 'Attribution-NonCommercial-ShareAlike'], ['licenses/ATTRIBUTION.txt', base.source.sha]]) assert.ok(fs.readFileSync(path.join(root, file), 'utf8').includes(needle));
for (const filename of ['app.js', 'core.js', 'sw.js']) new vm.Script(fs.readFileSync(path.join(root, filename), 'utf8'), { filename });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const assets = [...html.matchAll(/(?:src|href)="([^\"]+)"/g)].map(x => x[1]).filter(x => !x.startsWith('#'));
const worker = vm.createContext({ URL, self: { location: { href: 'https://check.invalid/words/sw.js' }, addEventListener() {} } });
vm.runInContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), worker);
const shell = vm.runInContext('SHELL', worker);
for (const value of shell) { const u = new URL(value); assert.equal(u.origin, 'https://check.invalid'); assert.ok(u.pathname.startsWith('/words/')); assert.ok(fs.statSync(path.join(root, u.pathname === '/words/' ? 'index.html' : u.pathname.slice(7))).isFile()); }
for (const value of assets) { const u = new URL(value, 'https://check.invalid/words/'); assert.ok(shell.includes(u.href), value + ' not offline'); }
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.scope, './'); assert.equal(manifest.start_url, './');
assert.ok(vm.runInContext('CACHE', worker).startsWith('yanxi-words-'));
console.log(JSON.stringify({ result: 'passed', words: db.words.size, groups: db.groups.size, exercises: db.questions.size, affixes: data.affixes.length, offlineResources: shell.length }));
