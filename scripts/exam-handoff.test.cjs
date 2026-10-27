'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),E=require('../dist/exam-engine.js'),bank=require('../content/sports-revised.json').questions,{measure}=require('./measure-exam-handoff.cjs');
function fixture(){const p=E.createPaper(bank,{mode:'mixed',durationMinutes:180,seed:37},1700000000000),answers=E.answersFor(p,{});answers[p.questions[0].id]='运动训练：“提高竞技能力”；包括体能、技能。\n全过程应有计划（A）。';const raw={app:'yanxi-exam-grade',version:1,paperId:p.id,answerDigest:'test-digest',rubricVersion:p.rubricVersion,questions:p.questions.map((q,i)=>({questionId:q.id,criteria:q.rubric.map(c=>({id:c.id,awarded:i===0?c.max:0,feedback:'校验夹具，不代表真实评分。',evidence:i===0?[answers[q.id]]:[]})),missing:[],errors:[],uncertainties:[],improvements:[],revisedAnswer:[]})),overall:{summary:'校验夹具',strengths:[],priorities:[]}};return{p,answers,raw};}
test('quoteFound normalizes fullwidth punctuation, quotes, whitespace and line breaks without paraphrasing',()=>{
 assert.ok(E.quoteFound('ATP（供能）；强度：高！','ATP(供能);强度:高!'));
 assert.ok(E.quoteFound('「运动训练」与‘竞技能力’','"运动训练"与\'竞技能力\''));
 assert.ok(E.quoteFound('分点\n说明：对象\t任务','分点说明: 对象 任务'));
 assert.ok(E.quoteFound('知\u200b识\ufeff能力','知识能力'));
 assert.equal(E.quoteFound('提高竞技能力','提高健康水平'),false);
 assert.equal(E.quoteFound('供能速度较快','供能速度最快'),false);
});
test('quoteFound accepts ellipsis-separated actual fragments and rejects fabricated or empty fragments',()=>{
 const a='先说明对象，再说明任务，最后说明范围。';for(const separator of ['……','...','⋯','．．．'])assert.ok(E.quoteFound(a,'先说明对象'+separator+'最后说明范围。'));
 assert.equal(E.quoteFound(a,'先说明对象……培养世界冠军'),false);assert.equal(E.quoteFound(a,'……'),false);assert.equal(E.quoteFound(a,'  '),false);
});
test('both grading evidence and error quotations use tolerant matching with precise question errors',()=>{
 const{p,answers,raw}=fixture(),first=raw.questions[0];first.criteria.forEach(c=>c.evidence=['运动训练:"提高竞技能力";包括体能、技能。 全过程应有计划(A)。']);first.errors=[{quote:'提高竞技能力……全过程应有计划（A）。',issue:'夹具定位',correction:'夹具修正'}];assert.equal(E.validateGrade(raw,p,answers,'test-digest').totalScore,5);
 first.criteria[0].evidence=['<img src=x onerror=alert(1)>编造的引用'];assert.throws(()=>E.validateGrade(raw,p,answers,'test-digest'),error=>error.message.includes('第1题')&&error.message.includes(p.questions[0].id)&&error.message.includes('<img src=x onerror=alert(1)>编造的引用'));
 first.criteria[0].evidence=['提高竞技能力'];first.errors[0].quote='完全没有写过的错误';assert.throws(()=>E.validateGrade(raw,p,answers,'test-digest'),/第1题.*明确错误.*完全没有写过的错误/);
 first.errors=[];first.criteria[0].awarded=.3;assert.throws(()=>E.validateGrade(raw,p,answers,'test-digest'),/0.5/);
});
test('parseJSON accepts explanatory prose and fenced JSON, and gives repairable errors for missing/truncated data',()=>{
 const raw={app:'yanxi-exam-grade',message:'中文与转义"括号{}'};for(const reply of [JSON.stringify(raw),'评分如下：\n'+JSON.stringify(raw)+'\n请查看漏点。','以下为结果：\n```json\n'+JSON.stringify(raw)+'\n```\n说明结束。','说明\n```JSON\n'+JSON.stringify(raw)+'\n```'])assert.deepEqual(E.parseJSON(reply),raw);
 assert.throws(()=>E.parseJSON('我给你90分'),/没有找到评分结果/);assert.throws(()=>E.parseJSON('```json\n{"questions":[}\n```'),/不是完整的 JSON/);
});
test('slim handoff preserves answers and every rubric expectation, retains the API packet and reduces measured characters',async()=>{
 const{p,answers}=fixture(),old=E.packet(p,answers,'d'),slim=E.slimPacket(p,answers,'d');for(let i=0;i<9;i++){assert.deepEqual(slim.questions[i].rubric,old.questions[i].rubric);assert.equal(slim.questions[i].studentAnswer,old.questions[i].studentAnswer);assert.equal(slim.questions[i].referenceAnswer,undefined);assert.ok(old.questions[i].referenceAnswer);assert.ok(slim.questions[i].pages.every(s=>s.includes('印刷第')));}
 assert.match(E.handoff(p,answers,'d'),/字段名为 missing/);assert.doesNotMatch(E.handoff(p,answers,'d'),/misssing/);const report=await measure();assert.ok(report.afterChars<report.beforeChars);assert.deepEqual(report,JSON.parse(fs.readFileSync(path.resolve(__dirname,'../content/exam-handoff-size-report.json'),'utf8')));
});
test('repair requests retain the exact validation problem and require a complete corrected response',()=>{const text=E.fixRequest('第3题引用找不到：“测试”');assert.match(text,/第3题引用找不到：“测试”/);assert.match(text,/完整的 JSON/);assert.match(text,/其余内容保持不变/);});
