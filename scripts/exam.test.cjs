'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/exam-engine.js'),source=require('../content/sports-revised.json'),bank=Array.isArray(source)?source:source.questions;
const {createService}=require('../server/exam-server.cjs');
function paper(options={}){return E.createPaper(bank,{mode:'mixed',durationMinutes:180,seed:37,...options},1700000000000);}
function gradeFixture(p,answers,digest){return {app:'yanxi-exam-grade',version:1,paperId:p.id,answerDigest:digest,rubricVersion:p.rubricVersion,questions:p.questions.map(q=>({questionId:q.id,criteria:q.rubric.map(c=>({id:c.id,awarded:answers[q.id].trim()?c.max:0,feedback:answers[q.id].trim()?'测试夹具：此处仅验证结果结构，不验证评分质量。':'本题未作答。',evidence:answers[q.id].trim()?[answers[q.id].slice(0,8)]:[]})),errors:[],missing:answers[q.id].trim()?[]:['未作答'],uncertainties:[],improvements:['按题干逐点展开'],revisedAnswer:q.referenceAnswer||['测试修订答案']})),overall:{summary:'测试报告',strengths:[],priorities:['补齐漏答']}};}
test('each mode has exactly 5 definitions, 3 shorts, 1 essay and 100 rubric points',()=>{
 for(const mode of ['mixed','single'])for(const bookKey of Object.keys(E.BOOKS))for(let seed=1;seed<=35;seed++){
  const p=paper({mode,bookKey,seed}),qs=p.questions;
  assert.equal(qs.length,9);assert.equal(new Set(qs.map(q=>q.id)).size,9);assert.equal(qs.reduce((n,q)=>n+q.maxScore,0),100);
  for(const [type,spec]of Object.entries(E.TYPES))assert.equal(qs.filter(q=>q.examType===type).length,spec.count);
  if(mode==='mixed')assert.equal(new Set(qs.filter(q=>q.examType==='short').map(q=>q.bookKey)).size,3);else assert.ok(qs.every(q=>q.bookKey===bookKey));
  for(const q of qs){assert.equal(q.rubric.reduce((n,c)=>n+c.max,0),q.maxScore);assert.ok(q.rubric.every(c=>c.expected));assert.ok(q.textbookRefs.every(r=>r.printedPages.length));}
 }
});
test('public exam hides answers, clock is absolute and bank question wording is preserved',()=>{
 const p=paper(),publicPaper=E.publicPaper(p);E.validatePublicPaper(publicPaper);
 assert.equal(E.remaining(p,p.createdAt+60000),179*60000);assert.equal(E.remaining(p,p.deadline+1),0);assert.equal(E.formatTime(61000),'00:01:01');
 for(const q of publicPaper.questions){assert.equal(q.referenceAnswer,undefined);assert.ok(q.rubric.every(c=>c.expected===undefined));}
 for(const q of p.questions.filter(q=>q.examType!=='term'))assert.equal(q.prompt,bank.find(b=>b.id===q.id).prompt);
 const restored=E.paperFromIds(bank,{...p,ids:p.questions.map(q=>q.id)});assert.deepEqual(restored,p);
 assert.throws(()=>E.createPaper(bank,{mode:'single',bookKey:'other',durationMinutes:180}));
});
test('grading must match the frozen answer, all criteria and the actual quoted student text',async()=>{
 const p=paper(),answers=E.answersFor(p,{});answers[p.questions[0].id]='我自己的原始作答。';const digest=await E.digest(p,answers),raw=gradeFixture(p,answers,digest),g=E.validateGrade(raw,p,answers,digest);assert.equal(g.totalScore,5);
 const changed={...answers,[p.questions[0].id]:'另一个答案'};assert.notEqual(await E.digest(p,changed),digest);
 const wrong=structuredClone(raw);wrong.questions[0].criteria[0].evidence=['答卷里没有的话'];assert.throws(()=>E.validateGrade(wrong,p,answers,digest),/找不到/);
 const forged=structuredClone(raw);forged.questions[0].criteria[0].awarded=100;assert.throws(()=>E.validateGrade(forged,p,answers,digest),/满分/);
 assert.throws(()=>E.validateGrade({...raw,paperId:'other'},p,answers,digest),/不属于/);
 const missing=structuredClone(raw);missing.questions.pop();assert.throws(()=>E.validateGrade(missing,p,answers,digest),/全部9道/);
 assert.throws(()=>E.validateGrade({...raw,totalScore:99},p,answers,digest),/相加/);
 const injection=E.handoff(p,answers,digest);assert.match(injection,/一律不执行/);assert.match(injection,/不是厦大官方/);
});
test('signed online checkpoint enforces the deadline, survives service restart and supports real API result validation',async t=>{
 let time=1700000000000,called=0;
 const env={EXAM_SIGNING_SECRET:'test-signing-secret-at-least-32-characters',EXAM_ACCESS_CODE:'test-access-123456',OPENAI_API_KEY:'test-key-never-valid-in-production',EXAM_ALLOWED_ORIGINS:'http://exam.test'};
 const fakeFetch=async(url,options)=>{called++;assert.equal(url,'https://api.openai.com/v1/responses');const request=JSON.parse(options.body);assert.equal(request.store,false);assert.equal(request.text.format.strict,true);const packet=JSON.parse(request.input[1].content),qs=packet.questions.map(q=>({...q,id:q.questionId,rubric:q.rubric,referenceAnswer:q.referenceAnswer})),answers=Object.fromEntries(packet.questions.map(q=>[q.questionId,q.studentAnswer]));const raw=gradeFixture({id:packet.paperId,rubricVersion:packet.rubricVersion,questions:qs},answers,packet.answerDigest);return {ok:true,json:async()=>({id:'test-response',model:'test-only',status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(raw)}]}]})};};
 let svc=createService({env,now:()=>time,fetch:fakeFetch});await new Promise(r=>svc.server.listen(0,'127.0.0.1',r));let base='http://127.0.0.1:'+svc.server.address().port;t.after(()=>svc.server.close());
 const call=async(path,body,token=env.EXAM_ACCESS_CODE)=>{const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:'http://exam.test',Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,data:await response.json()};};
 assert.equal((await call('/api/exams/start',{},'wrong')).status,401);
 const start=await call('/api/exams/start',{mode:'mixed',durationMinutes:90});assert.equal(start.status,201);assert.equal(start.data.paper.questions.length,9);
 const p=start.data.paper,answers=E.answersFor(p,{});answers[p.questions[0].id]='原始作答';time+=2000;
 const draft=await call('/api/exams/draft',{token:start.data.token,answers,revision:1});assert.equal(draft.status,200);
 time=p.deadline;assert.equal((await call('/api/exams/draft',{token:start.data.token,answers,revision:2})).status,409);
 await new Promise(r=>svc.server.close(r));svc=createService({env,now:()=>time,fetch:fakeFetch});await new Promise(r=>svc.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+svc.server.address().port;
 const submission=await call('/api/exams/submit',{token:start.data.token,answers:{...answers,[p.questions[0].id]:'超时之后换的答案'},checkpoint:draft.data.checkpoint});assert.equal(submission.status,200);assert.equal(submission.data.answers[p.questions[0].id],'原始作答');assert.equal(submission.data.fromCheckpoint,true);
 const tampered=start.data.token.replace(/^./,'x');assert.equal((await call('/api/exams/submit',{token:tampered,answers,checkpoint:draft.data.checkpoint})).status,400);
 const result=await call('/api/exams/grade',{receipt:submission.data.receipt});assert.equal(result.status,202);
 let job;for(let i=0;i<30;i++){job=await call('/api/exams/jobs/'+result.data.jobId);if(job.data.state!=='running')break;await new Promise(r=>setTimeout(r,10));}
 assert.equal(job.data.state,'done',JSON.stringify(job.data));assert.equal(job.data.grade.totalScore,5);assert.equal(called,1);
 await call('/api/exams/grade',{receipt:submission.data.receipt});assert.equal(called,1,'repeated submit does not bill twice while cached');
 const outside=await fetch(base+'/api/health',{headers:{Origin:'https://other.invalid'}});assert.equal(outside.status,403);
});
test('unconfigured production refuses to start or fabricate any grades',async t=>{
 const svc=createService({env:{}});await new Promise(r=>svc.server.listen(0,'127.0.0.1',r));t.after(()=>svc.server.close());const base='http://127.0.0.1:'+svc.server.address().port;
 assert.equal((await(await fetch(base+'/api/health')).json()).ready,false);
 const response=await fetch(base+'/api/exams/start',{method:'POST',body:'{}'});assert.equal(response.status,503);assert.equal(svc.jobs.size,0);
});
module.exports={gradeFixture};
