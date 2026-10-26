'use strict';
// Canonical revision input is reviewed separately. This script does not read private textbook files.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const repo=path.resolve(__dirname,'..'),dist=path.join(repo,'dist');
const revised=JSON.parse(fs.readFileSync(path.join(repo,'content/sports-revised.json'),'utf8'));
assert.equal(revised.version,1);assert.ok(Array.isArray(revised.questions));
const context=vm.createContext({console,URL});
vm.runInContext(fs.readFileSync(path.join(dist,'engine.js'),'utf8'),context);
const safe=context.QuizEngine.validateBank(revised).questions;
// Retain catalog identifiers, while aligning a revised definition's index to its actual source.
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
for(const [,src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)){
 const name=src.split('?')[0];if(name.startsWith('bank-')&&name!=='bank-sports-revised.js')vm.runInContext(fs.readFileSync(path.join(dist,name),'utf8'),context);
}
const imageIndex=JSON.parse(fs.readFileSync(path.join(dist,'textbook-images.json'),'utf8'));
const images=imageIndex.version===1?imageIndex.images:Object.assign({},...Object.keys(imageIndex.packs).map(file=>JSON.parse(fs.readFileSync(path.join(dist,file),'utf8')).images));
const crypto=require('node:crypto');
for(const [key,url] of Object.entries(images)){
 assert.match(key,/^[a-f0-9]{24}$/);assert.match(url,/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/);
 const bytes=Buffer.from(url.split(',')[1],'base64');assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').slice(0,24),key);
}
assert.equal(safe.length,610);assert.equal(new Set(safe.map(q=>q.id)).size,610);
for(const q of safe){
 assert.ok(q.textbookRevision,q.id+' missing revision');
 assert.ok(q.answerOutline.length&&q.answerOutline.every(k=>k.length<=45&&!/[。！？]/.test(k)),q.id+' must use memory keywords');
 if(q.examType==='short'){
  assert.ok(q.recallGuide,q.id+' must have a direct recall answer');
  assert.ok(q.answer.every(p=>p.includes('\n')),q.id+' needs separate point headings');
  assert.doesNotMatch(q.answer.join('\n'),/教材(?:指出|介绍|列举|强调|认为|描述|提出|通过|称为|把)|本书|本版|本题|题干|考场|作答|回答时|答题|复习时|应写|不能只写|不能只背|按教材/,q.id+' contains tutorial commentary in the primary answer');
  assert.ok(q.recallGuide.highlights.every(k=>q.answer.join('\n').includes(k)),q.id+' emphasis must be literal answer text');
 }
 if(q.examType==='term'){
  assert.equal(q.textbookRevision.status,'verbatim',q.id+' must have source definition');
  assert.ok(q.textbookRevision.images?.length,q.id+' must have definition images');
  for(const img of q.textbookRevision.images)assert.ok(images[img.key],q.id+' image is absent');
  const book=context.SPORTS_CATALOG.find(b=>b.key===q.bookKey||b.id===q.bookKey),p=q.textbookRefs[0].printedPages[0];
  if(book){for(const chapter of book.chapters){const section=chapter.sections.find(s=>s.printedPages.includes(p));if(section){q.chapterId=chapter.id;q.sectionId=section.id;q.headingPath=[chapter.title,section.title,q.termName||q.prompt];break;}}}
 }
 assert.ok(q.textbookRefs.every(r=>r.printedPages?.length));
}
const counts=Object.fromEntries(['term','short','essay'].map(k=>[k,safe.filter(q=>q.examType===k).length]));
const summary={date:revised.revisedAt,total:safe.length,counts,reclassified:safe.filter(q=>q.textbookRevision.originalExamType!==q.examType).length,recallAnswers:safe.filter(q=>q.recallGuide).length};
const source=`/* Reorganized from user-provided textbooks. Definitions quote checked source; commentary is separate. */\n(function(root){'use strict';\nroot.SPORTS_BANK=${JSON.stringify(safe)};\n(root.SPORTS_CATALOG||[]).forEach(function(book){book.chapters.forEach(function(chapter){chapter.sections.forEach(function(section){var qs=root.SPORTS_BANK.filter(function(q){return q.sectionId===section.id;});section.questionIds=qs.map(function(q){return q.id;});section.counts=Object.fromEntries(['term','short','essay'].map(function(k){return [k,qs.filter(function(q){return q.examType===k;}).length];}));});});});\nroot.SPORTS_COVERAGE=Object.assign({},root.SPORTS_COVERAGE,{counts:${JSON.stringify(counts)}});\nroot.SPORTS_REVISION=${JSON.stringify(summary)};\n})(globalThis);\n`;
assert.doesNotMatch(source,/C:\\\\Users|D:\\\\gpt|桌面上的文件/,'do not publish local source paths');
if(process.argv.includes('--check')){
 assert.equal(fs.readFileSync(path.join(dist,'bank-sports-revised.js'),'utf8'),source,'Generated sports bank is stale');
 assert.equal(fs.readFileSync(path.join(repo,'content/sports-revision-summary.json'),'utf8'),JSON.stringify(summary,null,2)+'\n');
}else{
 fs.writeFileSync(path.join(dist,'bank-sports-revised.js'),source);
 fs.writeFileSync(path.join(repo,'content/sports-revision-summary.json'),JSON.stringify(summary,null,2)+'\n');
}
console.log(JSON.stringify(summary));
