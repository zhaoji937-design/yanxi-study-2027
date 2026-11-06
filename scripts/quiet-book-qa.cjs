'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=path.resolve(__dirname,'..'),dist=path.join(repo,'dist'),out=path.join(repo,'qa-output/quiet-book');
const baseline='ac9ccad2dec4dd1a8df2a0d5790b1a605792f889',old=new Map(),requests=[],errors=[];
const oldFile=file=>execFileSync('git',['show',baseline+':dist/'+file],{cwd:repo,maxBuffer:32*1024*1024}),oldHTML=oldFile('index.html');
for(const file of new Set(['index.html','latest.html','sw.js','textbook-images.json',...Array.from(oldHTML.toString().matchAll(/(?:src|href)="([^"#]+)"/g),match=>match[1].split('?')[0])]))old.set('/'+file,oldFile(file));
old.set('/',oldHTML);let legacy=false,browser,stage='setup';
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://local');let file=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
 if(file!==dist&&!file.startsWith(dist+path.sep)){res.writeHead(403);return res.end();}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 const body=legacy&&old.has(url.pathname)?old.get(url.pathname):fs.existsSync(file)?fs.readFileSync(file):null;
 requests.push({path:url.pathname,legacy});res.writeHead(body?200:404,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body||'missing');
});
const note=name=>{stage=name;console.log('Check: '+name);};
const observe=page=>page.on('pageerror',error=>errors.push(error.message));
async function ready(page,version){await page.waitForFunction(async expected=>{
 const registration=await navigator.serviceWorker.getRegistration('/'),worker=navigator.serviceWorker.controller||registration?.active;if(!worker||worker.state!=='activated')return false;
 return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(false);},1000);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data?.ready&&event.data.version===expected);};worker.postMessage({type:'YANXI_OFFLINE_STATUS'},[channel.port2]);});
},version,{timeout:60000});}
async function fits(page,label){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' horizontal overflow');}
async function reading(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('yanxi-reading-v1')||'{}'));}
async function section(page,id){await page.waitForFunction(id=>document.querySelector('.kt-continuous')?.dataset.readingNode===id,id);}
async function bodyHasSource(page,id){
 const check=await page.evaluate(id=>{const n=KNOWLEDGE_DATA.nodes.find(n=>n.id===id),unit=document.querySelector('[data-reading-node="'+id+'"]'),text=unit?.querySelector('.kt-body')?.textContent||'';return {id,source:n?.body||[],text};},id);
 assert.ok(check.source.length,id+' source body exists');for(const text of check.source)assert.ok(check.text.includes(text),id+' keeps original paragraph: '+text.slice(0,35));
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||undefined,headless:true});
 const context=await browser.newContext({viewport:{width:1024,height:1100},locale:'zh-CN',hasTouch:true,acceptDownloads:true});context.setDefaultTimeout(20000);context.setDefaultNavigationTimeout(60000);
 const page=await context.newPage();observe(page);const go=async(hash,selector)=>{await page.goto(base+'/latest.html'+hash);await page.locator(selector).first().waitFor();};
 await go('#overview','.desk-daily');await ready(page,'yanxi-offline-v29');
 const books=await page.evaluate(()=>KNOWLEDGE_DATA.books.map(b=>({key:b.key,id:b.id,chapterIds:b.chapterIds,sectionIds:b.sectionIds})));
 note('catalog separates choosing a chapter from reading');
 for(const book of books){await go('#knowledge?book='+book.key+'&node='+book.id+'&view=outline','.kt-catalog');assert.equal(await page.locator('details.kt-catalog-chapter[data-chapter]').count(),book.chapterIds.length);}
 for(const width of [390,768,1024]){
  await page.setViewportSize({width,height:1100});await go('#knowledge?book=training&node=training-book&view=outline','.kt-catalog');await fits(page,'book '+width);
  await page.screenshot({path:path.join(out,'book-'+width+'.png'),fullPage:true});
  const chapter=page.locator('details.kt-catalog-chapter[data-chapter="training-ch4"]');if(!await chapter.evaluate(el=>el.open))await chapter.locator(':scope>summary').click();
  const target=chapter.locator('a.kt-catalog-section').filter({hasText:'运动员知识能力'}).first();await target.waitFor();await target.click();await section(page,'tr4s3');
  assert.equal(await page.locator('.kt-reader .kt-toolbar').count(),1);assert.equal(await page.locator('.kt-reader .kt-toolbar nav.kt-reading-nav').count(),1);
  assert.equal(await page.locator('.kt-continuous>.kt-breadcrumb').evaluateAll(elements=>elements.filter(el=>el.getClientRects().length).length),0,'no repeated visible breadcrumb');
  assert.equal(await page.locator('.kt-section-menu').first().evaluate(el=>el.open),false);
  assert.ok(await page.locator('.kt-continuous>.kt-reading-unit .kt-body').first().isVisible(),'body visible immediately');
  assert.ok(await page.locator('.kt-continuous>.kt-reading-unit .kt-memory-cue .kt-memory-anchors').first().isVisible(),'short memory anchors visible');
  assert.equal(await page.locator('details.kt-memory-details').evaluateAll(elements=>elements.filter(el=>el.open).length),0,'long memory guidance folded by default');
  await bodyHasSource(page,'know-meaning');await bodyHasSource(page,'know-application');await fits(page,'reader '+width);await page.screenshot({path:path.join(out,'reader-'+width+'.png')});
  await go('#knowledge?book=training&node=training-ch4&view=outline','.kt-catalog');assert.equal(await page.locator('a.kt-catalog-section').count(),3);await fits(page,'chapter '+width);await page.screenshot({path:path.join(out,'chapter-'+width+'.png'),fullPage:true});
 }
 note('memory and section summary remain complete on demand');
 await go('#knowledge?book=physiology&node=kb-physiology-01-s01-source008&view=outline','.kt-reader');
 const cue=page.locator('[data-reading-node="kb-physiology-01-s01-source008"] .kt-memory-cue').first(),details=cue.locator('details.kt-memory-details');
 await cue.locator('.kt-memory-anchors').waitFor();assert.equal(await details.evaluate(el=>el.open),false);await details.locator(':scope>summary').click();
 const guide=await page.evaluate(()=>KNOWLEDGE_DATA.readingGuides['kb-physiology-01-s01-source008']);assert.ok(guide?.memory);assert.ok((await details.innerText()).includes(guide.memory));assert.ok((await details.innerText()).includes(guide.pitfall));assert.ok(await details.locator('.kt-recall-order li').count()>=3);
 const menu=page.locator('.kt-section-menu').first();assert.equal(await menu.evaluate(el=>el.open),false);await menu.locator(':scope>summary').click();assert.ok(await menu.locator('.kt-unit-toc').isVisible());assert.ok((await menu.innerText()).length>100);await menu.locator(':scope>summary').click();
 note('folding keeps paragraph and heading ink owners unchanged');
 await go('#knowledge?book=training&section=tr4s3&node=know-overview&view=outline&scope=tr4s3','.kt-reader');
 const inkSeed=await page.evaluate(()=>{
  const owner=document.querySelector('[data-reading-node="know-overview"]'),para=owner.querySelector('.kt-body .ink-block'),title=owner.querySelector('.kt-reading-title.ink-block');if(!para||!title)throw Error('Missing stable heading/body anchors');
  const blocks={};for(const[el,id]of [[para,'quiet-old-body-note'],[title,'quiet-old-title-note']]){const quote=el.querySelector('.ink-text').textContent;blocks[el.dataset.inkKey]={owner:el.closest('[data-ink-owner]').dataset.inkOwner,quote,space:2,strokes:[{id,at:1790000000000,offset:0,anchorMode:'paragraph',brush:'pen',opacity:1,color:'#a34235',width:.14,points:[[1,1,.5],[3,2,.5]]}]};}
  const value=JSON.stringify({version:1,blocks});localStorage.setItem('yanxi-ink-v1',value);InkNotes.reload();return value;
 });
 await page.locator('[data-ink-stroke="quiet-old-body-note"]').waitFor();await page.locator('[data-ink-stroke="quiet-old-title-note"]').waitFor();
 const headingKeys=await page.locator('.kt-reading-title.ink-block').evaluateAll(elements=>elements.map(el=>[el.dataset.inkKey,el.querySelector('.ink-text').textContent]));
 const fold=page.locator('[data-action="kt-fold"][data-node="know-overview"]');await fold.click();assert.equal(await page.locator('#kt-reading-body-know-overview').isVisible(),false);assert.equal(await page.locator('[data-ink-stroke="quiet-old-body-note"]').count(),0);assert.equal(await page.locator('[data-ink-stroke="quiet-old-title-note"]').count(),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('yanxi-ink-v1')),inkSeed);await fold.click();await page.locator('[data-ink-stroke="quiet-old-body-note"]').waitFor();
 assert.deepEqual(await page.locator('.kt-reading-title.ink-block').evaluateAll(elements=>elements.map(el=>[el.dataset.inkKey,el.querySelector('.ink-text').textContent])),headingKeys);
 await fold.click();await go('#knowledge?book=training&section=tr4s3&node=know-meaning&view=outline&scope=tr4s3','.kt-reader');assert.equal(await page.locator('#kt-reading-body-know-overview').isVisible(),true,'old deep link expands folded parent');await page.locator('[data-reading-node="know-meaning"] .kt-reading-title').first().waitFor();
 note('resume and version:1 backup retain the same learning data');
 await page.evaluate(()=>{const element=document.querySelector('[data-reading-node="know-acquisition"] .kt-reading-title');window.scrollTo(0,element.getBoundingClientRect().top+scrollY-120);});
 const expected=await page.evaluate(()=>KnowledgeTree.currentReadingPlace());await page.waitForFunction(node=>JSON.parse(localStorage.getItem('yanxi-reading-v1')).textbookPlaces?.training?.node===node,expected.node);
 await go('#overview','.desk-reading a');const resume=await page.locator('.desk-reading a').getAttribute('href');assert.equal(new URLSearchParams(resume.split('?')[1]).get('node'),expected.node);await page.locator('.desk-reading a').click();await section(page,'tr4s3');
 await go('#settings','[data-action="export-backup"]');const download=page.waitForEvent('download');await page.locator('[data-action="export-backup"]').click();const backup=JSON.parse(fs.readFileSync(await(await download).path(),'utf8'));assert.equal(backup.version,1);assert.deepEqual(backup.ink,JSON.parse(inkSeed));assert.ok(backup.reading.textbookPlaces.training.node);
 const restore=async value=>{await go('#settings','[data-action="export-backup"]');await page.locator('#backup-file').setInputFiles({name:'quiet-book-v1.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});await page.locator('[data-action="confirm-backup"]').click();await page.locator('.desk-daily').waitFor();};
 await restore(backup);assert.deepEqual((await reading(page)).textbookPlaces,backup.reading.textbookPlaces);assert.deepEqual(await page.evaluate(()=>InkNotes.exportData()),backup.ink);
 const older=structuredClone(backup);delete older.reading.textbookPlaces;await restore(older);assert.deepEqual((await reading(page)).textbookPlaces,{});assert.deepEqual(await page.evaluate(()=>InkNotes.exportData()),backup.ink);await context.close();
 note('v28 to v29 upgrade keeps old title and body ink, drafts and recalls');legacy=true;
 const upgrade=await browser.newContext({viewport:{width:390,height:1100},locale:'zh-CN'}),oldPage=await upgrade.newPage();upgrade.setDefaultTimeout(20000);upgrade.setDefaultNavigationTimeout(60000);observe(oldPage);
 const oldHash='#knowledge?book=physiology&node=kb-physiology-01-s01-source008&view=outline';await oldPage.goto(base+'/latest.html'+oldHash);await ready(oldPage,'yanxi-offline-v28');
 const seed=await oldPage.evaluate(()=>{
  const q=QuizEngine.validateBank(SPORTS_BANK).questions.find(q=>q.examType==='short'),recall=StudyTools.nextRecall(null,'missing',Date.now());
  const unit=document.querySelector('[data-reading-node="kb-physiology-01-s01-source008"]'),para=unit.querySelector('.kt-body .ink-block'),title=unit.querySelector('.kt-reading-title.ink-block'),blocks={};if(!para||!title)throw Error('Missing old v28 ink anchors');
  for(const[el,id]of [[para,'quiet-upgrade-body'],[title,'quiet-upgrade-title']])blocks[el.dataset.inkKey]={owner:el.closest('[data-ink-owner]').dataset.inkOwner,quote:el.querySelector('.ink-text').textContent,space:2,strokes:[{id,at:1790000000000,offset:0,anchorMode:'paragraph',brush:'pen',opacity:1,color:'#a34235',width:.14,points:[[1,1,.5],[3,2,.5]]}]};
  const values={'yanxi-reading-v1':JSON.stringify({ids:[q.id],index:0,origin:'professional',drafts:{[q.id]:'升级前草稿 <保留>'},recalls:{[q.id]:recall}}),'yanxi-ink-v1':JSON.stringify({version:1,blocks}),'yanxi-quiz-progress-v1':JSON.stringify(QuizEngine.recordAnswer(QuizEngine.emptyState(),q,[],{mastered:false})),'yanxi-notes-v1':JSON.stringify([{id:'quiet-old-note',title:'旧笔记',text:'正文之外的资料保留',subject:'346 体育综合',createdAt:'2026-10-27'}]),'yanxi-words-v1':'words-keep'};Object.entries(values).forEach(([key,value])=>localStorage.setItem(key,value));return {values,id:q.id,recall};
 });
 legacy=false;await oldPage.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration('/')).update();});await ready(oldPage,'yanxi-offline-v29');await oldPage.reload();await oldPage.locator('.kt-reader').waitFor();
 for(const key of ['yanxi-ink-v1','yanxi-quiz-progress-v1','yanxi-notes-v1','yanxi-words-v1'])assert.equal(await oldPage.evaluate(key=>localStorage.getItem(key),key),seed.values[key],key+' upgrade bytes retained');
 assert.equal((await reading(oldPage)).drafts[seed.id],'升级前草稿 <保留>');assert.deepEqual((await reading(oldPage)).recalls[seed.id],seed.recall);await oldPage.locator('[data-ink-stroke="quiet-upgrade-body"]').waitFor();await oldPage.locator('[data-ink-stroke="quiet-upgrade-title"]').waitFor();
 const names=await oldPage.evaluate(()=>caches.keys());assert.ok(names.includes('yanxi-offline-v29'));await ready(oldPage,'yanxi-offline-v29');
 await upgrade.setOffline(true);const cold=await upgrade.newPage();observe(cold);await cold.goto(base+'/latest.html#overview');await cold.locator('.desk-reading a').waitFor();await cold.locator('.desk-reading a').click();await cold.locator('.kt-reader').waitFor();assert.ok((await cold.locator('.kt-continuous>.kt-reading-unit .kt-body').allTextContents()).join('').length>=300);await cold.locator('[data-ink-stroke="quiet-upgrade-body"]').waitFor();
 const next=await cold.locator('.kt-reading-bottom .kt-section-next').getAttribute('href');await cold.locator('.kt-reading-bottom .kt-section-next').click();await section(cold,new URLSearchParams(next.split('?')[1]).get('node'));await cold.reload();await cold.locator('.kt-reader').waitFor();await fits(cold,'offline reader');
 assert.equal((await reading(cold)).drafts[seed.id],'升级前草稿 <保留>');assert.deepEqual((await reading(cold)).recalls[seed.id],seed.recall);await upgrade.close();assert.deepEqual(errors,[]);assert.equal(requests.filter(request=>request.path.startsWith('/textbook-images/')).length,0);
 const report={passed:true,catalogChapterSectionFlow:true,widths:[390,768,1024],singleReaderToolbar:true,noRepeatedBreadcrumb:true,sectionSummaryFolded:true,memoryAnchorsVisible:true,fullMemoryAvailable:true,bodyParagraphsRetained:true,foldAndDeepLink:true,oldInkBytesAndHeadingKeysRetained:true,resume:true,backupVersion1:true,cacheUpgrade:'v28 to v29',offlineResumeAndNextSection:true,imagePackDownloads:0,errors};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(error=>{console.error('Failed during '+stage+':',error);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve));});
