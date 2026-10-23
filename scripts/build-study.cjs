'use strict';
// Regenerate browser assets from the reviewed canonical content; hosting only validates these assets.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..'), dist=path.join(repo,'dist');
const ctx=vm.createContext({console,URL});
for(const [,url] of fs.readFileSync(path.join(dist,'index.html'),'utf8').matchAll(/<script[^>]+src="([^"]+)"/g)){
 const file=url.split('?')[0];if((file.startsWith('bank-')&&file!=='bank-study.js')||file==='engine.js')vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),ctx);
}
const bank=ctx.QuizEngine.validateBank(ctx.SPORTS_BANK || []).questions;
const prepared=ctx.QuizEngine.validateBank(JSON.parse(fs.readFileSync(path.join(repo,'content/verified-study-cards.json'),'utf8'))).questions;
assert.equal(prepared.length,27);
const metadata={verifiedCards:27,definitions:15,shortAnswers:9,essays:3,reused:prepared.filter(q=>bank.some(b=>b.id===q.id)).length,added:prepared.filter(q=>!bank.some(b=>b.id===q.id)).length};
fs.writeFileSync(path.join(dist,'bank-study.js'),`/* Verified excerpts from user-provided textbooks; study prompts and explanations are authored separately. */\n(function(root){'use strict';\nvar updated=${JSON.stringify(prepared)};\nvar byId=new Map(updated.map(function(q){return [q.id,q];}));\nroot.SPORTS_BANK=root.SPORTS_BANK.map(function(q){var next=byId.get(q.id);if(next){byId.delete(q.id);return next;}return q;}).concat(Array.from(byId.values()));\n(root.SPORTS_CATALOG||[]).forEach(function(book){book.chapters.forEach(function(chapter){chapter.sections.forEach(function(section){var qs=root.SPORTS_BANK.filter(function(q){return q.sectionId===section.id;});section.questionIds=qs.map(function(q){return q.id;});section.counts={term:qs.filter(function(q){return q.examType==='term';}).length,short:qs.filter(function(q){return q.examType==='short';}).length,essay:qs.filter(function(q){return q.examType==='essay';}).length};});});});\nroot.STUDY_RELEASE=${JSON.stringify(metadata)};\n})(globalThis);\n`);
console.log(JSON.stringify(metadata));
