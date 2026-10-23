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
test('candidate multi-selection retains the anchor, toggles independently and never mutates input', () => {
  const first = C.toggleSelection([], 'principal', db, 'principle');
  assert.deepEqual(first, ['principle', 'principal']);
  const second = C.toggleSelection(first, 'discipline', db, 'principle');
  assert.deepEqual(second, ['principle', 'principal', 'discipline']);
  assert.deepEqual(first, ['principle', 'principal']);
  assert.deepEqual(C.toggleSelection(second, 'principal', db, 'principle'), ['principle', 'discipline']);
  const full = data.words.slice(0, C.MAX_COMPARE).map(w => w.word), before = [...full];
  assert.throws(() => C.toggleSelection(full, data.words[C.MAX_COMPARE].word, db));
  assert.deepEqual(full, before);
  assert.throws(() => C.toggleSelection([], 'notaword', db));
});
test('large custom groups retain notes and old v1 backups remain compatible', () => {
  for (const size of [2, 4, 8, C.MAX_COMPARE]) {
    const s = C.fresh(); s.pairs.push({id:'large-'+size, words:data.words.slice(0,size).map(w=>w.word), note:'多词联想'});
    assert.deepEqual(C.importBackup(C.backup(s), db), s);
  }
  const s = C.fresh(); s.pairs.push({id:'too-many', words:data.words.slice(0,C.MAX_COMPARE+1).map(w=>w.word), note:''});
  assert.throws(()=>C.validState(s, db));
});
test('exam list coverage, familiar-word senses and phrases are searchable', () => {
  assert.ok(db.words.size >= 5600);
  for (const w of ['subject','case','hold','matter','mean','study','sound','set','work','according to','up-to-date',"o'clock"]) assert.ok(db.words.has(w),w);
  assert.match(db.words.get('address').meaning,/处理/);
  assert.match(db.words.get('subject').meaning,/受试者/);
  assert.match(db.words.get('discipline').meaning,/学科/);
  assert.match(db.words.get('interest').meaning,/利益/);
  assert.equal(db.words.get('address').meaningSource,'exam-editorial');
  assert.doesNotMatch(db.words.get('generally').dictionaryMeaning,/逐渐/);
  assert.ok(C.search(data.words,'圣诞').some(w=>w.word==='christmas'));
  assert.ok(C.search(data.words,'according to').some(w=>w.word==='according to'));
});
test('home library includes personal groups, filters them separately, and searches notes and meanings', () => {
  const s = C.fresh();
  s.pairs = [{id:'p-old',words:['generalization','generally'],note:'我会把词性记反'}, {id:'p-new',words:['subject','sound','bank','case','address'],note:'阅读里总记串'}];
  const before = JSON.stringify(s);
  const all = C.libraryItems(data, s, db);
  assert.equal(all.length, data.groups.length + 2);
  assert.equal(all[0].pair.id, 'p-new');
  assert.equal(C.libraryItems(data, s, db, 'custom').length, 2);
  assert.equal(C.libraryItems(data, s, db, 'custom', '阅读里')[0].pair.id,'p-new');
  assert.equal(C.libraryItems(data, s, db, 'custom', '受试者')[0].pair.id,'p-new');
  assert.equal(C.libraryItems(data, s, db, 'custom', 'GENERALLY')[0].pair.id,'p-old');
  assert.equal(C.libraryItems(data, s, db, 'custom', 'not-present').length,0);
  assert.equal(C.libraryItems(data, C.fresh(), db, 'custom').length,0);
  assert.ok(C.libraryItems(data, s, db, 'shape').every(item=>item.type==='curated'&&item.group.kind==='shape'));
  assert.equal(JSON.stringify(s),before);
});
test('a corrected alternate answer preserves historical mistakes without rejecting an old backup', () => {
  const q = db.questions.get('attain-group:attain');
  assert.ok(q.answer.includes('obtain'));
  assert.equal(C.grade(q, 'obtain'), true);
  const old = C.fresh();
  old.stats = {attempts:1,correct:0};old.review=['attain-group'];
  old.mistakes=[{id:q.id,target:'attain',chosen:'obtain',count:1,last:1}];
  assert.deepEqual(C.importBackup(C.backup(old),db),old);
  const forged=C.fresh();forged.mistakes=[{id:q.id,target:q.target,chosen:q.target,count:1,last:1}];
  assert.throws(()=>C.validState(forged,db));
});
test('expanded comparison groups cover every word with its own distinction and original context', () => {
  assert.ok(data.groups.length >= 160);
  assert.ok(data.groups.filter(g=>g.entries.length>=4).length >= 95);
  assert.ok(data.groups.some(g=>g.entries.length>=6));
  for(const word of ['economic','economical','economically','economy','economics']) assert.ok(db.groups.get('economy-family').entries.some(e=>e.word===word));
  for(const word of ['result','resort','resist','resent','revolt']) assert.ok(db.groups.get('mix-result-resort').entries.some(e=>e.word===word));
  assert.equal(db.questions.size,data.groups.reduce((n,g)=>n+g.entries.length,0));
});
