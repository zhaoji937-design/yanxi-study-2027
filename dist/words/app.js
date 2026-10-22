(function () {
  'use strict';
  const C = window.WordCore, $ = selector => document.querySelector(selector), E = C.escape;
  const main = $('#main');
  let data, db, state = C.fresh(), concealed = false, selected = [], session = null, importPending = null;
  let listKind = 'all', listQuery = '', wordQuery = '', wordLimit = 50, mineTab = 'review';
  let toastTimer, lastRoute = '', offlineText = '等待离线保存', storedError = '', unreadableBackup = '';
  const kindLabel = kind => C.kinds[kind] || kind;
  const routeLink = (path, text, cls = '') => `<a class="${cls}" href="#${E(path)}">${text}</a>`;
  const empty = text => `<div class="empty">${text}</div>`;
  const button = (action, text, cls = '', attrs = '') => `<button type="button" data-action="${action}" class="${cls}" ${attrs}>${text}</button>`;
  const back = (path = 'home', text = '返回辨析') => routeLink(path, '‹ ' + text, 'back');
  function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4200); }
  function commit(next, replaceUnreadable = false) {
    if (storedError && !replaceUnreadable) { toast('原记录无法读取。请先到设置导出原记录，再导入可用备份，避免覆盖。'); return false; }
    try { state = C.save(localStorage, next, db); return true; }
    catch (_) { toast('未能保存。请检查浏览器存储空间或隐私设置，现有记录未被覆盖。'); return false; }
  }
  function toggleGroup(field, id) {
    const next = structuredCopy(state); next[field] = next[field].includes(id) ? next[field].filter(x => x !== id) : next[field].concat(id);
    if (field === 'mastered' && next.mastered.includes(id)) next.review = next.review.filter(x => x !== id);
    if (field === 'review' && next.review.includes(id)) next.mastered = next.mastered.filter(x => x !== id);
    if (commit(next)) render();
  }
  function structuredCopy(value) { return JSON.parse(JSON.stringify(value)); }
  function speak(words) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { toast('这个浏览器暂不支持朗读，可查看音标。'); return; }
    const synth = window.speechSynthesis; synth.cancel();
    const utterance = new SpeechSynthesisUtterance(words.join('. '));
    const voices = synth.getVoices(); const english = voices.find(v => v.lang === 'en-US') || voices.find(v => /^en[-_]/i.test(v.lang));
    if (english) utterance.voice = english;
    utterance.lang = english?.lang || 'en-US'; utterance.rate = .8;
    utterance.onerror = event => { if (!['canceled', 'interrupted'].includes(event.error)) toast('设备英语朗读暂不可用，请检查系统语音或网络。'); };
    synth.speak(utterance);
  }
  function soundButton(words, label = '朗读') { return button('speak', '♪', 'speak', `data-words="${E(words.join(','))}" aria-label="${E(label + ' ' + words.join(', '))}" title="${E(label)}"`); }
  function groupRow(group) {
    const status = state.mastered.includes(group.id) ? ' · 已掌握' : state.review.includes(group.id) ? ' · 待复习' : '';
    return routeLink('group/' + group.id, `<span><strong>${E(group.entries.map(x => x.word).join(' · '))}</strong><span class="muted">${E(kindLabel(group.kind))} · ${group.entries.length} 词${status}</span></span><span class="arrow" aria-hidden="true">›</span>`, 'group-row');
  }
  function heading(title, sub = '', eyebrow = '') { return `<div class="page-heading">${eyebrow ? `<p class="eyebrow">${E(eyebrow)}</p>` : ''}<h1>${E(title)}</h1>${sub ? `<p class="intro">${E(sub)}</p>` : ''}</div>`; }
  function searchInput(id, value, placeholder) { return `<div class="searchbox"><label class="visually-hidden" for="${id}">${E(placeholder)}</label><input id="${id}" type="search" autocomplete="off" spellcheck="false" placeholder="${E(placeholder)}" value="${E(value)}">${button('clear-search', '×', 'clear', `data-for="${id}" aria-label="清空搜索"`)}</div>`; }
  function home() {
    const first = data.groups[0];
    return heading('看清区别，再记住。', `${data.meta.wordCount} 词可查 · ${data.meta.groupCount} 组重点辨析`, 'WORDS, SIDE BY SIDE') +
      `<section class="hero" aria-label="你的第一组易混词"><div class="heading-row"><h2>先从你容易混的词开始</h2><span class="tag">词性 × 词义</span></div><div class="mini-words">${first.entries.map(e => `<div class="mini-word"><strong>${E(e.word)}</strong><small>${E(e.pos)}</small><p>${E(e.meaning)}</p></div>`).join('')}</div><div class="row">${routeLink('group/' + first.id, '并排看清区别 →', 'primary-link')}${routeLink('practice/' + first.id, '放进句子试试', 'quiet-link')}</div></section>` +
      `<div class="section-head"><h2>重点辨析</h2>${routeLink('custom', '＋ 自建易混组', 'quiet-link')}</div><div class="toolbar">${searchInput('group-search', listQuery, '搜索单词、中文意思或辨析线索')}</div><div class="chips" role="group" aria-label="辨析类型">${[['all', '全部'], ...Object.entries(C.kinds)].map(([k, v]) => button('kind', E(v), 'chip' + (listKind === k ? ' active' : ''), `data-kind="${k}" aria-pressed="${listKind === k}"`)).join('')}</div><p class="notes" id="group-count"></p><div class="section group-list" id="group-results"></div>`;
  }
  function paintGroups() {
    const q = C.normal(listQuery);
    const results = data.groups.filter(g => (listKind === 'all' || g.kind === listKind) && (!q || [g.title, g.contrast, ...g.entries.flatMap(e => [e.word, e.meaning, e.focus])].join(' ').toLowerCase().includes(q)));
    $('#group-count').textContent = `${results.length} 组 · 可直接看题与答案，不必作答`;
    $('#group-results').innerHTML = results.length ? results.map(groupRow).join('') : empty('没有找到这组词。可以去“查词”自由选择，或自建易混组。');
  }
  function wordCard(entry, peers, curated = true) {
    const w = db.words.get(entry.word), words = peers.map(e => typeof e === 'string' ? e : e.word);
    const ipa = entry.ipa || w.ipa;
    return `<article class="word-card"><div class="word-title"><h2>${routeLink('word/' + w.word, C.highlight(w.word, words))}</h2>${soundButton([w.word])}</div><p class="ipa">${ipa ? '/' + E(ipa) + '/' : '音标暂缺'}${entry.ipaLabel ? ' · ' + E(entry.ipaLabel) : ''}</p>` + (concealed ? `<div class="hidden-meaning">中文已遮住，先想一想</div>${curated ? `<p class="example" lang="en">${E(entry.sentence)}</p>` : ''}` :
      `<p class="meaning">${curated ? `<span class="pos">${E(entry.pos)}</span>${E(entry.meaning)}` : E(w.meaning)}</p>${curated ? `<p class="hint">${E(entry.focus)}</p><p class="example" lang="en">${E(entry.sentence)}</p><p class="example-zh">${E(entry.zh)}</p>` : `<p class="notes">${w.meaningSource === 'curated' ? '重点辨析常用义' : '基础词典释义'}</p>`}`) + (curated ? button('speak', '听例句', 'plain-button sentence-audio', `data-text="${E(entry.sentence)}" aria-label="听 ${E(w.word)} 的例句"`) : '') + '</article>';
  }
  function compareToolbar(words) { return `<div class="toolbar">${button('conceal', concealed ? '显示中文释义' : '遮住中文，快速回忆', 'toggle', `aria-pressed="${concealed}"`)}${button('speak', '依次听读音', '', `data-words="${E(words.join(','))}"`)}</div>`; }
  function groupPage(id) {
    const g = db.groups.get(id); if (!g) return missing();
    const n = data.groups.indexOf(g), words = g.entries.map(e => e.word);
    return back() + heading(g.entries.map(e => e.word).join(' · '), kindLabel(g.kind)) + compareToolbar(words) +
      (concealed ? '' : `<p class="contrast">${E(g.contrast)}</p>`) +
      `<div class="compare-grid ${words.length === 2 ? 'two' : words.length === 4 ? 'four' : ''}">${g.entries.map(e => wordCard(e, g.entries)).join('')}</div>` +
      `<div class="bottom-row"><div class="row">${routeLink('practice/' + id, '语境辨义 · ' + g.questions.length + ' 题', 'primary-link')}${button('favorite', state.favorites.includes(id) ? '★ 已收藏' : '☆ 收藏', 'toggle', `data-id="${E(id)}" aria-pressed="${state.favorites.includes(id)}"`)}${button('review', state.review.includes(id) ? '✓ 待复习' : '放入复习', 'toggle', `data-id="${E(id)}" aria-pressed="${state.review.includes(id)}"`)}${button('mastered', state.mastered.includes(id) ? '✓ 已掌握' : '标记掌握', 'toggle', `data-id="${E(id)}" aria-pressed="${state.mastered.includes(id)}"`)}</div></div>` +
      `<p class="notes">标色帮助看清拼写差别；不是词源拆解。多音词请结合词性与例句判断，设备单词朗读可能只读一种读音。例句与辨析为原创。</p><div class="bottom-row">${n ? routeLink('group/' + data.groups[n - 1].id, '‹ 上一组', 'quiet-link') : '<span></span>'}${n + 1 < data.groups.length ? routeLink('group/' + data.groups[n + 1].id, '下一组 ›', 'quiet-link') : ''}</div>`;
  }
  function selectionBar() { return selected.length ? `<div class="selection"><span>已选 ${selected.length}/4</span>${selected.map(w => button('remove-selected', E(w) + ' ×', 'selected-word', `data-word="${E(w)}"`)).join('')}${button('compare-selected', '并排对照', 'primary', selected.length < 2 ? 'disabled' : '')}${button('clear-selected', '清空', 'plain-button')}</div>` : ''; }
  function searchPage() { return heading('把容易混的词，放在一起。', '可查中英文；点“＋”选 2–4 词并排对照。') + `<div id="selection">${selectionBar()}</div><div class="toolbar">${searchInput('word-search', wordQuery, '搜索英文或中文意思')}</div><p class="notes" id="word-count"></p><div class="section list" id="word-results"></div>`; }
  function paintWords() {
    const results = C.search(data.words, wordQuery), visible = results.slice(0, wordLimit);
    $('#word-count').textContent = `${results.length} 词${results.length > wordLimit ? ` · 已显示 ${visible.length}` : ''} · 含考研标记词与词族补充`;
    $('#selection').innerHTML = selectionBar();
    $('#word-results').innerHTML = visible.length ? visible.map(w => `<div class="word-row">${routeLink('word/' + w.word, `<strong>${E(w.word)}</strong><span class="muted">${E(w.brief)}</span>`)}${button('select-word', selected.includes(w.word) ? '✓' : '＋', 'add-word toggle', `data-word="${E(w.word)}" aria-label="${selected.includes(w.word) ? '移除' : '选择'} ${E(w.word)}" aria-pressed="${selected.includes(w.word)}"`)}</div>`).join('') + (results.length > wordLimit ? button('more-words', '再显示 50 词', 'load-more') : '') : empty('暂未收录这个词。可以试试原形，或换一个中文意思。');
  }
  function candidates(w, key, label) {
    if (!w[key].length) return `<section class="section"><h2>${label}</h2><p class="notes">当前词库没有足够接近的候选。你仍可自由选择或自建易混组。</p></section>`;
    return `<section class="section"><h2>${label}</h2><p class="notes">点一个候选词，与 ${E(w.word)} 直接对照。</p><div class="candidates">${w[key].map(v => routeLink('compare/' + w.word + ',' + v, E(v), 'candidate')).join('')}</div></section>`;
  }
  function wordPage(word) {
    const w = db.words.get(word); if (!w) return missing('词库里暂时没有这个词。');
    return `<div class="word-detail">${back('search', '返回查词')}<div class="panel"><div class="word-title"><h1>${E(w.word)}</h1>${soundButton([w.word])}</div><p class="ipa">${w.ipa ? '/' + E(w.ipa) + '/' : '音标暂缺'}</p><p class="meaning">${E(w.meaning)}</p><p class="notes">${w.meaningSource === 'curated' ? '重点辨析中的常用义；并非该词全部词典义项。' : '基础释义来自开源词典；未逐词完成教学审订。'}${w.exam ? '' : ' 本词属于词族或辨析补充。'}</p><div class="row section">${button('select-word', selected.includes(w.word) ? '✓ 已选入对照' : '＋ 选入对照', 'toggle', `data-word="${E(w.word)}" aria-pressed="${selected.includes(w.word)}"`)}${selected.length >= 2 ? routeLink('compare/' + selected.join(','), `查看所选 ${selected.length} 词 →`, 'primary-link') : routeLink('search', '再选一个词 →', 'quiet-link')}</div></div>` +
      (w.groups.length ? `<section class="section"><div class="section-head"><h2>已整理的重点辨析</h2></div><div class="list">${w.groups.map(id => groupRow(db.groups.get(id))).join('')}</div></section>` : '') +
      candidates(w, 'shape', '字形候选') + candidates(w, 'sound', '音近候选 · 美音') + `<p class="notes">候选由拼写距离与 CMU 美式读音数据计算，只帮你发现可能混淆的词；不表示它们含义相近。音标主要采用英式记法，朗读取决于设备语音。</p></div>`;
  }
  function parseWords(value) { return [...new Set(String(value || '').toLowerCase().split(/[\s,，、;；·]+/).filter(Boolean))]; }
  function plainCompare(words, note = '', pairId = '') {
    if (words.length < 2 || words.length > 4 || words.some(w => !db.words.has(w))) return missing('请从词库选择 2–4 个不同的词。');
    const common = data.groups.filter(g => words.every(w => g.entries.some(e => e.word === w)));
    return back(pairId ? 'mine' : 'search', pairId ? '返回我的易混组' : '返回查词') + heading(words.join(' · '), pairId ? '我的易混组' : '自由对照 · 先看词性，再看意思') +
      (note && !concealed ? `<p class="contrast">${E(note)}</p>` : '') + compareToolbar(words) + `<div class="compare-grid ${words.length === 2 ? 'two' : words.length === 4 ? 'four' : ''}">${words.map(word => wordCard({ word }, words, false)).join('')}</div>` +
      `<p class="notes">这里只并排展示释义；没有自动推断你为什么会混淆。你可以记下自己的读音联想。</p><div class="row section">${pairId ? routeLink('pair-edit/' + pairId, '修改我的提示', 'primary-link') : routeLink('custom/' + words.join(','), '保存为我的易混组', 'primary-link')}${pairId ? button('delete-pair', '删除这一组', '', `data-id="${E(pairId)}"`) : ''}</div>` +
      (common.length ? `<section class="section"><h2>这组词已有详细辨析</h2><div class="section list">${common.map(groupRow).join('')}</div></section>` : '');
  }
  function affixesPage() { return heading('开头相像，也要分清。', '把相似开头与词尾放在一起，核对完整意思。') + `<div class="affix-list">${data.affixes.map(a => routeLink('affix/' + a.id, `<h2>${E(a.title)}</h2><p>${E(a.hint)}</p><p class="notes">${a.words.length} 词 · 点开对照 ›</p>`, 'affix-card')).join('')}</div>`; }
  function affixPage(id) {
    const a = data.affixes.find(a => a.id === id); if (!a) return missing();
    return back('affixes', '返回词缀') + heading(a.title) + `<p class="contrast">${E(a.hint)}</p><p class="notes">${E(a.note)}</p><div class="toolbar">${button('conceal', concealed ? '显示中文释义' : '遮住中文，快速回忆', 'toggle', `aria-pressed="${concealed}"`)}${routeLink('compare/' + a.words.slice(0, 4).join(','), '先对照前 4 词', 'quiet-link')}</div><div class="list">${a.words.map(word => { const w = db.words.get(word); return `<div class="word-row">${routeLink('word/' + word, `<strong>${E(word)}</strong>${concealed ? '<span class="muted">中文已遮住</span>' : `<span class="muted">${E(w.brief)}</span>`}`)}${soundButton([word])}${button('select-word', selected.includes(word) ? '✓' : '＋', 'add-word', `data-word="${E(word)}" aria-label="选择 ${E(word)}"`)}</div>`; }).join('')}</div>` + (selected.length >= 2 ? `<div class="row section">${routeLink('compare/' + selected.join(','), '对照已选 ' + selected.length + ' 词', 'primary-link')}${button('clear-selected', '清空选择', 'plain-button')}</div>` : '');
  }
  function customPage(words = [], id = '') {
    const pair = id ? state.pairs.find(p => p.id === id) : null; if (id && !pair) return missing();
    return back('mine', '返回我的') + heading(pair ? '修改易混组' : '建一组自己的易混词', '长得不像、只是读音让你联想到一起，也可以记在这里。') + `<form id="pair-form" class="panel form" data-id="${E(id)}"><label for="pair-words">单词 · 2–4 个</label><input id="pair-words" required autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="160" value="${E((pair?.words || words).join(', '))}" placeholder="例如 generalization, generalize, generally"><p class="notes">用逗号或空格分隔，支持当前 3600 词库里的单词。</p><label for="pair-note">我为什么会混淆？怎么区分？</label><textarea id="pair-note" maxlength="400" placeholder="写下你自己的发音联想或辨认线索…">${E(pair?.note || '')}</textarea><div class="row"><button type="submit" class="primary">保存并对照</button>${routeLink('search', '去词库选词', 'quiet-link')}</div><p id="pair-error" class="message error" hidden role="alert"></p></form>`;
  }
  function minePage() {
    const tabs = [['review', '待复习', state.review.length], ['favorites', '收藏', state.favorites.length], ['pairs', '自建组', state.pairs.length], ['mistakes', '混淆记录', state.mistakes.length]];
    let body;
    if (mineTab === 'pairs') body = state.pairs.length ? state.pairs.map(p => `<div class="note-card">${routeLink('pair/' + p.id, `<h3>${E(p.words.join(' · '))} ›</h3>`)}${p.note ? `<p>${E(p.note)}</p>` : ''}</div>`).join('') : empty('<p>还没有自己的易混组。</p><p>因读音产生的个人联想，也能放在一起对照。</p>');
    else if (mineTab === 'mistakes') body = state.mistakes.length ? state.mistakes.slice().sort((a, b) => b.last - a.last).map(m => { const q = db.questions.get(m.id); return `<div class="note-card">${routeLink('group/' + q.group, `<h3>${E(m.target)} ↔ ${E(m.chosen)} <span class="tag">混淆 ${m.count} 次</span></h3>`)}<p>本题参考：${E(q.answer.join(' / '))} · 你选择了 ${E(m.chosen)}</p><p lang="en">${E(q.sentence)}</p>${routeLink('practice/' + q.group, '再辨认一次 →', 'quiet-link')}</div>`; }).join('') : empty('完成语境辨义后，答错时选混的词会记录在这里。直接看答案不会计错。');
    else { const ids = state[mineTab]; body = ids.length ? `<div class="group-list">${ids.map(id => groupRow(db.groups.get(id))).join('')}</div>` : empty(mineTab === 'review' ? '还没有待复习组。在辨析页点“放入复习”，或答题后自动记录。' : '还没有收藏。找到想常看的辨析，点“☆ 收藏”。'); }
    return heading('只留下你需要复习的。', '记录保存在当前浏览器；换设备前可到设置导出备份。') + `<div class="stats">${routeLink('search', data.meta.wordCount + ' 词可查')}${routeLink('home', data.meta.groupCount + ' 组辨析')}${routeLink('practice/all', '已辨义 ' + state.stats.attempts + ' 次')}${routeLink('mastered', '已掌握 ' + state.mastered.length + ' 组')}</div><div class="row">${routeLink('custom', '＋ 自建易混组', 'primary-link')}${state.review.length ? routeLink('practice/review', '练习待复习组 →', 'quiet-link') : ''}</div><div class="section chips">${tabs.map(([k, v, n]) => button('mine-tab', `${v} ${n}`, 'chip' + (mineTab === k ? ' active' : ''), `data-tab="${k}" aria-pressed="${mineTab === k}"`)).join('')}</div><div class="section">${body}</div>`;
  }
  function shuffle(list) { const copy = list.slice(); for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
  function startSession(key) {
    const groups = key === 'all' ? data.groups : key === 'review' ? state.review.map(id => db.groups.get(id)) : [db.groups.get(key)].filter(Boolean);
    let questions = groups.flatMap(g => g.questions); if (key === 'all' || key === 'review') questions = shuffle(questions);
    session = { key, questions, at: 0, choice: null, revealed: false, answered: false, options: [], correct: 0, attempts: 0, skipped: 0 };
  }
  function quizPage(key) {
    if (!session || session.key !== key) startSession(key);
    const s = session;
    if (!s.questions.length) return back('mine', '返回我的') + empty('暂时没有可练习的题目，先选几组放入复习。');
    if (s.at >= s.questions.length) return `<div class="quiz-shell">${back('home')}<div class="panel">${heading('这一轮看完了。', `作答 ${s.attempts} 题 · 正确 ${s.correct} 题 · 跳过或直接看答案 ${s.skipped} 题`)}<p class="muted">直接看辨析与跳过不计入答题次数。</p><div class="row section">${button('restart-practice', '再练一轮', 'primary')}${routeLink('mine', '去看混淆记录 →', 'quiet-link')}</div></div></div>`;
    const q = s.questions[s.at]; if (!s.options.length) s.options = shuffle(q.options);
    const show = s.answered || s.revealed, correct = s.answered && C.grade(q, s.choice);
    return `<div class="quiz-shell">${back(key === 'all' || key === 'review' ? 'mine' : 'group/' + key, '退出练习')}<div class="heading-row"><h1>放进句子，分清意思。</h1><span class="muted nowrap">${s.at + 1} / ${s.questions.length}</span></div><div class="progress" aria-hidden="true"><span style="width:${s.at / s.questions.length * 100}%"></span></div><div class="panel"><span class="tag">${E(kindLabel(db.groups.get(q.group).kind))}</span><p class="quiz-sentence" lang="en">${E(q.sentence)}</p><p class="quiz-intent">想表达：${E(q.intent)}</p><div class="options">${s.options.map(w => button('answer', E(w), 'option' + (show && q.answer.includes(w) ? ' correct' : s.choice === w && !correct ? ' wrong' : ''), `data-word="${E(w)}" ${show ? 'disabled' : ''}`)).join('')}</div>${show ? `<div class="feedback" role="status"><strong>${s.revealed ? '直接看辨析 · 不计作答' : correct ? '这次辨认正确。' : '这组词再对照一下。'} 参考：${E(q.answer.join(' / '))}</strong><p>${E(q.explanation)}</p></div>` : ''}<div class="bottom-row"><div class="row">${show ? button('next-question', s.at + 1 === s.questions.length ? '完成这一轮' : '下一题 →', 'primary') : button('reveal-question', '直接看答案')}${!show ? button('skip-question', '跳过', 'plain-button') : ''}</div>${routeLink('group/' + q.group, '看完整辨析', 'quiet-link')}</div></div><p class="notes">中文句意帮助明确表达目标；真实用法有重叠时，会接受多种答案。原创题不是真题。</p></div>`;
  }
  function settingsPage() {
    return `<div class="settings">${back()}${heading('备份与设置')}<section class="panel"><h2>在 Safari 中使用</h2><p id="offline-detail">${E(offlineText)}</p><p>Safari 点“分享”→“添加到主屏幕”，可像应用一样打开。首次打开请等到右上角显示“可离线”；朗读是否离线可用取决于设备语音。</p><div class="row">${button('check-offline', '检查离线保存')}${routeLink('home', '回到辨析', 'quiet-link')}</div></section><section class="panel"><h2>备份我的记录</h2><p>包含收藏、待复习、自建易混组、混淆记录。记录只存于当前设备，不会自动同步；iPhone、iPad 可通过导出和导入迁移。</p>${storedError ? `<p class="message error">${E(storedError)}</p>` : ''}<div class="row">${button('export', storedError ? '导出原始记录' : '导出备份')}<label class="file-label" for="backup-file">导入备份</label><input id="backup-file" type="file" accept=".json,application/json" class="visually-hidden"></div><div id="import-area"></div></section><section class="panel"><h2>词库与内容说明</h2><p>${data.meta.wordCount} 词 · ${data.meta.groupCount} 组原创重点辨析 · ${data.meta.questionCount} 道原创语境题。基础词典与自动候选不等于全部已写好详细辨析。</p><p>${E(data.meta.selection)}</p><p>重点辨析的中文解释、辨认线索与例句为原创。其他基础释义采用 ECDICT；音标主要为英式记法，音近候选采用 CMUdict 美式读音。部分词典义项尚待复核，候选只用来辅助查找。</p><p>朗读使用设备的英语语音。相同拼写有不同读音、重音或英美差异时，设备读音可能不同。</p><p><a class="source" href="https://github.com/skywind3000/ECDICT" target="_blank" rel="noopener noreferrer">ECDICT 来源</a> · <a class="source" href="licenses/ECDICT.txt">MIT 许可</a><br><a class="source" href="https://github.com/cmusphinx/cmudict" target="_blank" rel="noopener noreferrer">CMUdict 来源</a> · <a class="source" href="licenses/cmudict.txt">许可声明</a></p><p>词形辅助参考：<a class="source" href="https://dictionary.cambridge.org/us/grammar/british-grammar/word-formation_2" target="_blank" rel="noopener noreferrer">Cambridge 词形构成说明</a>。不把相同开头一概当成相同词根。</p></section><section class="panel"><h2>研习题库</h2><p>专业课、政治与英语练习仍在原来的题库中。</p><a class="source" href="../">打开研习题库 →</a></section></div>`;
  }
  function missing(text = '这个页面暂时不存在。') { return back() + empty(E(text)); }
  function currentRoute() { try { return decodeURIComponent(location.hash.slice(1)) || 'home'; } catch (_) { return 'home'; } }
  function render() {
    if (!data) return;
    const route = currentRoute(), [page, arg = ''] = route.split('/');
    const changed = route !== lastRoute; if (changed) { window.speechSynthesis?.cancel(); lastRoute = route; }
    let html;
    switch (page) {
      case 'home': html = home(); break;
      case 'group': html = groupPage(arg); break;
      case 'search': html = searchPage(); break;
      case 'word': html = wordPage(arg); break;
      case 'compare': html = plainCompare(parseWords(arg)); break;
      case 'affixes': html = affixesPage(); break;
      case 'affix': html = affixPage(arg); break;
      case 'mine': html = minePage(); break;
      case 'mastered': html = back('mine', '返回我的') + heading('已掌握的辨析') + (state.mastered.length ? `<div class="group-list">${state.mastered.map(id => groupRow(db.groups.get(id))).join('')}</div>` : empty('还没有标记掌握的组。')); break;
      case 'custom': html = customPage(parseWords(arg)); break;
      case 'pair-edit': html = customPage([], arg); break;
      case 'pair': { const p = state.pairs.find(p => p.id === arg); html = p ? plainCompare(p.words, p.note, p.id) : missing(); break; }
      case 'practice': html = quizPage(arg); break;
      case 'settings': html = settingsPage(); break;
      default: html = missing();
    }
    main.innerHTML = html;
    if (page === 'home') paintGroups(); if (page === 'search') paintWords();
    const tab = ['search', 'word', 'compare'].includes(page) ? 'search' : ['affix', 'affixes'].includes(page) ? 'affixes' : ['mine', 'mastered', 'pair', 'pair-edit', 'custom'].includes(page) ? 'mine' : 'home';
    document.querySelectorAll('[data-tab]').forEach(a => { if (a.tagName === 'A') { a.classList.toggle('active', a.dataset.tab === tab); if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); } });
    if (changed) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
    document.title = (page === 'group' ? db.groups.get(arg)?.title : page === 'word' ? arg : '') ? `${page === 'word' ? arg : db.groups.get(arg).title} · 词辨` : '词辨 · 考研易混词';
    updateOffline();
  }
  function modifySelection(word) {
    if (selected.includes(word)) selected = selected.filter(w => w !== word);
    else if (selected.length >= 4) { toast('一次最多并排对照 4 个词，请先移除一个。'); return; }
    else if (db.words.has(word)) selected.push(word);
    if (currentRoute() === 'search') paintWords(); else render();
  }
  function nextQuestion(skipped) {
    if (skipped || session.revealed) session.skipped++;
    session.at++; session.choice = null; session.answered = false; session.revealed = false; session.options = []; render(); window.scrollTo(0, 0);
  }
  main.addEventListener('input', event => {
    if (event.target.id === 'group-search') { listQuery = event.target.value; paintGroups(); }
    if (event.target.id === 'word-search') { wordQuery = event.target.value; wordLimit = 50; paintWords(); }
  });
  main.addEventListener('click', event => {
    const b = event.target.closest('button[data-action]'); if (!b || b.disabled) return;
    const a = b.dataset.action, id = b.dataset.id;
    if (a === 'speak') return speak(b.dataset.text ? [b.dataset.text] : b.dataset.words.split(','));
    if (a === 'conceal') { concealed = !concealed; render(); }
    if (['favorite', 'review', 'mastered'].includes(a)) toggleGroup(a === 'favorite' ? 'favorites' : a, id);
    if (a === 'kind') { listKind = b.dataset.kind; render(); }
    if (a === 'clear-search') { const input = document.getElementById(b.dataset.for); input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); }
    if (a === 'more-words') { wordLimit += 50; paintWords(); }
    if (a === 'select-word' || a === 'remove-selected') modifySelection(b.dataset.word);
    if (a === 'clear-selected') { selected = []; if (currentRoute() === 'search') paintWords(); else render(); }
    if (a === 'compare-selected' && selected.length >= 2) location.hash = 'compare/' + selected.join(',');
    if (a === 'mine-tab') { mineTab = b.dataset.tab; render(); }
    if (a === 'delete-pair') {
      const p = state.pairs.find(p => p.id === id);
      if (p && window.confirm('删除这一组自建记录？' + p.words.join(' · '))) { const next = structuredCopy(state); next.pairs = next.pairs.filter(p => p.id !== id); if (commit(next)) { mineTab = 'pairs'; location.hash = 'mine'; } }
    }
    if (a === 'answer' && session && !session.answered && !session.revealed) {
      const q = session.questions[session.at], choice = b.dataset.word;
      if (!q.options.includes(choice)) return;
      const next = C.record(state, q, choice);
      if (!commit(next)) return;
      session.choice = choice; session.answered = true; session.attempts++; if (C.grade(q, choice)) session.correct++; render();
    }
    if (a === 'reveal-question' && session && !session.answered) { session.revealed = true; render(); }
    if (a === 'skip-question' && session) nextQuestion(true);
    if (a === 'next-question' && session && (session.answered || session.revealed)) nextQuestion(false);
    if (a === 'restart-practice') { startSession(session.key); render(); }
    if (a === 'export') {
      const blob = new Blob([storedError ? unreadableBackup : C.backup(state)], { type: 'application/json' }); const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = (storedError ? '词辨原始记录-' : '词辨备份-') + new Date().toISOString().slice(0, 10) + '.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    if (a === 'confirm-import' && importPending) { if (commit(importPending, true)) { importPending = null; storedError = ''; unreadableBackup = ''; render(); $('#import-area').innerHTML = '<p class="message">备份已导入。</p>'; } }
    if (a === 'cancel-import') { importPending = null; $('#import-area').innerHTML = ''; }
    if (a === 'check-offline') checkOffline();
  });
  main.addEventListener('submit', event => {
    if (event.target.id !== 'pair-form') return; event.preventDefault();
    const words = parseWords($('#pair-words').value), note = $('#pair-note').value.trim(), id = event.target.dataset.id;
    const error = $('#pair-error'); let message = '';
    if (words.length < 2 || words.length > 4) message = '请填写 2–4 个不同的单词。';
    else if (words.some(w => !db.words.has(w))) message = '当前词库暂未收录：' + words.filter(w => !db.words.has(w)).join(', ') + '。请检查拼写或使用原形。';
    else if (note.length > 400) message = '提示最多 400 字。';
    else if (!id && state.pairs.length >= 200) message = '自建组已满 200 组，请先整理或导出备份。';
    if (message) { error.textContent = message; error.hidden = false; return; }
    const next = structuredCopy(state), pair = { id: id || ('p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)), words, note };
    if (id) next.pairs = next.pairs.map(p => p.id === id ? pair : p); else next.pairs.push(pair);
    if (commit(next)) { toast('已保存到“我的 → 自建组”。'); location.hash = 'pair/' + pair.id; }
  });
  main.addEventListener('change', async event => {
    if (event.target.id !== 'backup-file') return; const file = event.target.files[0]; if (!file) return;
    importPending = null;
    try {
      if (file.size > 2e6) throw new Error('备份文件超过 2 MB，未导入。');
      importPending = C.importBackup(await file.text(), db);
      $('#import-area').innerHTML = `<p class="message">可导入 ${importPending.pairs.length} 个自建组、${importPending.favorites.length} 个收藏和 ${importPending.review.length} 个待复习组。确认后会替换当前设备的记录，建议先导出备份。</p><div class="row">${button('confirm-import', '确认替换并导入', 'primary')}${button('cancel-import', '取消')}</div>`;
    } catch (error) { $('#import-area').innerHTML = `<p class="message error" role="alert">${E(error.message)}</p>`; }
    event.target.value = '';
  });
  function updateOffline() { $('#offline-state').textContent = offlineText; if ($('#offline-detail')) $('#offline-detail').textContent = offlineText === '可离线' ? '词库与辨析已保存在本机，可以断网打开。' : offlineText; }
  async function checkOffline() {
    if (!('serviceWorker' in navigator)) { offlineText = '浏览器暂不支持离线保存'; updateOffline(); return; }
    const reg = await navigator.serviceWorker.getRegistration(new URL('./', location.href).href);
    if (!reg || !reg.active || !reg.scope.endsWith('/words/')) { offlineText = navigator.onLine ? '正在保存离线内容…' : '尚未完整保存，请联网后重试'; updateOffline(); return; }
    const status = await new Promise(resolve => { const channel = new MessageChannel(); const timer = setTimeout(() => resolve(false), 5000); channel.port1.onmessage = event => { clearTimeout(timer); resolve(event.data?.ready); channel.port1.close(); }; reg.active.postMessage({ type: 'WORDS_STATUS' }, [channel.port2]); });
    offlineText = status ? '可离线' : '离线保存未完成，请联网重开'; updateOffline();
  }
  async function offline() {
    if (!('serviceWorker' in navigator)) { offlineText = '浏览器暂不支持离线保存'; updateOffline(); return; }
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
      await checkOffline();
      const watch = worker => { if (worker) worker.addEventListener('statechange', () => { if (worker.state === 'activated') checkOffline(); }); };
      watch(reg.installing); reg.addEventListener('updatefound', () => watch(reg.installing));
      navigator.serviceWorker.addEventListener('controllerchange', checkOffline);
      await navigator.serviceWorker.ready; await checkOffline();
    } catch (_) { offlineText = '离线保存暂不可用，联网仍可使用'; updateOffline(); }
  }
  async function init() {
    try {
      const response = await fetch('data.json'); if (!response.ok) throw new Error('词库暂时没有载入成功');
      data = await response.json(); db = C.index(data);
      try { const saved = localStorage.getItem(C.KEY); if (saved) { unreadableBackup = saved; state = C.validState(JSON.parse(saved), db); unreadableBackup = ''; } }
      catch (_) { storedError = '本机原记录暂时无法读取，未自动删除。请先保留原备份。'; }
      window.addEventListener('hashchange', render); window.addEventListener('online', checkOffline); render();
      if (storedError) toast(storedError); offline();
    } catch (_) { main.innerHTML = `<div class="loading"><h1>词库还没打开。</h1><p class="intro">请检查网络后重新打开；首次使用需要联网保存。</p><a class="primary-link section" href="./">重新打开</a></div>`; offlineText = '载入未完成'; updateOffline(); }
  }
  init();
})();
