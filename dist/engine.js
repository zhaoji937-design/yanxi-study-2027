(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.QuizEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var STORAGE_KEY = 'yanxi-quiz-progress-v1';
  var TYPES = ['single', 'multiple', 'judgment', 'free'];

  function fail(message) { throw new Error(message); }
  function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function str(value, label, max) {
    if (typeof value !== 'string' || !value.trim()) fail(label + '不能为空');
    if (value.length > (max || 30000)) fail(label + '过长');
    return value.trim();
  }
  function id(value, label) {
    var text = str(value, label, 160);
    if (['__proto__', 'constructor', 'prototype'].indexOf(text) !== -1) fail(label + '不合法');
    return text;
  }
  function validateQuestion(raw, index) {
    var label = '第 ' + (index + 1) + ' 题：';
    if (!isObject(raw)) fail(label + '题目必须是对象');
    var qid = id(raw.id, label + 'id');
    var type = raw.type;
    if (TYPES.indexOf(type) === -1) fail(label + '题型不支持');
    if (!Array.isArray(raw.options)) fail(label + 'options 必须是数组');
    if (!Array.isArray(raw.answer) || raw.answer.length === 0) fail(label + 'answer 必须是非空数组');
    if (!Array.isArray(raw.tags)) fail(label + 'tags 必须是数组');
    if (![1, 2, 3].includes(raw.difficulty)) fail(label + 'difficulty 必须为 1、2 或 3');
    var optionIds = new Set();
    var options = raw.options.map(function (option) {
      if (!isObject(option)) fail(label + '选项必须是对象');
      var oid = id(option.id, label + '选项 id');
      if (optionIds.has(oid)) fail(label + '选项 id 重复');
      optionIds.add(oid);
      return { id: oid, text: str(option.text, label + '选项内容') };
    });
    var answer = raw.answer.map(function (value) { return str(value, label + '答案'); });
    if (new Set(answer).size !== answer.length) fail(label + '答案重复');
    if (type === 'free') {
      if (options.length !== 0) fail(label + '主观题 options 必须为空数组');
    } else {
      if (options.length < 2 || options.length > 26) fail(label + '客观题需要 2 至 26 个选项');
      if (type === 'judgment' && options.length !== 2) fail(label + '判断题需要 2 个选项');
      if ((type === 'single' || type === 'judgment') && answer.length !== 1) fail(label + '该题型只能有一个正确答案');
      if (answer.some(function (value) { return !optionIds.has(value); })) fail(label + '答案引用了不存在的选项');
    }
    var q = {
      id: qid,
      prompt: str(raw.prompt, label + '题干'),
      subject: str(raw.subject, label + '科目', 120),
      topic: str(raw.topic, label + '知识点', 240),
      type: type,
      options: options,
      answer: answer,
      explanation: str(raw.explanation, label + '解析', 50000),
      difficulty: raw.difficulty,
      tags: Array.from(new Set(raw.tags.map(function (tag) { return str(tag, label + '标签', 120); }))),
      sourceNote: str(raw.sourceNote, label + '来源说明', 3000)
    };
    if (raw.title != null) q.title = str(raw.title, label + '标题', 500);
    ['bookKey', 'chapterId', 'sectionId', 'termName'].forEach(function(field){
      if(raw[field]!=null)q[field]=str(raw[field],label+field,300);
    });
    if(raw.headingPath!=null){
      if(!Array.isArray(raw.headingPath)||raw.headingPath.length>6)fail(label+'教材标题路径不合法');
      q.headingPath=raw.headingPath.map(function(item){return str(item,label+'教材标题',500);});
    }
    if (raw.promptVariants != null) {
      if (!Array.isArray(raw.promptVariants) || raw.promptVariants.length > 20) fail(label + '变式问法必须是不超过20项的数组');
      q.promptVariants = Array.from(new Set(raw.promptVariants.map(function (item) { return str(item, label + '变式问法', 30000); })));
    }
    if (raw.examType != null) {
      if (type !== 'free' || !['term', 'short', 'essay'].includes(raw.examType)) fail(label + '专业课题型不合法');
      q.examType = raw.examType;
    }
    ['answerOutline', 'commonMistakes'].forEach(function (field) {
      if (raw[field] == null) return;
      if (!Array.isArray(raw[field]) || raw[field].length > 30) fail(label + field + '必须为不超过30项的数组');
      q[field] = raw[field].map(function (item) { return str(item, label + field, 3000); });
    });
    if (raw.textbookRefs != null) {
      if (!Array.isArray(raw.textbookRefs) || raw.textbookRefs.length > 10) fail(label + '教材出处不合法');
      q.textbookRefs = raw.textbookRefs.map(function (ref) {
        if (!isObject(ref) || !Array.isArray(ref.pdfPages) || !ref.pdfPages.length || ref.pdfPages.length > 30 || ref.pdfPages.some(function (p) { return !Number.isInteger(p) || p < 1 || p > 10000; })) fail(label + '教材PDF页码不合法');
        var clean = { bookTitle: str(ref.bookTitle, label + '教材名称', 300), chapter: str(ref.chapter, label + '章节', 500), pdfPages: Array.from(new Set(ref.pdfPages)).sort(function (a,b) { return a-b; }) };
        if (ref.printedPages != null) {
          if (!Array.isArray(ref.printedPages) || !ref.printedPages.length || ref.printedPages.length > 30 || ref.printedPages.some(function(p){return !Number.isInteger(p) || p < 1 || p > 10000;})) fail(label + '教材印刷页码不合法');
          clean.printedPages = Array.from(new Set(ref.printedPages)).sort(function(a,b){return a-b;});
        }
        return clean;
      });
    }
    if (raw.groupId != null) q.groupId = id(raw.groupId, label + '分组 id');
    if (raw.passage != null) {
      if (!isObject(raw.passage)) fail(label + 'passage 必须是对象');
      q.passage = {
        title: str(raw.passage.title, label + '阅读材料标题', 500),
        text: str(raw.passage.text, label + '阅读材料正文', 100000)
      };
    }
    if (raw.sourceUrls != null) {
      if (!Array.isArray(raw.sourceUrls)) fail(label + 'sourceUrls 必须是数组');
      q.sourceUrls = raw.sourceUrls.map(function (source) {
        var text = str(source, label + '来源链接', 4000);
        var url;
        try { url = new URL(text); } catch (_) { fail(label + '来源链接无效'); }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') fail(label + '来源链接必须使用 HTTP 或 HTTPS');
        return text;
      });
    }
    return q;
  }
  function validateBank(input) {
    var raw = Array.isArray(input) ? { questions: input } : input;
    if (!isObject(raw) || !Array.isArray(raw.questions)) fail('题库必须包含 questions 数组');
    if (raw.version != null && raw.version !== 1) fail('不支持此题库版本');
    if (raw.questions.length > 10000) fail('单个题库最多支持 10000 道题');
    var seen = new Set();
    var questions = raw.questions.map(function (q, index) {
      var normalized = validateQuestion(q, index);
      if (seen.has(normalized.id)) fail('题目 id 重复：' + normalized.id);
      seen.add(normalized.id);
      return normalized;
    });
    return { version: 1, title: raw.title == null ? '我的模拟题库' : str(raw.title, '题库标题', 500), questions: questions };
  }
  function parseBank(text) {
    var raw;
    try { raw = JSON.parse(text); } catch (_) { fail('文件不是有效的 JSON，请检查文件格式'); }
    return validateBank(raw);
  }
  function selectedList(selected) {
    if (selected instanceof Set) return Array.from(selected);
    if (Array.isArray(selected)) return selected;
    if (typeof selected === 'string') return [selected];
    if (selected == null) return [];
    fail('所选答案格式不正确');
  }
  function grade(question, selected) {
    if (question.type === 'free') return { correct: null, manual: true };
    var values = new Set(selectedList(selected));
    var allowed = new Set(question.options.map(function (option) { return option.id; }));
    values.forEach(function (value) { if (!allowed.has(value)) fail('所选答案包含无效选项'); });
    var correct = values.size === question.answer.length && question.answer.every(function (value) { return values.has(value); });
    return { correct: correct, manual: false };
  }
  function emptyState() { return { version: 1, records: {}, history: [] }; }
  function emptyRecord() { return { attempts: 0, correct: 0, wrong: 0, lastAnsweredAt: null, mastered: false, favorite: false }; }
  function validDate(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
  function nonnegativeInteger(value) { return Number.isSafeInteger(value) && value >= 0; }
  function sanitizeState(raw) {
    if (!isObject(raw) || raw.version !== 1 || !isObject(raw.records) || !Array.isArray(raw.history)) return emptyState();
    var state = emptyState();
    Object.keys(raw.records).forEach(function (qid) {
      if (['__proto__', 'constructor', 'prototype'].includes(qid)) return;
      var record = raw.records[qid];
      if (!isObject(record) || !nonnegativeInteger(record.attempts) || !nonnegativeInteger(record.correct) || !nonnegativeInteger(record.wrong)) return;
      if (record.correct + record.wrong !== record.attempts) return;
      state.records[qid] = {
        attempts: record.attempts, correct: record.correct, wrong: record.wrong,
        lastAnsweredAt: validDate(record.lastAnsweredAt) ? record.lastAnsweredAt : null,
        mastered: record.mastered === true, favorite: record.favorite === true
      };
    });
    state.history = raw.history.filter(function (entry) {
      return isObject(entry) && typeof entry.questionId === 'string' && Object.prototype.hasOwnProperty.call(state.records, entry.questionId) && typeof entry.correct === 'boolean' && validDate(entry.answeredAt);
    }).map(function (entry) { return { questionId: entry.questionId, correct: entry.correct, answeredAt: entry.answeredAt }; });
    return state;
  }
  function loadState(storage, key) {
    try {
      if (!storage || typeof storage.getItem !== 'function') return emptyState();
      var raw = storage.getItem(key || STORAGE_KEY);
      return raw ? sanitizeState(JSON.parse(raw)) : emptyState();
    } catch (_) { return emptyState(); }
  }
  function saveState(storage, state, key) {
    try {
      if (!storage || typeof storage.setItem !== 'function') return false;
      storage.setItem(key || STORAGE_KEY, JSON.stringify(sanitizeState(state)));
      return true;
    } catch (_) { return false; }
  }
  function recordAnswer(state, question, selected, options) {
    options = options || {};
    var result = grade(question, selected);
    var correct = result.correct;
    if (result.manual) {
      if (typeof options.mastered !== 'boolean') fail('主观题请自行判断是否掌握');
      correct = options.mastered;
    }
    var moment = options.now == null ? new Date() : new Date(options.now);
    if (!Number.isFinite(moment.getTime())) fail('答题时间无效');
    var next = sanitizeState(state);
    var qid = id(question.id, '题目 id');
    var old = next.records[qid] || emptyRecord();
    next.records[qid] = {
      attempts: old.attempts + 1, correct: old.correct + (correct ? 1 : 0), wrong: old.wrong + (correct ? 0 : 1),
      lastAnsweredAt: moment.toISOString(), mastered: correct, favorite: old.favorite
    };
    next.history.push({ questionId: qid, correct: correct, answeredAt: moment.toISOString() });
    return next;
  }
  function toggleFavorite(state, questionId) {
    var next = sanitizeState(state);
    var qid = id(questionId, '题目 id');
    var record = next.records[qid] || emptyRecord();
    next.records[qid] = Object.assign({}, record, { favorite: !record.favorite });
    return next;
  }
  function dayKey(value) {
    var date = value instanceof Date ? value : new Date(value);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function getStats(state, questions, options) {
    options = options || {};
    var clean = sanitizeState(state);
    var ids = Array.isArray(questions) ? new Set(questions.map(function (question) { return question.id; })) : null;
    var records = Object.keys(clean.records).filter(function (qid) { return !ids || ids.has(qid); }).map(function (qid) { return clean.records[qid]; });
    var history = clean.history.filter(function (entry) { return !ids || ids.has(entry.questionId); });
    var attempts = records.reduce(function (sum, r) { return sum + r.attempts; }, 0);
    var correct = records.reduce(function (sum, r) { return sum + r.correct; }, 0);
    var now = options.now == null ? new Date() : new Date(options.now);
    var today = dayKey(now);
    var daily = {};
    history.forEach(function (entry) {
      var key = dayKey(entry.answeredAt);
      if (!daily[key]) daily[key] = { date: key, attempts: 0, correct: 0 };
      daily[key].attempts++;
      if (entry.correct) daily[key].correct++;
    });
    var days = [];
    for (var offset = 6; offset >= 0; offset--) {
      var date = new Date(now);
      date.setDate(date.getDate() - offset);
      var key = dayKey(date);
      days.push(daily[key] || { date: key, attempts: 0, correct: 0 });
    }
    var cursor = new Date(now);
    cursor.setHours(12, 0, 0, 0);
    if (!daily[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    var streak = 0;
    while (daily[dayKey(cursor)]) { streak++; cursor.setDate(cursor.getDate() - 1); }
    return {
      totalQuestions: ids ? ids.size : records.length,
      attempts: attempts, correct: correct, wrong: attempts - correct,
      accuracy: attempts ? Math.round(correct / attempts * 100) : 0,
      answeredQuestions: records.filter(function (r) { return r.attempts > 0; }).length,
      masteredQuestions: records.filter(function (r) { return r.mastered; }).length,
      favoriteQuestions: records.filter(function (r) { return r.favorite; }).length,
      wrongQuestions: records.filter(function (r) { return r.wrong > 0 && !r.mastered; }).length,
      todayAttempts: daily[today] ? daily[today].attempts : 0,
      streak: streak, history: days
    };
  }
  function shuffle(items, rng) {
    var result = items.slice();
    var random = rng || Math.random;
    for (var i = result.length - 1; i > 0; i--) {
      var value = random();
      if (typeof value !== 'number' || value < 0 || value >= 1) fail('随机数必须位于 [0, 1)');
      var j = Math.floor(value * (i + 1));
      var item = result[i]; result[i] = result[j]; result[j] = item;
    }
    return result;
  }
  return Object.freeze({
    STORAGE_KEY: STORAGE_KEY, validateBank: validateBank, parseBank: parseBank, grade: grade,
    emptyState: emptyState, loadState: loadState, saveState: saveState, recordAnswer: recordAnswer,
    toggleFavorite: toggleFavorite, getStats: getStats, shuffle: shuffle
  });
});
