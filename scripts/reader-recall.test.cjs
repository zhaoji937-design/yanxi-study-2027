'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),T=require('../dist/study-tools.js'),E=require('../dist/engine.js');
test('reader drafts restore literal text, bound each answer, and drop unknown or unsafe records',()=>{
 const raw=JSON.parse('{"a":"第一行\\n<重点>&第二行","b":"","unknown":"不恢复","__proto__":"污染","c":7}');raw.long='字'.repeat(40001);
 const out=T.cleanReaderDrafts(raw,new Set(['a','b','c','long','__proto__']));
 assert.deepEqual(Object.keys(out),['a','long']);assert.equal(out.a,'第一行\n<重点>&第二行');assert.equal(out.long.length,40000);assert.equal(Object.getPrototypeOf(out),Object.prototype);assert.deepEqual(T.cleanReaderDrafts(null,new Set()),{});assert.deepEqual(T.cleanReaderDrafts([],new Set(['a'])),{});
});
test('keyword gaps preserve the complete answer and distinguish overlapping literal terms',()=>{
 const q={type:'free',examType:'short',answer:['一、ATP再合成\nATP再合成与ATP；A+B <tag>。'],recallGuide:{highlights:['ATP','ATP再合成','A+B','<tag>','ATP']}};
 const exercise=T.keywordExercise(q),restore=tokens=>tokens.map(t=>t.index==null?t.text:exercise.keywords[t.index]).join('');
 assert.deepEqual(exercise.parts.map(restore),q.answer);assert.equal(exercise.keywords.length,4);assert.equal(exercise.parts[0][1].index,1);assert.deepEqual(exercise.extras,[]);assert.equal(q.answer[0],'一、ATP再合成\nATP再合成与ATP；A+B <tag>。');
});
test('definition gaps use outline keywords and retain nonverbatim memory cues separately',()=>{
 const q={type:'free',examType:'term',answer:['共同参与，明确目的。'],answerOutline:['共同参与','有计划'],recallGuide:{highlights:['错误来源']}};
 const exercise=T.keywordExercise(q);assert.deepEqual(exercise.keywords,q.answerOutline);assert.deepEqual(exercise.extras,[1]);assert.ok(exercise.parts[0].some(t=>t.index===0));
 assert.equal(T.keywordExercise({type:'free',examType:'short',answer:['正文'],answerOutline:['不替代 highlights']}),null);assert.equal(T.keywordExercise({type:'free',examType:'essay',answer:['正文']}),null);assert.equal(T.keywordExercise({type:'single',answer:['A'],answerOutline:['关键词']}),null);
});
test('keyword matching is only conservative text feedback and never changes a recall record',()=>{
 const recall=T.nextRecall(null,'missing',1800000000000),before=JSON.stringify(recall);
 assert.equal(T.matchesKeyword(' ＡＴＰ ','ATP'),true);assert.equal(T.matchesKeyword('有目的，有计划','有目的、有计划'),true);assert.equal(T.matchesKeyword('不需要有氧','需要有氧'),false);assert.equal(T.matchesKeyword('氧','有氧过程'),false);assert.equal(T.matchesKeyword('','ATP'),false);assert.equal(JSON.stringify(recall),before);
});
test('essay recall guides survive a v1 bank round trip and support keyword gaps',()=>{
 const q=structuredClone(JSON.parse(fs.readFileSync(path.join(__dirname,'../content/sports-revised.json'),'utf8')).questions.find(q=>q.examType==='essay'));
 q.answer=['一、目标\n训练目标需要具体，并对照反馈调整。'];q.recallGuide={version:1,object:'训练目标',scope:'本题范围',tasks:['说明训练目标'],checks:['是否说明反馈'],highlights:['训练目标','反馈'],fullAnswer:['训练目标需要具体，并对照反馈调整。'],notes:[]};
 const restored=E.parseBank(JSON.stringify({version:1,questions:[q]})).questions[0];assert.deepEqual(restored.recallGuide,q.recallGuide);assert.deepEqual(T.keywordExercise(restored).keywords,['训练目标','反馈']);
 q.recallGuide.highlights=['不存在的关键词'];assert.throws(()=>E.validateBank([q]),/记忆词必须出现在参考答案/);
});
