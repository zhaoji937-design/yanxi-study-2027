'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),T=require('../dist/study-tools.js'),E=require('../dist/engine.js'),fs=require('node:fs'),path=require('node:path');
test('exact questions and related concepts have independently selectable scopes',()=>{
 const papers=[{eligible:true,matches:[{questionId:'a'}],conceptMatches:[{questionId:'b'}]},{eligible:false,matches:[{questionId:'c'}]}];
 const exact=T.paperIndex(papers),concept=T.paperIndex(papers,true),q=id=>({id,subject:'346 体育综合'});
 assert.ok(!T.allowPaper(q('a'),'daily',exact,concept));assert.ok(T.allowPaper(q('b'),'daily',exact,concept));assert.ok(!T.allowPaper(q('b'),'topics',exact,concept));assert.ok(T.allowPaper(q('b'),'all',exact,concept));assert.ok(!concept.has('c'));
 assert.ok(T.allowPaper({id:'english',subject:'英语（二）'},'topics',exact,concept));assert.ok(!T.allowPaper({id:'english',subject:'英语（二）'},'past',exact,concept));
});
test('independent recall increases spacing; missing/confused/forgot reset it',()=>{
 const now=1800000000000,first=T.nextRecall(null,'independent',now),second=T.nextRecall(first,'independent',now);
 assert.equal(first.streak,1);assert.equal(first.due-now,86400000);assert.equal(second.due-now,3*86400000);
 for(const result of ['missing','confused','forgot']){const next=T.nextRecall(second,result,now);assert.equal(next.streak,0);assert.ok(next.due<first.due);}
 assert.throws(()=>T.nextRecall(null,'viewed',now));
});
test('a complete task can exclude related concepts even without an exact question match',()=>{
 const papers=[{eligible:false,conceptEligible:true,matches:[],conceptMatches:[{questionId:'related'}]}, {eligible:false,conceptEligible:false,matches:[],conceptMatches:[{questionId:'incomplete'}]}];
 const exact=T.paperIndex(papers),combined=T.paperIndex(papers,true);
 assert.equal(exact.size,0);assert.ok(combined.has('related'));assert.ok(!combined.has('incomplete'));
 assert.ok(T.allowPaper({id:'related',subject:'346 体育综合'},'daily',exact,combined));
 assert.ok(!T.allowPaper({id:'related',subject:'346 体育综合'},'topics',exact,combined));
});
test('restore drops unknown or invalid recall records without polluting valid ones',()=>{
 const valid=T.nextRecall(null,'missing',1800000000000),out=T.cleanRecalls({a:valid,b:valid,c:{result:'independent',due:-1,updated:0}},new Set(['a','c']));
 assert.deepEqual(Object.keys(out),['a']);assert.deepEqual(out.a,valid);
});
test('verified source text and learning structures survive bank export and import',()=>{
 const qs=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/verified-study-cards.json'),'utf8'));
 const round=E.parseBank(JSON.stringify({version:1,questions:qs})).questions;
 assert.equal(round.length,27);assert.deepEqual(round[0].studyGuide,qs[0].studyGuide);
 const bad=structuredClone(qs[0]);bad.studyGuide.verbatim[0].printedPages=[0];assert.throws(()=>E.validateBank([bad]));
});
