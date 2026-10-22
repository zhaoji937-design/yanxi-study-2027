(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WordCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'yanxi-words-v1';
  const kinds = { family: '词族变形', shape: '字形相近', sound: '读音相近', meaning: '词义易串' };
  const fresh = () => ({ version: 1, favorites: [], review: [], mastered: [], pairs: [], stats: { attempts: 0, correct: 0 }, mistakes: [] });
  function normal(text) { return String(text || '').trim().toLowerCase(); }
  function escape(text) { return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function index(data) { return { words: new Map(data.words.map(w => [w.word, w])), groups: new Map(data.groups.map(g => [g.id, g])), questions: new Map(data.groups.flatMap(g => g.questions.map(q => [q.id, q]))) }; }
  function search(words, query) {
    const q = normal(query);
    if (!q) return words;
    return words.filter(w => w.word.includes(q) || w.meaning.toLowerCase().includes(q)).sort((a, b) => score(a.word, q) - score(b.word, q) || a.rank - b.rank);
  }
  function score(word, q) { return word === q ? 0 : word.startsWith(q) ? 1 : word.includes(q) ? 2 : 3; }
  function commonPrefix(words) {
    if (words.length < 2) return '';
    let p = words[0];
    for (const w of words.slice(1)) { while (p && !w.startsWith(p)) p = p.slice(0, -1); }
    return p;
  }
  // LCS preserves shared letters, marking the actual additions or substitutions.
  function difference(word, peer) {
    if (!peer || word === peer) return escape(word);
    const a = word, b = peer;
    const grid = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) grid[i][j] = a[i] === b[j] ? grid[i + 1][j + 1] + 1 : Math.max(grid[i + 1][j], grid[i][j + 1]);
    const keep = new Set(); let i = 0, j = 0;
    while (i < a.length && j < b.length) { if (a[i] === b[j]) { keep.add(i++); j++; } else if (grid[i + 1][j] >= grid[i][j + 1]) i++; else j++; }
    return [...a].map((c, n) => keep.has(n) ? escape(c) : '<mark>' + escape(c) + '</mark>').join('');
  }
  function highlight(word, peers) {
    const p = commonPrefix(peers);
    if (p.length >= 3 && p.length < word.length) return escape(p) + '<mark>' + escape(word.slice(p.length)) + '</mark>';
    return difference(word, peers.find(w => w !== word));
  }
  function grade(question, choice) {
    if (!question.options.includes(choice)) throw new Error('请从本题选项中选择。');
    return question.answer.includes(choice);
  }
  function assert(test, msg) { if (!test) throw new Error(msg || '备份内容不完整，未修改现有记录。'); }
  function validState(input, db) {
    assert(input && input.version === 1 && typeof input === 'object' && !Array.isArray(input));
    const out = fresh();
    for (const key of ['favorites', 'review', 'mastered']) {
      assert(Array.isArray(input[key]) && input[key].length <= db.groups.size);
      assert(input[key].every(id => typeof id === 'string' && db.groups.has(id)));
      out[key] = [...new Set(input[key])];
    }
    assert(Array.isArray(input.pairs) && input.pairs.length <= 200, '自建组最多支持 200 组。');
    const ids = new Set();
    for (const pair of input.pairs) {
      assert(pair && typeof pair.id === 'string' && /^[a-z0-9-]{1,80}$/.test(pair.id) && !ids.has(pair.id)); ids.add(pair.id);
      assert(Array.isArray(pair.words) && pair.words.length >= 2 && pair.words.length <= 4 && new Set(pair.words).size === pair.words.length);
      assert(pair.words.every(w => typeof w === 'string' && db.words.has(w)), '自建组中有不在当前词库的单词，未导入。');
      assert(typeof pair.note === 'string' && pair.note.length <= 400);
      out.pairs.push({ id: pair.id, words: [...pair.words], note: pair.note });
    }
    assert(input.stats && Number.isSafeInteger(input.stats.attempts) && input.stats.attempts >= 0 && input.stats.attempts <= 1e8);
    assert(Number.isSafeInteger(input.stats.correct) && input.stats.correct >= 0 && input.stats.correct <= input.stats.attempts);
    out.stats = { attempts: input.stats.attempts, correct: input.stats.correct };
    assert(Array.isArray(input.mistakes) && input.mistakes.length <= db.questions.size);
    const seen = new Set();
    for (const m of input.mistakes) {
      assert(m && db.questions.has(m.id) && !seen.has(m.id)); seen.add(m.id);
      const q = db.questions.get(m.id);
      assert(m.target === q.target && q.options.includes(m.chosen) && !q.answer.includes(m.chosen));
      assert(Number.isSafeInteger(m.count) && m.count > 0 && m.count <= 1e8 && Number.isSafeInteger(m.last) && m.last >= 0);
      out.mistakes.push({ id: m.id, target: m.target, chosen: m.chosen, count: m.count, last: m.last });
    }
    return out;
  }
  function record(state, question, choice) {
    const next = JSON.parse(JSON.stringify(state)); const correct = grade(question, choice);
    next.stats.attempts++; if (correct) next.stats.correct++;
    if (!correct) {
      const previous = next.mistakes.find(m => m.id === question.id);
      if (previous) { previous.chosen = choice; previous.count++; previous.last = Date.now(); }
      else next.mistakes.push({ id: question.id, target: question.target, chosen: choice, count: 1, last: Date.now() });
      if (!next.review.includes(question.group)) next.review.push(question.group);
      next.mastered = next.mastered.filter(id => id !== question.group);
    }
    return next;
  }
  function backup(state) { return JSON.stringify({ app: 'yanxi-words', version: 1, exportedAt: new Date().toISOString(), state }, null, 2); }
  function importBackup(text, db) {
    assert(typeof text === 'string' && text.length <= 2e6, '备份文件太大，未导入。');
    let value; try { value = JSON.parse(text); } catch (_) { throw new Error('无法读取这个备份文件，现有记录没有变化。'); }
    assert(value.app === 'yanxi-words' && value.version === 1, '这不是“词辨”的备份文件。');
    return validState(value.state, db);
  }
  function save(storage, value, db) { const safe = validState(value, db); storage.setItem(KEY, JSON.stringify(safe)); return safe; }
  return { KEY, kinds, fresh, normal, escape, index, search, highlight, grade, validState, record, backup, importBackup, save };
});
