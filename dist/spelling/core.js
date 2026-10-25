(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SpellCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var VERSION = 1, APP = 'yanxi-spelling', DAY = 86400000;
  var KEY = 'yanxi-spelling-state-v1', SESSION_KEY = 'yanxi-spelling-session-v1';
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  function fail(message) { throw new Error(message); }
  function plain(value) { return value && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null); }
  function keys(value, allowed, label) {
    if (!plain(value)) fail(label + '格式不正确');
    Object.keys(value).forEach(function (key) { if (allowed.indexOf(key) < 0) fail(label + '含有不支持的字段：' + key); });
  }
  function integer(value) { return Number.isSafeInteger(value) && value >= 0; }
  function time(value) { return Number.isFinite(value) && value >= 0 && value <= 8640000000000000; }
  function stamp(value) { value = value === undefined ? Date.now() : value; if (!time(value)) fail('时间不正确'); return value; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function normalize(value) {
    return String(value === undefined || value === null ? '' : value).normalize('NFC').trim().toLowerCase().replace(/[\u2018\u2019\u02bc\uff07]/g, "'");
  }
  function index(data) {
    if (data && data.words instanceof Map && Array.isArray(data.list)) return data;
    var list = Array.isArray(data) ? data : data && data.words;
    if (!Array.isArray(list)) fail('词库格式不正确');
    var words = new Map(), categories = new Map();
    var definitions = !Array.isArray(data) && data && data.categories || [];
    if (!Array.isArray(definitions)) fail('分类格式不正确');
    definitions.forEach(function (category) {
      if (!category || typeof category.id !== 'string' || !category.id || categories.has(category.id)) fail('分类编号不正确');
      categories.set(category.id, Object.assign({}, category, { ids: [], count: 0 }));
    });
    list.forEach(function (word) {
      if (!word || typeof word.id !== 'string' || !word.id || typeof word.word !== 'string' || !word.word.trim() || words.has(word.id)) fail('词条编号或拼写不正确');
      if (!Array.isArray(word.tags) || word.tags.some(function (tag) { return typeof tag !== 'string' || !tag; })) fail('词条分类不正确：' + word.id);
      if (word.accepted !== undefined && (!Array.isArray(word.accepted) || word.accepted.some(function (answer) { return typeof answer !== 'string' || !answer.trim(); }))) fail('可接受拼写不正确：' + word.id);
      words.set(word.id, word);
      Array.from(new Set(word.tags)).forEach(function (tag) {
        if (!categories.has(tag)) categories.set(tag, { id: tag, title: tag, ids: [], count: 0 });
        categories.get(tag).ids.push(word.id); categories.get(tag).count++;
      });
    });
    return { words: words, categories: categories, list: list, total: list.length };
  }
  function checkAnswer(word, typed) {
    var answer = normalize(typed);
    return !!answer && [word.word].concat(word.accepted || []).some(function (variant) { return normalize(variant) === answer; });
  }
  function emptyState() { return { version: VERSION, records: {}, days: {} }; }
  function emptyRecord() { return { attempts: 0, correct: 0, wrong: 0, cleanCorrect: 0, streak: 0, lastAt: 0, nextDue: 0, intervalDays: 0, lastCorrect: false, favorite: false }; }
  function recordFor(state, id) {
    if (typeof id !== 'string' || !id || id === '__proto__' || id === 'prototype') fail('词条编号不正确');
    if (!own(state.records, id)) Object.defineProperty(state.records, id, { value: emptyRecord(), enumerable: true, configurable: true, writable: true });
    return state.records[id];
  }
  function toggleFavorite(state, id) { var record = recordFor(state, id); record.favorite = !record.favorite; return record.favorite; }
  function isMastered(record) { return !!record && record.streak >= 3 && record.cleanCorrect >= 3; }
  function validateState(raw, data) {
    var db = data ? index(data) : null;
    keys(raw, ['version', 'records', 'days'], '学习记录');
    if (raw.version !== VERSION || !plain(raw.records) || !plain(raw.days)) fail('学习记录版本或结构不正确');
    Object.keys(raw.records).forEach(function (id) {
      if (id === '__proto__' || id === 'prototype' || db && !db.words.has(id)) fail('学习记录含有未知词条：' + id);
      var r = raw.records[id];
      keys(r, ['attempts', 'correct', 'wrong', 'cleanCorrect', 'streak', 'lastAt', 'nextDue', 'intervalDays', 'lastCorrect', 'favorite'], '单词记录');
      if (!['attempts', 'correct', 'wrong', 'cleanCorrect', 'streak'].every(function (k) { return integer(r[k]); }) || r.attempts !== r.correct + r.wrong || r.cleanCorrect > r.correct || r.streak > r.cleanCorrect) fail('单词记录计数不正确：' + id);
      if (!time(r.lastAt) || !time(r.nextDue) || r.nextDue < r.lastAt || !Number.isFinite(r.intervalDays) || r.intervalDays < 0 || r.intervalDays > 365 || typeof r.lastCorrect !== 'boolean' || typeof r.favorite !== 'boolean') fail('单词记录时间或标记不正确：' + id);
      if (r.attempts === 0 && (r.lastAt !== 0 || r.nextDue !== 0 || r.intervalDays !== 0 || r.lastCorrect)) fail('未练习单词含有作答时间：' + id);
    });
    Object.keys(raw.days).forEach(function (day) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day + 'T00:00:00Z')) || new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) !== day) fail('每日记录日期不正确');
      var d = raw.days[day]; keys(d, ['attempts', 'correct', 'wrong', 'cleanCorrect'], '每日记录');
      if (!['attempts', 'correct', 'wrong', 'cleanCorrect'].every(function (key) { return integer(d[key]); }) || d.attempts !== d.correct + d.wrong || d.cleanCorrect > d.correct) fail('每日记录计数不正确');
    });
    ['attempts', 'correct', 'wrong', 'cleanCorrect'].forEach(function (key) {
      var recordTotal = Object.keys(raw.records).reduce(function (n, id) { return n + raw.records[id][key]; }, 0);
      var dayTotal = Object.keys(raw.days).reduce(function (n, day) { return n + raw.days[day][key]; }, 0);
      if (recordTotal !== dayTotal) fail('每日记录与单词记录不一致');
    });
    return clone(raw);
  }
  function loadState(raw, data) {
    if (raw === null || raw === undefined || raw === '') return emptyState();
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (e) { fail('学习记录不是有效 JSON'); } }
    return validateState(raw, data);
  }
  function shuffled(list, rng) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var random = rng(); if (!Number.isFinite(random) || random < 0 || random >= 1) fail('随机数不正确');
      var j = Math.floor(random * (i + 1)), tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }
  function createSession(data, state, options, now, rng) {
    var db = index(data); options = options || {}; now = stamp(now); rng = rng || Math.random;
    var category = options.category || 'all', mode = options.mode || 'meaning', count = options.count === undefined ? 20 : options.count, order = options.order || 'smart';
    if (['meaning', 'audio'].indexOf(mode) < 0 || ['smart', 'random'].indexOf(order) < 0 || [10, 20, 30, 50].indexOf(count) < 0) fail('练习选项不正确');
    if (['all', 'favorites', 'wrong', 'due'].indexOf(category) < 0 && !db.categories.has(category)) fail('找不到这个分类');
    var subset = null;
    if (options.ids !== undefined) {
      if (!Array.isArray(options.ids) || options.ids.some(function (id) { return typeof id !== 'string' || !db.words.has(id); })) fail('重练队列含有未知词条');
      subset = new Set(options.ids);
    }
    var candidates = db.list.filter(function (word) {
      if (subset && !subset.has(word.id)) return false;
      var record = own(state.records, word.id) ? state.records[word.id] : null;
      if (category === 'favorites') return record && record.favorite;
      if (category === 'wrong') return record && record.wrong > 0;
      if (category === 'due') return record && record.attempts > 0 && record.nextDue <= now;
      return category === 'all' || word.tags.indexOf(category) >= 0;
    });
    candidates = shuffled(candidates, rng);
    if (order === 'smart') {
      function rank(word) {
        var r = own(state.records, word.id) ? state.records[word.id] : null;
        if (r && r.attempts && r.nextDue <= now) return !r.lastCorrect || r.intervalDays === 0 && r.wrong > 0 ? 0 : 1;
        if (!r || !r.attempts) return 2;
        return 3;
      }
      candidates.sort(function (a, b) {
        var delta = rank(a) - rank(b); if (delta) return delta;
        if (rank(a) === 2) return 0;
        return state.records[a.id].nextDue - state.records[b.id].nextDue;
      });
    }
    return { version: VERSION, ids: candidates.slice(0, count).map(function (word) { return word.id; }), index: 0, results: {}, draft: '', hintUsed: false, mode: mode, category: category, order: order, requestedCount: count, startedAt: now, completedAt: candidates.length ? null : now };
  }
  function currentId(session) { return session.ids[session.index] || null; }
  function useHint(session) {
    var id = currentId(session); if (!id || session.results[id] && session.results[id].correct) return false;
    session.hintUsed = true; return true;
  }
  function dayKey(now) {
    var d = new Date(now); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function submit(state, session, word, typed, now) {
    now = stamp(now); if (!word || currentId(session) !== word.id || session.completedAt !== null) fail('当前练习词条不匹配');
    if (now < session.startedAt) fail('作答时间早于开练时间，请检查设备时钟');
    if (typeof typed !== 'string' || typed.length > 2000) fail('输入内容不正确');
    var previous = own(session.results, word.id) ? session.results[word.id] : null;
    if (previous && previous.correct) return previous;
    if (previous && now < previous.at) fail('作答时间不能早于上一次检查时间');
    var correct = checkAnswer(word, typed), hinted = !!session.hintUsed, first = !previous;
    var attempt = { typed: typed, correct: correct, hintUsed: hinted, at: now, skipped: !normalize(typed) };
    var result = previous || { id: word.id, target: word.word, firstTyped: typed, firstCorrect: correct, firstHintUsed: hinted, attempts: [] };
    result.attempts.push(attempt); result.typed = typed; result.normalized = normalize(typed); result.correct = correct; result.isCorrect = correct; result.currentCorrect = correct; result.firstTry = first; result.hintUsed = hinted; result.independentCorrect = result.firstCorrect && !result.firstHintUsed; result.skipped = attempt.skipped; result.at = now;
    session.results[word.id] = result; session.draft = typed;
    var r = recordFor(state, word.id), clean = first && correct && !hinted;
    r.attempts++; r.correct += correct ? 1 : 0; r.wrong += correct ? 0 : 1; r.cleanCorrect += clean ? 1 : 0; r.lastAt = now; r.lastCorrect = correct;
    if (!correct) { r.streak = 0; r.intervalDays = 0; r.nextDue = now + 5 * 60000; }
    else if (clean) {
      r.streak++; r.intervalDays = [1, 3, 7, 14, 30, 60, 120][Math.min(r.streak - 1, 6)]; r.nextDue = now + r.intervalDays * DAY;
    } else {
      r.streak = 0;
      // A correction in the same round never erases the short review interval from the miss.
      r.intervalDays = 0; r.nextDue = previous ? Math.max(now, Math.min(r.nextDue, now + 5 * 60000)) : now + 30 * 60000;
    }
    var day = dayKey(now);
    if (!own(state.days, day)) state.days[day] = { attempts: 0, correct: 0, wrong: 0, cleanCorrect: 0 };
    state.days[day].attempts++; state.days[day].correct += correct ? 1 : 0; state.days[day].wrong += correct ? 0 : 1; state.days[day].cleanCorrect += clean ? 1 : 0;
    return result;
  }
  function next(session, now) {
    if (session.completedAt !== null) return session;
    var id = currentId(session); if (!id || !own(session.results, id)) fail('请先检查答案或选择不会');
    session.index++; session.draft = ''; session.hintUsed = false;
    if (session.index >= session.ids.length) {
      session.completedAt = Math.max(stamp(now), session.startedAt, session.results[id].at);
    }
    return session;
  }
  function summary(state, now) {
    now = stamp(now); var out = { attempted: 0, mastered: 0, due: 0, wrong: 0, favorites: 0, totalAttempts: 0, correctAttempts: 0, cleanCorrect: 0, accuracy: 0 };
    Object.keys(state.records).forEach(function (id) {
      var r = state.records[id]; if (r.attempts) out.attempted++; if (isMastered(r)) out.mastered++; if (r.attempts && r.nextDue <= now) out.due++; if (r.wrong) out.wrong++; if (r.favorite) out.favorites++;
      out.totalAttempts += r.attempts; out.correctAttempts += r.correct; out.cleanCorrect += r.cleanCorrect;
    });
    out.accuracy = out.totalAttempts ? out.cleanCorrect / out.totalAttempts : 0; return out;
  }
  function validateSession(raw, data) {
    if (raw === null) return null;
    var db = index(data);
    keys(raw, ['version', 'ids', 'index', 'results', 'draft', 'hintUsed', 'mode', 'category', 'order', 'requestedCount', 'startedAt', 'completedAt'], '练习进度');
    if (raw.version !== VERSION || !Array.isArray(raw.ids) || raw.ids.length > 50 || new Set(raw.ids).size !== raw.ids.length || raw.ids.some(function (id) { return typeof id !== 'string' || !db.words.has(id); })) fail('练习队列含有未知或重复词条');
    if (!integer(raw.index) || raw.index > raw.ids.length || !plain(raw.results) || typeof raw.draft !== 'string' || raw.draft.length > 2000 || typeof raw.hintUsed !== 'boolean' || ['meaning', 'audio'].indexOf(raw.mode) < 0 || ['smart', 'random'].indexOf(raw.order) < 0 || [10, 20, 30, 50].indexOf(raw.requestedCount) < 0 || raw.ids.length > raw.requestedCount) fail('练习进度内容不正确');
    if (typeof raw.category !== 'string' || ['all', 'favorites', 'wrong', 'due'].indexOf(raw.category) < 0 && !db.categories.has(raw.category)) fail('练习分类不正确');
    if (!time(raw.startedAt) || raw.completedAt !== null && (!time(raw.completedAt) || raw.completedAt < raw.startedAt) || (raw.index === raw.ids.length) !== (raw.completedAt !== null)) fail('练习完成状态不正确');
    Object.keys(raw.results).forEach(function (id) {
      var position = raw.ids.indexOf(id), word = db.words.get(id), r = raw.results[id];
      if (!word || position < 0 || position > raw.index) fail('练习结果含有队列之外的词条');
      keys(r, ['id', 'target', 'firstTyped', 'firstCorrect', 'firstHintUsed', 'attempts', 'typed', 'normalized', 'correct', 'isCorrect', 'currentCorrect', 'firstTry', 'hintUsed', 'independentCorrect', 'skipped', 'at'], '作答结果');
      if (r.id !== id || r.target !== word.word || !Array.isArray(r.attempts) || !r.attempts.length || r.attempts.length > 1000) fail('作答结果结构不正确');
      r.attempts.forEach(function (a, i) {
        keys(a, ['typed', 'correct', 'hintUsed', 'at', 'skipped'], '作答历史');
        if (typeof a.typed !== 'string' || a.typed.length > 2000 || typeof a.correct !== 'boolean' || a.correct !== checkAnswer(word, a.typed) || typeof a.hintUsed !== 'boolean' || typeof a.skipped !== 'boolean' || a.skipped !== !normalize(a.typed) || !time(a.at) || a.at < raw.startedAt || i && a.at < r.attempts[i - 1].at || i && r.attempts[i - 1].correct) fail('作答历史与实际拼写不一致');
      });
      var first = r.attempts[0], last = r.attempts[r.attempts.length - 1];
      if (r.firstTyped !== first.typed || r.firstCorrect !== first.correct || r.firstHintUsed !== first.hintUsed || r.typed !== last.typed || r.normalized !== normalize(last.typed) || r.correct !== last.correct || r.isCorrect !== last.correct || r.currentCorrect !== last.correct || r.firstTry !== (r.attempts.length === 1) || r.hintUsed !== last.hintUsed || r.independentCorrect !== (first.correct && !first.hintUsed) || r.skipped !== last.skipped || r.at !== last.at) fail('作答汇总与历史不一致');
      if (raw.completedAt !== null && last.at > raw.completedAt) fail('作答时间晚于交卷时间');
      if (position === raw.index && r.hintUsed && !raw.hintUsed) fail('当前提示标记与作答记录不一致');
    });
    for (var i = 0; i < raw.index; i++) if (!own(raw.results, raw.ids[i])) fail('已完成词条缺少作答记录');
    return clone(raw);
  }
  function exportBackup(state, session, now) { return { app: APP, version: VERSION, savedAt: stamp(now), state: clone(state), session: session ? clone(session) : null }; }
  function validateBackup(raw, data) {
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch (e) { fail('备份不是有效 JSON'); } }
    keys(raw, ['app', 'version', 'savedAt', 'state', 'session'], '备份');
    if (raw.app !== APP || raw.version !== VERSION || !time(raw.savedAt)) fail('这不是受支持的默写备份');
    var state = validateState(raw.state, data), session = validateSession(raw.session, data);
    if (session) Object.keys(session.results).forEach(function (id) {
      var r = own(state.records, id) && state.records[id], result = session.results[id];
      if (!r || r.attempts < result.attempts.length || r.wrong < result.attempts.filter(function (a) { return !a.correct; }).length || r.correct < result.attempts.filter(function (a) { return a.correct; }).length || r.lastAt < result.at) fail('答卷与学习记录不一致');
    });
    return { app: APP, version: VERSION, savedAt: raw.savedAt, state: state, session: session };
  }
  function letterDiff(expected, typed) {
    var a = Array.from(normalize(expected)), b = Array.from(normalize(typed));
    // Input is capped to keep a pasted paragraph from creating an unbounded matrix.
    if (a.length > 200 || b.length > 200) return [{ type: 'delete', expected: a.join(''), typed: '' }, { type: 'insert', expected: '', typed: b.slice(0, 200).join('') }];
    var table = Array.from({ length: a.length + 1 }, function () { return new Array(b.length + 1).fill(0); });
    for (var i = 0; i <= a.length; i++) table[i][0] = i;
    for (var j = 0; j <= b.length; j++) table[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) table[i][j] = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    var out = []; i = a.length; j = b.length;
    while (i || j) {
      if (i && j && table[i][j] === table[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { out.unshift({ type: a[i - 1] === b[j - 1] ? 'equal' : 'replace', expected: a[--i], typed: b[--j] }); }
      else if (i && table[i][j] === table[i - 1][j] + 1) out.unshift({ type: 'delete', expected: a[--i], typed: '' });
      else out.unshift({ type: 'insert', expected: '', typed: b[--j] });
    }
    return out;
  }
  function nearby(data, word, limit) {
    var db = index(data), seen = new Set([word.id]);
    return (word.shape || []).concat(word.sound || []).map(function (item) { return typeof item === 'string' ? item : item.id || item.word; }).filter(function (id) { if (seen.has(id) || !db.words.has(id)) return false; seen.add(id); return true; }).slice(0, limit === undefined ? 12 : limit).map(function (id) { return db.words.get(id); });
  }
  return { VERSION: VERSION, APP: APP, KEY: KEY, STATE_KEY: KEY, SESSION_KEY: SESSION_KEY, storageKey: KEY, sessionKey: SESSION_KEY, index: index, normalize: normalize, checkAnswer: checkAnswer, emptyState: emptyState, validateState: validateState, loadState: loadState, recordFor: recordFor, toggleFavorite: toggleFavorite, isMastered: isMastered, createSession: createSession, submit: submit, useHint: useHint, next: next, currentId: currentId, summary: summary, validateSession: validateSession, validateBackup: validateBackup, exportBackup: exportBackup, letterDiff: letterDiff, nearby: nearby, dayKey: dayKey };
});
