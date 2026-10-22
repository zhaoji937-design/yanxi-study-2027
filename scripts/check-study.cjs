'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist'),ctx=vm.createContext({console,URL});
for(const [,url] of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script[^>]+src="([^"]+)"/g)){
 const n=url.split('?')[0];if(['study-tools.js','engine.js','paper-data.js'].includes(n)||n.startsWith('bank-'))vm.runInContext(fs.readFileSync(path.join(root,n),'utf8'),ctx,{filename:n});
}
const qs=ctx.QuizEngine.validateBank([].concat(ctx.POLITICS_BANK,ctx.ENGLISH_BANK,ctx.SPORTS_BANK)).questions;
const verified=qs.filter(q=>q.studyGuide),byId=new Map(qs.map(q=>[q.id,q]));
assert.equal(verified.length,27);assert.equal(new Set(verified.map(q=>q.studyGuide.auditKey)).size,27);
assert.equal(verified.filter(q=>q.examType==='term').length,15);
assert.equal(verified.filter(q=>q.examType==='short').length,9);
assert.equal(verified.filter(q=>q.examType==='essay').length,3);
for(const q of verified){const g=q.studyGuide;assert.ok(g.core.length>=3&&g.requirements.length>=1&&g.recallQuestions.length>=2);if(q.examType==='term')assert.ok(g.verbatim.some(e=>e.text.includes(q.answer.join('\n\n'))),q.id+' must quote its source');}
for(const key of ['training-7','training-8','training-9','physiology-7','physiology-9'])assert.ok(verified.find(q=>q.studyGuide.auditKey===key).studyGuide.requirements.length>=2,key+' must cover compound tasks');
const papers=ctx.PAST_PAPERS;assert.equal(papers.length,51);assert.equal(papers.filter(p=>p.year===2026).length,27);
assert.equal(papers.filter(p=>p.completeness==='topic-only').length,5);
for(const p of papers){assert.ok(p.sources.length);if(!p.eligible)assert.equal((p.matches||[]).length,0);if(p.completeness==='topic-only')assert.equal((p.matches||[]).length+(p.conceptMatches||[]).length,0);for(const m of (p.matches||[]).concat(p.conceptMatches||[])){assert.ok(byId.has(m.questionId));assert.ok(m.reason);assert.equal(byId.get(m.questionId).subject,'346 体育综合');}for(const s of p.sources){if(s.url)assert.match(s.url,/^https?:\/\//);}}
const exact=ctx.StudyTools.paperIndex(papers),concepts=ctx.StudyTools.paperIndex(papers,true);assert.equal(exact.size,39);assert.equal(concepts.size,73);
for(const q of verified)assert.ok(exact.has(q.id),q.id+' has a known past question');
for(const n of ['bank-study.js','paper-data.js'])assert.doesNotMatch(fs.readFileSync(path.join(root,n),'utf8'),/C:\\\\Users|D:\\\\gpt|桌面上的文件/,'local paths must stay private');
console.log(JSON.stringify({result:'passed',verified:27,historyRecords:51,exactMatches:exact.size,conceptMatches:concepts.size,topicOnlyExcluded:0}));
