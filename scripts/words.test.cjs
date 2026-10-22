'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const C = require('../dist/words/core.js');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../dist/words/data.json'), 'utf8')), db = C.index(data), q = db.questions.get('general-family:generalization');
test('English exact match wins; Chinese meaning search works', () => {
  assert.equal(C.search(data.words, 'generally')[0].word, 'generally');
  assert.ok(C.search(data.words, '笼统说法').some(w => w.word === 'generalization'));
  assert.equal(C.search(data.words, ' GENERALIZE ')[0].word, 'generalize');
});
test('letter comparison preserves spelling and escapes HTML', () => {
  const result = C.highlight('generalization', ['generalization', 'generalize', 'generally']);
  assert.equal(result.replace(/<[^>]+>/g, ''), 'generalization'); assert.match(result, /<mark>ization<\/mark>/);
  assert.equal(C.escape('<img src=x>'), '&lt;img src=x&gt;');
});
test('legitimate variants are accepted; arbitrary options rejected', () => {
  const item = db.questions.get('assure-group:ensure'); assert.equal(C.grade(item, 'ensure'), true); assert.equal(C.grade(item, 'insure'), true); assert.equal(C.grade(item, 'assure'), false);
  assert.throws(() => C.grade(item, 'invalid'));
});
test('a wrong answer records the actual confused word and schedules review', () => {
  const original = C.fresh(); original.mastered.push(q.group);
  const next = C.record(original, q, 'generally');
  assert.equal(original.stats.attempts, 0); assert.deepEqual(next.stats, { attempts: 1, correct: 0 });
  assert.equal(next.mistakes[0].target, 'generalization'); assert.equal(next.mistakes[0].chosen, 'generally');
  assert.deepEqual(next.review, ['general-family']); assert.equal(next.mastered.length, 0);
  assert.equal(C.record(next, q, 'generalize').mistakes[0].count, 2);
});
test('correct answers do not create confusion records', () => { const s = C.record(C.fresh(), q, 'generalization'); assert.deepEqual(s.stats, { attempts: 1, correct: 1 }); assert.equal(s.mistakes.length, 0); });
test('complete records including personal phonetic associations round-trip', () => {
  const s = C.record(C.fresh(), q, 'generally'); s.favorites = ['general-family']; s.pairs.push({ id: 'p-one', words: ['generalization', 'principle'], note: '<个人联想>\n只因读音记串' });
  assert.deepEqual(C.importBackup(C.backup(s), db), s);
});
test('unrelated/corrupt/incompatible backup cannot change the old state', () => {
  const old = C.fresh(), before = JSON.stringify(old);
  for (const raw of ['oops', '{"app":"yanxi-quiz","version":1}', '{"app":"yanxi-words","version":100}']) assert.throws(() => C.importBackup(raw, db));
  assert.equal(JSON.stringify(old), before);
});
test('unknown words, duplicate IDs, invalid counters and forged mistakes are rejected', () => {
  const cases = [
    s => s.pairs.push({ id: 'p-one', words: ['generalization', 'xxxxnotaword'], note: '' }),
    s => { const p = { id: 'p-one', words: ['generally', 'generalize'], note: '' }; s.pairs.push(p, p); },
    s => { s.stats.correct = 1; },
    s => { s.mistakes.push({ id: q.id, target: q.target, chosen: q.target, count: 1, last: 0 }); },
    s => { s.review = ['non-existent-group']; }
  ];
  for (const alter of cases) { const s = C.fresh(); alter(s); assert.throws(() => C.validState(s, db)); }
});
test('failed writes preserve existing storage; successful saves use a separate key', () => {
  let current = 'old'; const broken = { setItem() { throw new Error('quota'); } };
  assert.throws(() => C.save(broken, C.fresh(), db)); assert.equal(current, 'old');
  let key; C.save({ setItem(k, value) { key = k; current = value; } }, C.fresh(), db);
  assert.equal(key, 'yanxi-words-v1'); assert.equal(JSON.parse(current).version, 1);
});
