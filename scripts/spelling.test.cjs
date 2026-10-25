'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/spelling/core.js');
const NOW=Date.UTC(2026,9,25,12),DAY=86400000;
function word(id,tags=['core'],extra={}){return {id,word:id,meaning:'测试释义',pos:'n.',phonetic:'',tags,accepted:[id],shape:[],sound:[],...extra};}
const data={categories:[{id:'core',title:'基础'},{id:'other',title:'其他'}],words:[word('generalization'),word('generalize'),word('generally'),word('color',['other'],{accepted:['color','colour']}),word("it's",['other']),word('well-known',['other']),...Array.from({length:60},(_,i)=>word('item'+i))]};
function session(state,options={},now=NOW){return C.createSession(data,state,{category:'all',mode:'meaning',count:10,order:'smart',...options},now,()=>0.5);}
function one(state,id,now=NOW){const s=session(state,{},now);s.ids=[id];return s;}
test('exact spelling accepts only supplied variants and conservative normalization',()=>{
 assert.equal(C.checkAnswer(data.words[0],'  GENERALIZATION  '),true);
 assert.equal(C.checkAnswer(data.words[0],'generalize'),false);
 assert.equal(C.checkAnswer(data.words[0],'a generalization'),false);
 assert.equal(C.checkAnswer(data.words[0],'generalization!'),false);
 assert.equal(C.checkAnswer(data.words[3],'colour'),true);
 assert.equal(C.checkAnswer(data.words[4],' IT’S '),true);
 assert.equal(C.checkAnswer(data.words[4],'its'),false);
 assert.equal(C.checkAnswer(data.words[5],'wellknown'),false);
 assert.equal(C.checkAnswer(data.words[5],'well known'),false);
 assert.equal(C.checkAnswer(word('café'),'cafe\u0301'),true);
 assert.equal(C.checkAnswer(word('x'),' '),false);
});
test('first miss remains a miss after correction, hints never create mastery, skip is a miss',()=>{
 const state=C.emptyState(),s=one(state,'generalize');
 let r=C.submit(state,s,data.words[1],'generally',NOW);
 assert.equal(r.correct,false);assert.equal(r.firstCorrect,false);assert.equal(state.records.generalize.wrong,1);
 r=C.submit(state,s,data.words[1],'generalize',NOW+1000);
 assert.equal(r.correct,true);assert.equal(r.independentCorrect,false);assert.equal(r.firstCorrect,false);assert.equal(r.attempts.length,2);
 assert.equal(state.records.generalize.wrong,1);assert.equal(state.records.generalize.cleanCorrect,0);assert.equal(state.records.generalize.streak,0);assert.equal(state.records.generalize.nextDue,NOW+5*60000);
 C.submit(state,s,data.words[1],'generalize',NOW+2000);assert.equal(state.records.generalize.attempts,2,'duplicate success cannot inflate totals');
 C.next(s,NOW+3000);assert.equal(s.completedAt,NOW+3000);
 for(let i=0;i<5;i++){const h=one(state,'generalization',NOW+i*DAY);C.useHint(h);const result=C.submit(state,h,data.words[0],'generalization',NOW+i*DAY);assert.equal(result.independentCorrect,false);}
 assert.equal(C.isMastered(state.records.generalization),false);assert.equal(state.records.generalization.cleanCorrect,0);
 const skip=one(state,'generally');C.submit(state,skip,data.words[2],' ',NOW);assert.equal(skip.results.generally.skipped,true);assert.equal(state.records.generally.wrong,1);
 assert.deepEqual(C.validateState(state,data),state);
});
test('independent clean recall schedules spaced reviews and due errors precede unseen words',()=>{
 const state=C.emptyState();
 for(let i=0;i<3;i++){let s=one(state,'generally',NOW+i*DAY);C.submit(state,s,data.words[2],'generally',NOW+i*DAY);}
 assert.equal(C.isMastered(state.records.generally),true);assert.equal(state.records.generally.intervalDays,7);
 let failed=one(state,'generalize');C.submit(state,failed,data.words[1],'general',NOW);
 let good=one(state,'generalization');C.submit(state,good,data.words[0],'generalization',NOW);
 const s=session(state,{},NOW+6*60000);assert.equal(s.ids[0],'generalize');assert.equal(s.ids.includes('generalization'),false,'not-due correct words wait behind unseen words');assert.equal(new Set(s.ids).size,s.ids.length);
 assert.equal(C.summary(state,NOW+6*60000).due,1);
});
test('categories, random queue, favorites and shortage preserve the actual count',()=>{
 const state=C.emptyState();C.toggleFavorite(state,'generally');assert.deepEqual(C.validateState(state,data),state);
 assert.deepEqual(session(state,{category:'favorites'}).ids,['generally']);
 C.toggleFavorite(state,'generally');assert.equal(session(state,{category:'favorites'}).ids.length,0);
 const other=session(state,{category:'other',count:50,order:'random'});assert.equal(other.ids.length,3);assert.equal(other.requestedCount,50);assert.ok(other.ids.every(id=>data.words.find(w=>w.id===id).tags.includes('other')));
 assert.equal(session(state,{category:'wrong'}).completedAt,NOW);
 assert.throws(()=>session(state,{category:'unknown'}),/分类/);assert.throws(()=>session(state,{count:999}),/选项/);
 assert.deepEqual(new Set(session(state,{ids:['generally','generalize','generally']}).ids),new Set(['generally','generalize']));
 assert.throws(()=>session(state,{ids:['unknown']}),/未知词条/);
 assert.throws(()=>C.next(session(state)),/先检查/);
});
test('backup roundtrip keeps an unchecked draft, hint, queue and prior history without accepting corruption',()=>{
 const state=C.emptyState(),s=session(state),db=C.index(data);s.draft='unfinished';C.useHint(s);
 const restored=C.validateBackup(JSON.stringify(C.exportBackup(state,s,NOW)),data);
 assert.deepEqual(restored.state,state);assert.deepEqual(restored.session,s);
 C.submit(state,s,db.words.get(s.ids[0]),'',NOW+1000);C.next(s,NOW+2000);s.draft='half-draft';
 const backup=C.exportBackup(state,s,NOW+3000);assert.deepEqual(C.validateBackup(backup,data).session,s);
 for(const mutate of [b=>{b.state.records.unknown={...C.recordFor(C.emptyState(),'unknown')};},b=>{b.state.records[s.ids[0]].wrong=-1;},b=>{b.state.days[Object.keys(b.state.days)[0]].attempts++;},b=>{b.session.ids[1]=b.session.ids[0];},b=>{b.session.ids[1]='unknown';},b=>{b.session.results[s.ids[0]].correct=true;},b=>{b.session.index=9;},b=>{b.session.extra='discard me';},b=>{b.savedAt='yesterday';},b=>{b.state.days['2026-02-30']={attempts:0,correct:0,wrong:0,cleanCorrect:0};}]){
   const corrupt=structuredClone(backup);mutate(corrupt);assert.throws(()=>C.validateBackup(corrupt,data));assert.deepEqual(C.validateBackup(backup,data).state,state,'rejection leaves original intact');
 }
 assert.throws(()=>C.loadState('{broken',data),/JSON/);assert.deepEqual(C.loadState(null,data),C.emptyState());
});
test('completed round restores faithfully and letter alignment reveals missing or extra letters',()=>{
 const state=C.emptyState(),s=one(state,'generalize');C.submit(state,s,data.words[1],'generalize',NOW);C.next(s,NOW+1000);
 assert.deepEqual(C.validateBackup(C.exportBackup(state,s,NOW+2000),data).session,s);
 const missing=C.letterDiff('generalize','genralize');assert.equal(missing.filter(d=>d.type==='delete').map(d=>d.expected).join(''),'e');
 const extra=C.letterDiff('generalize','generalizee');assert.equal(extra.filter(d=>d.type==='insert').map(d=>d.typed).join(''),'e');
 const w=word('generalization',['core'],{shape:['generalize','generalize','generally','unknown'],sound:['generally']});assert.deepEqual(C.nearby(data,w).map(x=>x.id),['generalize','generally']);
});
