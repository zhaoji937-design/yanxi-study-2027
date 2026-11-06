'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=path.resolve(__dirname,'..'),dist=path.join(repo,'dist'),out=path.join(repo,'qa-output/ease-of-use');
const baseline='d318897e09d583b2ea6f81d9c3b6223e7441a85f',old=new Map(),requests=[],errors=[];
const oldFile=file=>execFileSync('git',['show',baseline+':dist/'+file],{cwd:repo,maxBuffer:32*1024*1024}),oldHTML=oldFile('index.html');
for(const file of new Set(['index.html','latest.html','sw.js','textbook-images.json',...Array.from(oldHTML.toString().matchAll(/(?:src|href)="([^"#]+)"/g),match=>match[1].split('?')[0])]))old.set('/'+file,oldFile(file));
old.set('/',oldHTML);let legacy=false,browser,stage='setup';
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://local'),filePath=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
 if(filePath!==dist&&!filePath.startsWith(dist+path.sep)){res.writeHead(403);return res.end();}
 const file=fs.existsSync(filePath)&&fs.statSync(filePath).isDirectory()?path.join(filePath,'index.html'):filePath;
 const body=legacy&&old.has(url.pathname)?old.get(url.pathname):fs.existsSync(file)?fs.readFileSync(file):null;
 requests.push({path:url.pathname,legacy});res.writeHead(body?200:404,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body||'missing');
});
const noteStage=name=>{stage=name;console.log('Check: '+name);};
function observe(page){page.on('pageerror',error=>errors.push(error.message));}
async function ready(page,version){
 await page.waitForFunction(async expected=>{
  const registration=await navigator.serviceWorker.getRegistration('/'),worker=navigator.serviceWorker.controller||registration?.active;
  if(!worker||worker.state!=='activated')return false;
  return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(false);},1000);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data?.ready&&event.data.version===expected);};worker.postMessage({type:'YANXI_OFFLINE_STATUS'},[channel.port2]);});
 },version,{timeout:60000});
}
async function reading(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('yanxi-reading-v1')||'{}'));}
async function fits(page,label){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' must not overflow horizontally');}
async function route(page,hash,selector){await page.evaluate(hash=>location.hash=hash,hash);if(selector)await page.locator(selector).first().waitFor();}
async function currentSection(page,id){await page.waitForFunction(id=>document.querySelector('.kt-continuous')?.dataset.readingNode===id,id);}

(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||undefined,headless:true});
 const context=await browser.newContext({viewport:{width:1024,height:1100},locale:'zh-CN',hasTouch:true,serviceWorkers:'block',acceptDownloads:true});
 context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(60000);const page=await context.newPage();observe(page);
 await page.goto(base+'/latest.html#overview');await page.locator('.desk-daily').waitFor();
 const sample=await page.evaluate(()=>{
  const bank=QuizEngine.validateBank(SPORTS_BANK).questions,short=bank.find(q=>q.examType==='short'),long=bank.filter(q=>q.examType==='essay').sort((a,b)=>b.answer.join('').length-a.answer.join('').length)[0];
  const oldRecall=StudyTools.nextRecall(null,'missing',Date.now()-3600000),reading={ids:[short.id,long.id],index:0,origin:'bank',drafts:{[short.id]:'旧草稿 <保留> & 逐字内容'},recalls:{[short.id]:oldRecall},marks:{},viewed:[]};
  localStorage.setItem('yanxi-settings-v1',JSON.stringify({paperScope:'all'}));localStorage.setItem('yanxi-reading-v1',JSON.stringify(reading));
  return {short:short.id,long:long.id,recall:oldRecall,draft:reading.drafts[short.id],books:KNOWLEDGE_DATA.books.map(book=>({key:book.key,sections:book.sectionIds}))};
 });
 await page.reload();await page.locator('.desk-daily').waitFor();

 noteStage('page 3 survives reading and returning');
 await route(page,'#bank?view=list&paperScope=all&page=3','.q-row');
 assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('page'),'3');
 const titles=await page.locator('.q-row .q-title').allTextContents();assert.equal(titles.length,10);
 await page.locator('.q-row .q-title').first().click();await page.locator('.reader-card').waitFor();
 assert.equal(new URLSearchParams((await reading(page)).listHash.split('?')[1]).get('page'),'3');
 await page.locator('.reader-controls [data-action=reader-return]').click();await page.locator('.q-row').first().waitFor();
 assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('page'),'3');assert.deepEqual(await page.locator('.q-row .q-title').allTextContents(),titles);
 await page.reload();await page.locator('.q-row').first().waitFor();assert.deepEqual(await page.locator('.q-row .q-title').allTextContents(),titles);

 noteStage('visible chapter filters and one-step clear');
 const filterNames=await page.evaluate(()=>{const book=SPORTS_CATALOG.find(book=>book.key==='training'),chapter=book.chapters.find(chapter=>chapter.id==='training-05');return [book.title.split('（')[0],chapter.title,chapter.sections.find(section=>section.id==='training-05-s02').title];});
 await route(page,'#bank?view=list&book=training&chapter=training-05&section=training-05-s02&type=short&paperScope=all','.active-filters');
 const activeText=await page.locator('.active-filters').innerText();for(const title of filterNames)assert.ok(activeText.includes(title),'active filter must name '+title);
 await page.locator('.active-filters [data-action=clear-filters]').click();await page.waitForFunction(()=>!new URLSearchParams(location.hash.split('?')[1]).get('chapter'));
 for(const key of ['book','chapter','section','type','search','topic','difficulty','status'])assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get(key),null,key+' cleared');

 noteStage('due queue returns to review instead of study instructions');
 await route(page,'#overview','.desk-daily');await page.locator('[data-action=recall-due]').first().click();await page.locator('.reader-card').waitFor();
 const dueReading=await reading(page);assert.equal(dueReading.origin,'revision');assert.match(dueReading.listHash,/^#revision(?:\?|$)/);
 await page.locator('.reader-controls [data-action=reader-return]').click();await page.waitForFunction(()=>location.hash.startsWith('#revision'));await page.locator('.list-view-tabs').waitFor();

 noteStage('fixed reader controls on phone and iPad, and handwriting does not conflict');
 await page.evaluate(({long,short})=>{const saved=JSON.parse(localStorage.getItem('yanxi-reading-v1'));saved.ids=[long,short];saved.index=0;saved.shown=false;saved.variant=0;saved.origin='bank';saved.listHash='#bank?view=list&page=3';localStorage.setItem('yanxi-reading-v1',JSON.stringify(saved));},{long:sample.long,short:sample.short});
 await page.goto(base+'/latest.html#review?id='+encodeURIComponent(sample.long));await page.reload();await page.locator('.reader-card').waitFor();
 for(const width of [390,768,1024]){
  await page.setViewportSize({width,height:1000});
  if(!await page.locator('.reading-answer').count())await page.locator('.reader-controls [data-action=reader-toggle-answer]').click();
  await page.locator('.reading-answer').waitFor();await page.evaluate(()=>window.scrollTo(0,Math.max(700,document.documentElement.scrollHeight*.65)));
  const toolbar=page.locator('.reader-controls');assert.equal(await toolbar.evaluate(el=>getComputedStyle(el).position),'fixed');
  const bounds=await toolbar.boundingBox();assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=1001&&bounds.x>=-1&&bounds.x+bounds.width<=width+1,'toolbar visible '+width);
  for(const action of ['reader-prev','reader-next','reader-toggle-answer','reader-return']){const control=toolbar.locator('[data-action='+action+']');assert.equal(await control.count(),1);const box=await control.boundingBox();assert.ok(box&&box.height>=44,'large control '+action+' '+width);}
  await fits(page,'reader '+width);await page.screenshot({path:path.join(out,'reader-'+width+'.png')});
  await toolbar.locator('[data-action=reader-toggle-answer]').click();assert.equal(await page.locator('.reading-answer').count(),0);
  await toolbar.locator('[data-action=reader-toggle-answer]').click();await page.locator('.reading-answer').waitFor();
 }
 await page.locator('.reader-top [data-action=ink-toggle]').click();assert.ok(await page.locator('body').evaluate(el=>el.classList.contains('ink-active')));assert.equal(await page.locator('.reader-controls').isVisible(),false);
 await page.locator('[data-action=ink-toggle]').filter({hasText:'结束批注'}).first().click();await page.locator('.reader-controls').waitFor();

 noteStage('textbook scroll position, home resume, reload, and map navigation');
 await route(page,'#knowledge?book=training&node=tr4s3&view=outline','.kt-continuous');await currentSection(page,'tr4s3');
 await page.locator('[data-reading-node=know-acquisition] .kt-reading-title').first().scrollIntoViewIfNeeded();
 await page.evaluate(()=>{const element=document.querySelector('[data-reading-node=know-acquisition]');window.scrollTo(0,element.getBoundingClientRect().top+scrollY-130);});
 const expectedPlace=await page.evaluate(()=>KnowledgeTree.currentReadingPlace());assert.equal(expectedPlace.book,'training');assert.notEqual(expectedPlace.node,'tr4s3');
 await page.waitForFunction(node=>JSON.parse(localStorage.getItem('yanxi-reading-v1')).textbookPlaces?.training?.node===node,expectedPlace.node);
 await route(page,'#overview','.desk-reading a');const resumeURL=await page.locator('.desk-reading a').getAttribute('href');assert.equal(new URLSearchParams(resumeURL.split('?')[1]).get('node'),expectedPlace.node);
 await page.locator('.desk-reading a').click();await currentSection(page,'tr4s3');assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('node'),expectedPlace.node);
 await page.reload();await currentSection(page,'tr4s3');assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('node'),expectedPlace.node);
 const visibleAnchor=await page.locator('[data-reading-node="'+expectedPlace.node+'"] .kt-reading-title').first().boundingBox();assert.ok(visibleAnchor&&visibleAnchor.y>=0&&visibleAnchor.y<1000,'reload restores the saved heading');
 await route(page,'#knowledge?book=training&node='+encodeURIComponent(expectedPlace.node)+'&view=map','.kt-map');
 await page.waitForFunction(node=>{const place=JSON.parse(localStorage.getItem('yanxi-reading-v1')).textbookPlaces?.training;return place?.node===node&&place.view==='map';},expectedPlace.node);
 await page.evaluate(()=>{const board=document.querySelector('.kt-map');board.scrollLeft+=180;board.scrollTop+=160;window.scrollTo(0,document.documentElement.scrollHeight);});
 await page.waitForTimeout(550);assert.equal((await reading(page)).textbookPlaces.training.node,expectedPlace.node,'map scrolling keeps selected node');
 await route(page,'#knowledge?book=training&node=training-book&view=map','.kt-map');await page.waitForTimeout(450);assert.equal((await reading(page)).textbookPlaces.training.node,expectedPlace.node,'book directory is not a resume position');
 for(const book of sample.books){
  const first=book.sections[0],last=book.sections.at(-1);
  await route(page,'#knowledge?book='+book.key+'&node='+first+'&view=outline','.kt-continuous');await currentSection(page,first);
  assert.equal(await page.locator('.kt-reading-bottom .kt-section-prev').count(),0);assert.equal(await page.locator('.kt-reading-bottom .kt-section-next').count(),1);
  await page.locator('.kt-reading-bottom .kt-section-next').click();await currentSection(page,book.sections[1]);
  await route(page,'#knowledge?book='+book.key+'&node='+last+'&view=outline','.kt-continuous');await currentSection(page,last);
  assert.equal(await page.locator('.kt-reading-bottom .kt-section-next').count(),0);assert.equal(await page.locator('.kt-reading-bottom .kt-section-prev').count(),1);
 }

 noteStage('complete version:1 backup and mixed old/new reading fields');
 await route(page,'#settings','[data-action=export-backup]');let download=page.waitForEvent('download');await page.locator('[data-action=export-backup]').click();
 const backup=JSON.parse(fs.readFileSync(await(await download).path(),'utf8'));assert.equal(backup.version,1);assert.equal(backup.reading.drafts[sample.short],sample.draft);assert.deepEqual(backup.reading.recalls[sample.short],sample.recall);assert.equal(Object.keys(backup.reading.textbookPlaces).length,3);
 const restore=async data=>{await route(page,'#settings','[data-action=export-backup]');await page.locator('#backup-file').setInputFiles({name:'ease-v1.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('[data-action=confirm-backup]').click();await page.locator('.desk-daily').waitFor();};
 await restore(backup);assert.deepEqual((await reading(page)).textbookPlaces,backup.reading.textbookPlaces);assert.equal((await reading(page)).drafts[sample.short],sample.draft);assert.deepEqual((await reading(page)).recalls[sample.short],sample.recall);
 const older=structuredClone(backup);delete older.reading.textbookPlaces;await restore(older);assert.deepEqual((await reading(page)).textbookPlaces,{});assert.equal((await reading(page)).drafts[sample.short],sample.draft);assert.deepEqual((await reading(page)).recalls[sample.short],sample.recall);
 await restore(backup);await context.close();

 noteStage('v26 to v28 cache upgrade and offline cold resume');legacy=true;
 const upgraded=await browser.newContext({viewport:{width:390,height:1000},locale:'zh-CN'});upgraded.setDefaultTimeout(20000);upgraded.setDefaultNavigationTimeout(60000);const oldPage=await upgraded.newPage();observe(oldPage);
 await oldPage.goto(base+'/latest.html#overview');await ready(oldPage,'yanxi-offline-v26');
 const oldState=await oldPage.evaluate(()=>{const q=QuizEngine.validateBank(SPORTS_BANK).questions.find(q=>q.examType==='short'),recall=StudyTools.nextRecall(null,'missing',Date.now());const values={
  'yanxi-quiz-progress-v1':JSON.stringify(QuizEngine.recordAnswer(QuizEngine.emptyState(),q,[],{mastered:false})),
  'yanxi-reading-v1':JSON.stringify({ids:[q.id],index:0,origin:'professional',drafts:{[q.id]:'升级前草稿'},recalls:{[q.id]:recall}}),
  'yanxi-notes-v1':JSON.stringify([{id:'ease-old-note',title:'旧笔记',text:'升级不得丢失',subject:'346 体育综合',createdAt:'2026-10-23'}]),
  'yanxi-settings-v1':JSON.stringify({paperScope:'all',goal:20}),
  'yanxi-words-v1':'independent-words-data'
 };Object.entries(values).forEach(([key,value])=>localStorage.setItem(key,value));return {values,id:q.id,recall};});
 legacy=false;await oldPage.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration('/')).update();});await ready(oldPage,'yanxi-offline-v28');await oldPage.reload();await oldPage.locator('.desk-daily').waitFor();
 for(const key of ['yanxi-quiz-progress-v1','yanxi-notes-v1','yanxi-words-v1'])assert.equal(await oldPage.evaluate(key=>localStorage.getItem(key),key),oldState.values[key]);
 assert.equal((await reading(oldPage)).drafts[oldState.id],'升级前草稿');assert.deepEqual((await reading(oldPage)).recalls[oldState.id],oldState.recall);
 await route(oldPage,'#knowledge?book=training&node=know-meaning&view=outline','.kt-continuous');await oldPage.waitForFunction(()=>JSON.parse(localStorage.getItem('yanxi-reading-v1')).textbookPlaces?.training?.node);
 await route(oldPage,'#overview','.desk-reading a');const offlineResume=await oldPage.locator('.desk-reading a').getAttribute('href');
 await upgraded.setOffline(true);const cold=await upgraded.newPage();observe(cold);await cold.goto(base+'/latest.html#overview');await cold.locator('.desk-reading a').waitFor();assert.equal(await cold.locator('.desk-reading a').getAttribute('href'),offlineResume);
 await cold.locator('.desk-reading a').click();await currentSection(cold,'tr4s3');assert.ok((await cold.locator('.kt-continuous .kt-body').allTextContents()).join('').length>300);
 const nextSection=await cold.locator('.kt-reading-bottom .kt-section-next').getAttribute('href');await cold.locator('.kt-reading-bottom .kt-section-next').click();await currentSection(cold,new URLSearchParams(nextSection.split('?')[1]).get('node'));await cold.reload();await cold.locator('.kt-continuous').waitFor();await fits(cold,'offline textbook');
 assert.equal((await reading(cold)).drafts[oldState.id],'升级前草稿');assert.deepEqual((await reading(cold)).recalls[oldState.id],oldState.recall);
 await upgraded.close();assert.deepEqual(errors,[]);assert.equal(requests.filter(request=>request.path.startsWith('/textbook-images/')).length,0,'no whole-book image downloads required');
 const report={passed:true,pageAndBatchRestored:true,visibleFiltersAndClear:true,dueQueueReturnsToRevision:true,fixedReaderToolbar:true,handwritingToolbarHidden:true,widths:[390,768,1024],textbookResumeAndReload:true,mapPositionStaysSelected:true,sectionBoundaries:true,backupVersion1:true,oldDraftsAndRecallsPreserved:true,cacheUpgrade:'v26 to v28',offlineResumeAndSectionPaging:true,imagePackDownloads:0,errors};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(error=>{console.error('Failed during '+stage+':',error);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve));});
