/* Derive the standalone spelling deck from the existing, licensed vocabulary.
 * No downloads, frequency claims, or changes to the original Words application.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
assert(args.every(arg => arg === '--check'), 'Usage: node scripts/build-spelling.cjs [--check]');
const checkMode = args.includes('--check');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const source = read('dist/words/data.json');
const legacy = new Set(read('content/word-legacy-list.json'));
const exam = new Set(read('content/word-exam-base.json').entries.map(e => e.word));
const selected = new Set(legacy);
assert.equal(selected.size, 3600, 'The original core deck must stay intact.');
for (const entry of source.words) {
  if (selected.size >= 3660) break;
  if (exam.has(entry.word)) selected.add(entry.word);
}
const sourceMap = new Map(source.words.map(w => [w.word, w]));
assert.equal(selected.size, 3660);
for (const word of selected) assert(sourceMap.has(word), 'Missing word: ' + word);

// Original short reading glosses for supplemental entries whose old dictionary
// line starts with a rare/technical meaning. These are NOT true-exam statistics
// or quotations from an official syllabus; curated/NETEM entries remain intact.
const readingGloss = {
  programme: 'n. 计划；节目；课程安排\nv. 规划；安排',
  phone: 'n. 电话\nv. 打电话',
  realize: 'v. 意识到；实现；把资产变现',
  defence: 'n. 防御；保护；辩护',
  construction: 'n. 建造；建筑物；结构',
  improvement: 'n. 改善；改进；进步',
  housing: 'n. 住房；住房供给',
  learning: 'n. 学习；学问',
  writing: 'n. 写作；书面作品；笔迹',
  theater: 'n. 剧院；戏剧；电影院',
  ought: 'aux. 应该；应当（通常用于 ought to）',
  offence: 'n. 犯罪；冒犯；进攻',
  comfortable: 'adj. 舒服的；自在的；经济宽裕的',
  elderly: 'adj. 年老的\nn. 老年人（the elderly）',
  coverage: 'n. 新闻报道；覆盖范围；保险保障',
  establishment: 'n. 建立；机构；当权派（the establishment）',
  emphasize: 'v. 强调；着重',
  virtually: 'adv. 几乎；实际上',
  inquiry: 'n. 询问；调查；探究',
  interaction: 'n. 相互作用；互动',
  lab: 'n. 实验室（laboratory 的缩写）',
  depression: 'n. 沮丧；抑郁；经济萧条；凹陷',
  proceeding: 'n. 行动；程序；诉讼程序（常用复数）',
  prosecutor: 'n. 检察官；公诉人',
  participation: 'n. 参与；参加',
  shortly: 'adv. 不久；很快；简短地',
  judgement: 'n. 判断；判断力；判决',
  fiber: 'n. 纤维；膳食纤维',
  compensation: 'n. 补偿；赔偿；报酬',
  roughly: 'adv. 大约；粗略地；粗暴地',
  disagree: 'v. 不同意；不一致；不相符',
  replacement: 'n. 更换；替代；替代者',
  tournament: 'n. 锦标赛；联赛',
  characterize: 'v. 以……为特征；描述……的特性',
  auto: 'n. 汽车（automobile 的简称）',
  experimental: 'adj. 实验的；试验性的',
  discrimination: 'n. 歧视；区别对待；辨别力',
  mortality: 'n. 死亡率；死亡数量；生命的有限性',
  jeans: 'n. 牛仔裤',
  civilization: 'n. 文明；文明社会',
  merger: 'n. 合并；兼并',
  attendance: 'n. 出席；参加；出席人数',
  monthly: 'adj./adv. 每月的；每月一次（的）\nn. 月刊',
  uncertain: 'adj. 不确定的；不确信的；难以预料的',
  chap: 'n. 小伙子；家伙',
  overwhelming: 'adj. 压倒性的；极大的；令人难以承受的',
  unfair: 'adj. 不公平的；不公正的',
  railroad: 'n. 铁路；铁路公司\nv. 强迫……仓促行事',
  heading: 'n. 标题；方向',
  meaningful: 'adj. 有意义的；意味深长的',
  redundancy: 'n. 裁员；多余；冗余',
  subsidiary: 'n. 子公司\nadj. 附属的；次要的',
  minimize: 'v. 尽量减少；使最小化；淡化',
  enroll: 'v. 注册；入学；招收',
  invariably: 'adv. 总是；始终如一地',
  specialize: 'v. 专攻；专门从事；使专门化',
  secular: 'adj. 世俗的；非宗教的',
  tumour: 'n. 肿瘤',
  aesthetic: 'adj. 审美的；美学的；有美感的',
  contradiction: 'n. 矛盾；反驳；不一致',
  emerging: 'adj. 新兴的；正在出现的',
  allied: 'adj. 联合的；结盟的；相关的',
  corresponding: 'adj. 相应的；对应的；通信的',
  fitting: 'adj. 适合的；恰当的\nn. 装配；试穿',
  exploitation: 'n. 开发；利用；剥削',
  compelling: 'adj. 引人入胜的；令人信服的；强烈的',
  skeptical: 'adj. 怀疑的；持怀疑态度的',
  recorder: 'n. 录音机；记录员；记录仪',
  complication: 'n. 复杂情况；使问题复杂化的因素；并发症',
  stunning: 'adj. 极美的；令人惊叹的；令人震惊的',
  fury: 'n. 狂怒；狂暴',
  enlist: 'v. 征募；入伍；争取……的支持',
  rehearsal: 'n. 排练；预演',
  abundance: 'n. 丰富；充裕；大量',
  fulfill: 'v. 履行；实现；满足',
  ironic: 'adj. 讽刺的；出乎意料而令人啼笑皆非的',
  formulation: 'n. 制定；系统表述；配方',
  madame: 'n. 夫人；女士（法语尊称）',
  coincidence: 'n. 巧合；同时发生',
  realization: 'n. 认识；领悟；实现',
  irregular: 'adj. 不规则的；不定期的；不合常规的',
  reconstruct: 'v. 重建；重现；复原',
  rewrite: 'v. 重写；改写\nn. 改写的版本',
  careless: 'adj. 粗心的；不注意的',
  irresponsible: 'adj. 不负责任的；不可靠的',
  modernize: 'v. 使现代化；实现现代化',
  reorganize: 'v. 重新组织；改组',
  specialization: 'n. 专门化；专业化；专长领域',
  inactive: 'adj. 不活跃的；不活动的；闲置的',
  reuse: 'v./n. 再利用；重复使用',
  illogical: 'adj. 不合逻辑的',
  inflammable: 'adj. 易燃的（不是“不易燃的”）',
  data: 'n. 数据；资料',
  internet: 'n. 互联网',
  agenda: 'n. 议事日程；待办事项；行动目标',
  trousers: 'n. 裤子'
};

// Explicit orthographic variants only. No related forms, synonymous words,
// singular/plural guesses, or practice/practise and licence/license POS swaps.
const pairs = [
  ['analyse','analyze'],['organise','organize'],['generalise','generalize'],
  ['realise','realize'],['specialise','specialize'],['recognise','recognize'],
  ['emphasise','emphasize'],['criticise','criticize'],['apologise','apologize'],
  ['characterise','characterize'],['modernise','modernize'],['centralise','centralize'],
  ['minimise','minimize'],['maximise','maximize'],['optimise','optimize'],
  ['privatise','privatize'],['normalise','normalize'],['standardise','standardize'],
  ['summarise','summarize'],['memorise','memorize'],['stabilise','stabilize'],
  ['utilise','utilize'],['industrialise','industrialize'],['civilise','civilize'],
  ['legalise','legalize'],['prioritise','prioritize'],['visualise','visualize'],
  ['reorganise','reorganize'],['organisation','organization'],
  ['generalisation','generalization'],['civilisation','civilization'],
  ['specialisation','specialization'],['realisation','realization'],
  ['modernisation','modernization'],['industrialisation','industrialization'],
  ['globalisation','globalization'],['favour','favor'],['favourite','favorite'],
  ['colour','color'],['labour','labor'],['neighbour','neighbor'],
  ['behaviour','behavior'],['humour','humor'],['rumour','rumor'],
  ['harbour','harbor'],['honour','honor'],['odour','odor'],['vigour','vigor'],
  ['armour','armor'],['centre','center'],['theatre','theater'],
  ['metre','meter'],['litre','liter'],['fibre','fiber'],
  ['defence','defense'],['offence','offense'],['pretence','pretense'],
  ['grey','gray'],['jewellery','jewelry'],['catalogue','catalog'],
  ['dialogue','dialog'],['traveller','traveler'],['fulfil','fulfill'],
  ['enrol','enroll'],['judgement','judgment'],['tumour','tumor'],
  ['sceptical','skeptical'],['mould','mold'],['plough','plow'],
  ['manoeuvre','maneuver'],['cosy','cozy'],['aluminium','aluminum']
];
const variants = new Map();
for (const pair of pairs) {
  for (const word of pair) variants.set(word, pair.filter(other => other !== word));
}
const categories = [
  {id:'all',title:'全部核心词',description:'完整 3,660 词；按通用词频资料整理顺序，不是真题频率榜。'},
  {id:'verbs',title:'动作与变化',description:'包含动词用法；多词性单词可同时出现在其他分类。'},
  {id:'nouns',title:'名词小仓库',description:'包含名词用法，记清人、事物、过程与抽象概念。'},
  {id:'adjectives',title:'形容词花园',description:'包含形容词用法，关注性质、程度与评价。'},
  {id:'adverbs',title:'副词小尾巴',description:'包含副词用法，不把所有 -ly 词都判为副词。'},
  {id:'function',title:'句子连接件',description:'代词、介词、连词、冠词、数词、助动词等。'},
  {id:'affixes',title:'词头词尾',description:'已有人工整理的词头、词尾对照组；相同字母不等于相同词源。'},
  {id:'shape',title:'长得像的词',description:'有字形相近候选词；候选只提示对照，不表示同义。'},
  {id:'sound',title:'听着像的词',description:'有读音相近候选词；自动匹配受口音与多读音影响。'},
  {id:'family',title:'词族变形',description:'已有人工整理的同词族对照，区分词性与词义。'},
  {id:'short',title:'短词热身',description:'不超过 5 个字母；长度不代表考试难度。'},
  {id:'long',title:'长词挑战',description:'至少 10 个字母，练习词中和词尾的拼写。'}
];
const posOrder = ['n.','v.','adj.','adv.','pron.','prep.','conj.','art.','num.','aux.','int.'];
const commonPos = {
  in:['prep.','adv.'],of:['prep.'],to:['prep.'],at:['prep.'],with:['prep.'],from:['prep.'],
  into:['prep.'],onto:['prep.'],within:['prep.','adv.'],without:['prep.'],
  for:['prep.','conj.'],on:['prep.','adv.'],by:['prep.','adv.'],
  across:['prep.','adv.'],through:['prep.','adv.'],throughout:['prep.','adv.'],
  despite:['prep.'],against:['prep.'],among:['prep.'],between:['prep.'],during:['prep.'],
  and:['conj.'],or:['conj.'],because:['conj.'],although:['conj.'],whereas:['conj.'],
  unless:['conj.'],if:['conj.'],whether:['conj.'],
  however:['adv.'],therefore:['adv.'],hence:['adv.'],thus:['adv.'],otherwise:['adv.'],
  moreover:['adv.'],nevertheless:['adv.'],nonetheless:['adv.']
};
const reviewedIPA = {significantly:'sɪɡˈnɪfɪkəntli',emerging:'ɪˈmɜːdʒɪŋ'};
function getPos(entry, meaning) {
  function parse(text) {
    const found = new Set();
    for (const m of String(text).matchAll(/(?:^|[\s/;；])((?:adj|adv|pron|prep|conj|art|num|aux|int|vt|vi|[nva]))\./g)) {
      const raw = m[1];
      found.add(raw === 'a' ? 'adj.' : raw === 'vt' || raw === 'vi' ? 'v.' : raw + '.');
    }
    return found;
  }
  let found = parse(entry.pos + ' ' + meaning);
  if (!found.size) found = new Set(commonPos[entry.word] || parse(entry.dictionaryMeaning));
  return posOrder.filter(p => found.has(p));
}
function cleanMeaning(value) {
  return [...new Set(value.split('\n').map(line => line.replace(/\s*[,，]\s*/g, '；').trim()).filter(Boolean))].join('\n');
}
const groups = source.groups.map(group => ({
  id:group.id,kind:group.kind,title:group.entries.filter(e => selected.has(e.word)).map(e => e.word).join(' · '),
  contrast:group.contrast,
  words:group.entries.filter(e => selected.has(e.word)).map(e => e.word)
})).filter(g => g.words.length >= 2);
const groupMap = new Map(groups.map(g => [g.id,g]));
const affixes = source.affixes.map(group => ({...group,words:group.words.filter(w => selected.has(w))})).filter(g => g.words.length >= 2);
const words = source.words.filter(w => selected.has(w.word)).map((entry, order) => {
  const reviewed = readingGloss[entry.word];
  const sourceMeaning = entry.meaning;
  // Do not replace actual exam/curated senses with generic dictionary glosses.
  const useReview = Boolean(reviewed) && (entry.meaningSource === 'ECDICT' || ['data','internet','agenda','trousers'].includes(entry.word));
  const meaning = cleanMeaning(useReview ? reviewed : sourceMeaning);
  const parts = getPos(entry, meaning);
  const spellingVariants = new Set(variants.get(entry.word) || []);
  const shape = entry.shape.filter(w => selected.has(w) && !spellingVariants.has(w));
  const sound = entry.sound.filter(w => selected.has(w) && !spellingVariants.has(w));
  const familyGroups = entry.groups.filter(id => groupMap.get(id)?.kind === 'family');
  const affixGroups = affixes.filter(a => a.words.includes(entry.word)).map(a => a.id);
  const tags = ['all'];
  if (parts.includes('v.')) tags.push('verbs');
  if (parts.includes('n.')) tags.push('nouns');
  if (parts.includes('adj.')) tags.push('adjectives');
  if (parts.includes('adv.')) tags.push('adverbs');
  if (parts.some(p => ['pron.','prep.','conj.','art.','num.','aux.','int.'].includes(p))) tags.push('function');
  if (affixGroups.length) tags.push('affixes');
  if (shape.length) tags.push('shape');
  if (sound.length) tags.push('sound');
  if (familyGroups.length) tags.push('family');
  if (entry.word.length <= 5) tags.push('short');
  if (entry.word.length >= 10) tags.push('long');
  const examples = source.groups.flatMap(g => g.entries).filter(e => e.word === entry.word && e.sentence && e.zh);
  const example = examples[0];
  const note = [entry.usage];
  if (!exam.has(entry.word)) note.push('原核心表补充词（派生形式、拼写变体或常用词）；所用第三方考研表未单列，不代表其不在考试范围内。');
  return {
    id:entry.word,word:entry.word,displayWord:entry.displayWord || entry.word,
    meaning,pos:parts.join('/'),phonetic:entry.ipa || reviewedIPA[entry.word] || '',
    ...(meaning !== sourceMeaning && sourceMeaning.length > 100 ? {meaningDetail:sourceMeaning} : {}),
    order:order + 1,sourceRank:entry.rank,
    meaningSource:useReview ? 'reading-gloss-review' : entry.meaningSource,
    examList:exam.has(entry.word),selectionBasis:legacy.has(entry.word) ? 'legacy-core' : 'NETEM-supplement',
    tags,accepted:[entry.word,...(variants.get(entry.word) || [])],shape,sound,familyGroups,affixGroups,
    comparisonGroups:entry.groups.filter(id => groupMap.has(id)),
    ...(example ? {example:{sentence:example.sentence,zh:example.zh}} : {}),
    ...(note.filter(Boolean).length ? {examNote:note.filter(Boolean).join(' ')} : {})
  };
});
for (const category of categories) category.count = words.filter(w => w.tags.includes(category.id)).length;
const meta = {
  title:'词芽 · 考研单词默写',wordCount:words.length,
  sourceNote:'沿用词辨原有 3,600 词，并补充 60 个所用考研整理表中的单词，共 3,660 词。不是官方“核心 3,660 词”名单，也未逐词核对 2027 官方大纲或历年真题频率。',
  meaningNote:'优先沿用已有考研整理释义、人工辨析释义和阅读义项。原核心表的补充词采用已有筛选词典义或明确标记的简明阅读释义。主释义不穷尽所有义项，不能据此断言某义从未考过。',
  orderNote:'继承既有 ECDICT 通用词频资料的整理顺序；sourceRank 不表示考研真题频次。',
  pronunciationNote:'音标主要来自 ECDICT 的主读音；多词性词、英美音与句中读法可能不同。读音候选来自 CMUdict 自动比较，只作对照线索。',
  spellingNote:'只接受目标词本身及明列的英美拼写变体；不自动接受同义词、复数或其他派生词。',
  sourceListMatches:words.filter(w => w.examList).length,
  legacySupplementCount:words.filter(w => !w.examList).length,
  license:source.meta.license,
  licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  sources:source.meta.sources,
  attribution:'NETEMVocabulary / exam-data contributors；ECDICT / skywind3000 and contributors；CMUdict / CMU and contributors；原有人工辨析与新增整理 / 研习。',
  attributionPath:'licenses/ATTRIBUTION.txt'
};
const deck = {version:1,meta,categories,words,groups,affixes};
assert.equal(words.length,3660);
assert.equal(new Set(words.map(w => w.word)).size,3660);
for (const w of words) {
  assert(w.meaning.trim(), w.word);
  assert(w.pos, 'Missing part of speech: ' + w.word);
  assert(w.tags.every(tag => categories.some(c => c.id === tag)), w.word);
  assert(w.accepted.includes(w.word), w.word);
  assert(w.accepted.every(a => /^[a-z]+$/.test(a)), w.word);
  assert(w.shape.every(s => selected.has(s)), w.word);
  assert(w.sound.every(s => selected.has(s)), w.word);
}
for (const w of ['general','generalize','generalization','generally']) assert(selected.has(w));
for (const [word, wrong] of [
  ['affect','effect'],['advice','advise'],['practice','practise'],['rise','raise'],
  ['generalize','generalization'],['generalize','generally'],['generalize','generation'],
  ['generalization','generalize'],['generalization','generation'],['generally','gradually']
]) {
  const entry = words.find(w => w.word === word);
  if (entry) assert(!entry.accepted.includes(wrong), word);
}
const destination = path.join(root,'dist/spelling');
const attribution =
  '词芽 spelling deck (data.json)\nCC BY-NC-SA 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/\n' +
  'Derived from the existing 词辨 deck. Changes: retain the 3,600-word legacy core, add 60 NETEM entries, select core-only comparison candidates, derive overlapping POS/length categories, retain curated examples, add explicit orthographic variants and concise reviewed supplemental reading glosses.\n' +
  'NETEMVocabulary by exam-data contributors: https://github.com/exam-data/NETEMVocabulary\nRevision: b1850fdd51fca9143006ef54bca99b246d56c934\n' +
  'ECDICT by skywind3000 and contributors: https://github.com/skywind3000/ECDICT\nMIT; exact text in ECDICT.txt.\n' +
  'CMUdict by CMU and contributors: https://github.com/cmusphinx/cmudict\nBSD-style; exact text in cmudict.txt.\n' +
  'Original editorial comparisons, examples and supplemental gloss selection: 研习 / 词辨 / 词芽.\n' +
  'This is a learning selection, not an official 2027 core syllabus or an exam-frequency ranking. Original textbooks and unrelated applications are not included.\n';
const summary = {
  version:1,title:meta.title,wordCount:words.length,legacyCoreCount:legacy.size,addedExamWords:60,
  examListMatches:meta.sourceListMatches,legacySupplementCount:meta.legacySupplementCount,
  categories:categories.map(({id,title,count}) => ({id,title,count})),
  meaningSources:Object.fromEntries([...new Set(words.map(w => w.meaningSource))].map(s => [s,words.filter(w => w.meaningSource === s).length])),
  phoneticCoverage:words.filter(w => w.phonetic).length,
  reviewedVariantEntries:words.filter(w => w.accepted.length > 1).length,
  exampleCoverage:words.filter(w => w.example).length,
  comparisonGroups:groups.length,affixGroups:affixes.length,
  selection:meta.sourceNote,meaningNote:meta.meaningNote,license:meta.license,sources:meta.sources
};
const expectedText = new Map([
  ['dist/spelling/data.json', JSON.stringify(deck)],
  ['content/spelling-summary.json', JSON.stringify(summary,null,2)+'\n'],
  ['dist/spelling/licenses/ATTRIBUTION.txt', attribution]
]);
const expectedLicenses = new Map(['NETEM.txt','ECDICT.txt','cmudict.txt'].map(file => [
  'dist/spelling/licenses/' + file, fs.readFileSync(path.join(root,'dist/words/licenses',file))
]));
if (checkMode) {
  const normalize = text => text.replace(/\r\n/g,'\n');
  for (const [file, expected] of expectedText) {
    const target = path.join(root,file);
    assert(fs.existsSync(target), 'Missing generated text: ' + file);
    assert.equal(normalize(fs.readFileSync(target,'utf8')), normalize(expected), 'Stale generated text: ' + file);
  }
  for (const [file, expected] of expectedLicenses) {
    const target = path.join(root,file);
    assert(fs.existsSync(target), 'Missing license: ' + file);
    assert(fs.readFileSync(target).equals(expected), 'License must match source bytes exactly: ' + file);
  }
} else {
  fs.mkdirSync(path.join(destination,'licenses'),{recursive:true});
  for (const [file, expected] of expectedText) fs.writeFileSync(path.join(root,file),expected);
  for (const [file, expected] of expectedLicenses) fs.writeFileSync(path.join(root,file),expected);
}
console.log(`Spelling ${checkMode ? 'check passed' : 'built'}: ${words.length} words, ${categories.length} categories, ${summary.exampleCoverage} examples.`);
