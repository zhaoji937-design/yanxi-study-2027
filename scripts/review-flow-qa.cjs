'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../dist'),out=path.resolve(process.env.YANXI_QA_OUTPUT||path.join(__dirname,'../qa-output/review-flow'));fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(f).pipe(res);});
let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.PHASE1_QA_BASE||'http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||undefined,headless:true});
 const context=await browser.newContext({viewport:{width:1024,height:1100},locale:'zh-CN',hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 context.setDefaultNavigationTimeout(90000);context.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 const go=async hash=>{await page.evaluate(h=>location.hash=h,hash);await page.waitForFunction(h=>document.querySelector('.shell')?.dataset.page===h.split('?')[0].replace('#',''),hash);};
 const read=async()=>page.evaluate(()=>Object.fromEntries(['yanxi-reading-v1','yanxi-quiz-progress-v1','yanxi-session-v1','yanxi-settings-v1'].map(k=>[k,JSON.parse(localStorage.getItem(k))])));
 const seed=async(data,hash='#overview')=>{await page.evaluate(data=>{for(const k of ['yanxi-reading-v1','yanxi-quiz-progress-v1','yanxi-session-v1','yanxi-settings-v1','yanxi-custom-bank-v1'])localStorage.removeItem(k);for(const[k,v]of Object.entries(data))localStorage.setItem(k,JSON.stringify(v));},data);await page.goto(base+'/latest.html'+hash);await page.reload();await page.locator('.shell').waitFor();};
 await page.goto(base+'/latest.html');await page.locator('.desk-daily').waitFor();
 const samples=await page.evaluate(()=>{
  const qs=QuizEngine.validateBank(SPORTS_BANK).questions,t=StudyTools,index=t.paperIndex(PAST_PAPERS),concept=t.paperIndex(PAST_PAPERS,true);
  return {all:qs.map(q=>q.id),core:qs.filter(q=>t.allowPaper(q,'topics',index,concept)).map(q=>q.id),exact:qs.filter(q=>index.has(q.id)).map(q=>q.id),related:qs.filter(q=>concept.has(q.id)&&!index.has(q.id)).map(q=>q.id)};
 });
 assert.ok(samples.core.length>10&&samples.exact.length&&samples.related.length);
 const [a,b,future,marked,wrong]=samples.core,exact=samples.exact[0],related=samples.related[0];
 const now=Date.now(),r=(result,due,streak=0)=>({result,due,streak,updated:now-86400000});
 const reading={ids:[b,a],index:1,shown:false,variant:0,origin:'professional',scope:{book:'school',type:'short'},marks:{[marked]:'review'},viewed:[a,b],recalls:{[a]:r('missing',now-1000),[b]:r('independent',now-2000,1),[exact]:r('missing',now-3000),[related]:r('missing',now-4000),[future]:r('independent',now+86400000,1)},ratingLock:''};
 const progress=await page.evaluate(wrong=>{const q=SPORTS_BANK.find(q=>q.id===wrong);return QuizEngine.recordAnswer(QuizEngine.emptyState(),q,[],{mastered:false,now:Date.now()-86400000});},wrong);
 const initial={'yanxi-reading-v1':reading,'yanxi-quiz-progress-v1':progress,'yanxi-settings-v1':{paperScope:'topics',goal:10}};
 await seed(initial);
 // Four scopes: home CTA, method page and actual queue use the same due subset.
 const expected={topics:[a,b],daily:[a,b,related],all:[a,b,exact,related],past:[exact]};
 for(const scope of ['topics','daily','all','past']){
  await go('#bank');await page.locator('#paper-scope').selectOption(scope);await go('#overview');
  const due=page.locator('.desk-daily [data-action=recall-due]');assert.equal(await due.innerText(),'今日复习 '+expected[scope].length+' 题');
  assert.equal(await page.locator('.desk > :first-child').getAttribute('class'),'desk-daily');
  await page.locator('.mobile-menu').click();await page.locator('#main-navigation.mobile-open').waitFor();const nav=page.locator('#main-navigation');
  assert.match(await nav.locator('[data-route=revision]').innerText(),/答错、标记需复习[与和]到期/);
  assert.match(await nav.locator('[data-route=revision]').innerText(),/到期回忆只含排程到期题/);await nav.locator('.nav-close').click();
  await page.locator('.desk-progress>summary').click();assert.match(await page.locator('.desk-progress').innerText(),/待复习[\s\S]*答错、标记需复习与到期/);assert.match(await page.locator('.desk-review-help').innerText(),/仅含按回忆排程已到期/);
  if(scope==='topics'){
   const stat=page.locator('.desk-progress [data-route=mistakes] .stat-number');assert.match(await stat.innerText(),/^4/,'mixed review includes two due, one manual and one wrong');
   await page.locator('.desk-progress [data-route=mistakes]').click();await page.locator('.q-row').first().waitFor();assert.equal(await page.locator('.q-row').count(),4);await go('#overview');
  }
  await page.locator('.desk-daily [data-action=recall-due]').click();await page.locator('.reader-card').waitFor();const saved=(await read())['yanxi-reading-v1'];assert.deepEqual([...saved.ids].sort(),expected[scope].sort());assert.equal(saved.origin,'study');assert.equal(saved.index,0);
  await go('#study');assert.equal(await page.locator('#main [data-action=recall-due]').innerText(),'到期回忆 '+expected[scope].length+' 题');
 }
 // No due: resume keeps the prior position; unseen ignores stale list filters and respects settings.
 const zero=structuredClone(reading);zero.recalls={};
 await seed({...initial,'yanxi-reading-v1':zero});assert.match(await page.locator('.desk-daily-title').innerText(),/今天没有到期/);
 await page.locator('.desk-daily [data-action=resume-reading]').click();await page.locator('.reader-card').waitFor();assert.ok(page.url().endsWith(encodeURIComponent(a)));assert.equal((await read())['yanxi-reading-v1'].index,1);
 await go('#bank');await page.locator('#filter-book').selectOption('training');await go('#overview');await page.locator('[data-action=read-unseen]').click();await page.locator('.reader-card').waitFor();
 assert.deepEqual((await read())['yanxi-reading-v1'].ids,samples.core.filter(id=>![a,b,wrong].includes(id)).slice(0,10));
 await seed({});assert.equal(await page.locator('.desk-daily [data-action=resume-reading]').isDisabled(),true);await page.locator('[data-action=read-unseen]').click();await page.locator('.reader-card').waitFor();assert.equal((await read())['yanxi-reading-v1'].ids.length,10);
 await seed({'yanxi-reading-v1':{...zero,ids:[],index:0,viewed:samples.all}});await page.locator('[data-action=read-unseen]').click();assert.match(await page.locator('#toast').innerText(),/都已看过/);assert.ok(page.url().endsWith('#overview'));
 // Subjective grades retain progress/history and update the same existing recall records.
 const practiceReading={...reading,recalls:{[a]:r('independent',now-1000,2),[b]:r('independent',now-1000,3),[future]:reading.recalls[future]},marks:{[a]:'review'},ratingLock:''};
 const priorProgress=await page.evaluate(id=>{const q=SPORTS_BANK.find(q=>q.id===id);return QuizEngine.toggleFavorite(QuizEngine.recordAnswer(QuizEngine.emptyState(),q,[],{mastered:false,now:Date.now()-86400000}),id);},a);
 const practiceSession={ids:[a,b],index:0,entries:{[a]:{selected:[],draft:'旧草稿保留 <重点>',revealed:true,answered:false,correct:false}},startedAt:now,completed:false};
 const practiceSeed={'yanxi-reading-v1':practiceReading,'yanxi-quiz-progress-v1':priorProgress,'yanxi-session-v1':practiceSession,'yanxi-settings-v1':{paperScope:'all',goal:10}};
 await seed(practiceSeed,'#practice');
 // Simulate a quota failure after progress was written: every persisted record rolls back, retry remains possible.
 const beforeFail=await read();await page.evaluate(()=>{window.__failOnce=true;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='yanxi-reading-v1'&&window.__failOnce){window.__failOnce=false;throw new DOMException('Quota','QuotaExceededError');}return set.call(this,k,v);};});
 await page.locator('[data-action=grade-free][data-mastered=true]').click();assert.deepEqual(await read(),beforeFail);assert.equal(await page.locator('[data-action=grade-free]').count(),2);assert.match(await page.locator('#toast').innerText(),/已保留原有数据/);
 await page.locator('[data-action=grade-free][data-mastered=true]').click();let saved=await read(),recall=saved['yanxi-reading-v1'].recalls[a];
 assert.equal(recall.result,'independent');assert.equal(recall.streak,3);assert.equal(recall.due-recall.updated,7*86400000);assert.equal(saved['yanxi-reading-v1'].marks[a],'mastered');
 assert.equal(saved['yanxi-quiz-progress-v1'].records[a].attempts,2);assert.equal(saved['yanxi-quiz-progress-v1'].records[a].wrong,1);assert.equal(saved['yanxi-quiz-progress-v1'].records[a].favorite,true);assert.deepEqual(saved['yanxi-quiz-progress-v1'].history[0],priorProgress.history[0]);assert.equal(saved['yanxi-quiz-progress-v1'].history.length,2);assert.deepEqual(saved['yanxi-reading-v1'].recalls[future],reading.recalls[future]);assert.deepEqual(saved['yanxi-reading-v1'].ids,reading.ids);assert.equal(saved['yanxi-session-v1'].entries[a].draft,practiceSession.entries[a].draft);assert.match(await page.locator('.practice-recall-note').innerText(),/已同步到回忆排程/);
 const afterGrade=await read();await page.reload();await page.locator('.question-panel').waitFor();assert.equal(await page.locator('[data-action=grade-free]').count(),0);assert.deepEqual(await read(),afterGrade,'reload does not grade twice');
 await page.locator('[data-action=next-question]').click();await page.locator('[data-action=submit-answer]').click();await page.locator('[data-action=grade-free][data-mastered=false]').click();saved=await read();recall=saved['yanxi-reading-v1'].recalls[b];assert.equal(recall.result,'missing');assert.equal(recall.streak,0);assert.equal(recall.due-recall.updated,1800000);assert.equal(saved['yanxi-reading-v1'].marks[b],'review');assert.equal(saved['yanxi-quiz-progress-v1'].records[b].wrong,1);assert.equal(saved['yanxi-quiz-progress-v1'].history.length,3);
 // Reader grading builds on the practice streak rather than starting a separate schedule.
 await go('#review?id='+encodeURIComponent(a));if(await page.locator('.recall-buttons').count()===0)await page.locator('[data-action=reader-reveal]').click();
 await page.locator('[data-action=recall-rate][data-result=independent]').click();saved=await read();assert.equal(saved['yanxi-reading-v1'].recalls[a].streak,4);assert.equal(saved['yanxi-reading-v1'].recalls[a].due-saved['yanxi-reading-v1'].recalls[a].updated,14*86400000);assert.equal(saved['yanxi-quiz-progress-v1'].history.length,3,'reader self-grade does not delete or duplicate practice history');
 // Full backup v1 round trip, then a v1 backup without the recall feature.
 await go('#settings');const download=page.waitForEvent('download');await page.locator('[data-action=export-backup]').click();const backup=JSON.parse(fs.readFileSync(await(await download).path(),'utf8'));assert.equal(backup.version,1);assert.equal(backup.progress.version,1);assert.equal(backup.questions.length,610);assert.deepEqual(backup.reading.recalls,saved['yanxi-reading-v1'].recalls);
 const restore=async backup=>{await page.locator('#backup-file').setInputFiles({name:'phase1-v1.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.locator('[data-action=confirm-backup]').click();await page.locator('.desk-daily').waitFor();};
 await restore(backup);assert.deepEqual((await read())['yanxi-reading-v1'].recalls,backup.reading.recalls);assert.equal((await read())['yanxi-settings-v1'].paperScope,'all');assert.deepEqual((await read())['yanxi-quiz-progress-v1'],backup.progress);
 const old=structuredClone(backup);delete old.reading.recalls;delete old.reading.ratingLock;delete old.settings.paperScope;await go('#settings');await restore(old);assert.deepEqual((await read())['yanxi-reading-v1'].recalls,{});assert.deepEqual((await read())['yanxi-quiz-progress-v1'],backup.progress);assert.equal((await read())['yanxi-settings-v1'].paperScope,'topics');
 // Phone and iPad: inspect real actions, statistics and drawer; all controls remain reachable.
 for(const width of [390,768,1024]){
  await page.setViewportSize({width,height:1000});await seed(initial);await page.locator('.desk-progress>summary').click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'home fits '+width);assert.equal(await page.locator('.desk-mascot').count(),1);const box=await page.locator('.desk-daily .btn').boundingBox();assert.ok(box.width>=44&&box.height>=44);await page.screenshot({path:path.join(out,'due-'+width+'.png'),fullPage:true});
  await page.locator('.mobile-menu').click();await page.waitForFunction(()=>document.querySelector('#main-navigation.mobile-open')?.getBoundingClientRect().left>=-0.5);assert.ok(await page.locator('#main-navigation [data-route=revision]').isVisible());await page.screenshot({path:path.join(out,'nav-'+width+'.png')});await page.locator('.nav-close').click();
  await seed({...initial,'yanxi-reading-v1':zero});await page.screenshot({path:path.join(out,'empty-'+width+'.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'empty home fits '+width);await page.locator('[data-action=read-unseen]').click();await page.locator('.reader-card').waitFor();
 }
 // Imported objective questions still grade normally, without creating subjective recall records.
 const objective={id:'phase1-objective',subject:'346 体育综合',bookKey:'school',topic:'测试知识点',prompt:'兼容性测试题',type:'single',options:[{id:'A',text:'正确选项'},{id:'B',text:'其他选项'}],answer:['A'],explanation:'验证原有客观题作答。',tags:[],difficulty:1,sourceNote:'浏览器兼容性测试'};
 await seed({'yanxi-custom-bank-v1':[objective],'yanxi-session-v1':{ids:[objective.id],index:0,entries:{},startedAt:now,completed:false}},'#practice');await page.locator('input[name=choice][value=A]').check();await page.locator('[data-action=submit-answer]').click();assert.equal((await read())['yanxi-quiz-progress-v1'].records[objective.id].correct,1);assert.deepEqual((await read())['yanxi-reading-v1'].recalls,{});
 // A fresh service-worker cache supports cold start, self-grade and the due queue entirely offline.
 const offlineContext=await browser.newContext({viewport:{width:390,height:900},locale:'zh-CN'}),boot=await offlineContext.newPage();offlineContext.setDefaultNavigationTimeout(90000);boot.on('pageerror',e=>errors.push(e.message));
 await boot.goto(base+'/latest.html');await boot.locator('.desk-daily').waitFor();
 await boot.waitForFunction(async()=>{const registration=await navigator.serviceWorker.getRegistration('/');if(!registration?.active)return false;return new Promise(resolve=>{const c=new MessageChannel(),t=setTimeout(()=>resolve(false),1000);c.port1.onmessage=e=>{clearTimeout(t);resolve(e.data?.ready&&e.data.version==='yanxi-offline-v23');};registration.active.postMessage({type:'YANXI_OFFLINE_STATUS'},[c.port2]);});},null,{timeout:60000});
 await boot.evaluate(({a,now})=>{localStorage.setItem('yanxi-session-v1',JSON.stringify({ids:[a],index:0,entries:{[a]:{selected:[],draft:'断网草稿',revealed:true,answered:false,correct:false}},startedAt:now,completed:false}));localStorage.setItem('yanxi-settings-v1',JSON.stringify({paperScope:'all',goal:10}));},{a,now});
 await boot.waitForFunction(()=>navigator.serviceWorker.controller?.state==='activated');await offlineContext.setOffline(true);const cold=await offlineContext.newPage();cold.on('pageerror',e=>errors.push(e.message));await cold.clock.install({time:now});await cold.goto(base+'/latest.html#practice');await cold.locator('[data-action=grade-free][data-mastered=false]').click();
 const offlineReading=await cold.evaluate(()=>JSON.parse(localStorage.getItem('yanxi-reading-v1')));assert.equal(offlineReading.recalls[a].result,'missing');assert.equal(offlineReading.recalls[a].due-offlineReading.recalls[a].updated,1800000);assert.match(await cold.locator('.practice-recall-note').innerText(),/已同步到回忆排程/);
 await cold.clock.fastForward(31*60000);await cold.evaluate(()=>location.hash='#overview');await cold.locator('.desk-daily [data-action=recall-due]').waitFor();assert.equal(await cold.locator('.desk-daily .btn').innerText(),'今日复习 1 题');await cold.locator('.desk-daily .btn').click();await cold.locator('.reader-card').waitFor();assert.deepEqual(await cold.evaluate(()=>JSON.parse(localStorage.getItem('yanxi-reading-v1')).ids),[a]);await offlineContext.close();
 assert.deepEqual(errors,[]);
 const report={passed:true,base,scopeCounts:Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,v.length])),mixedReviewExplained:true,emptyStateResumeAndUnseen:true,practiceSharedRecallSchedule:true,progressHistoryAndDraftsRetained:true,duplicateGradePrevented:true,quotaFailureRollsBackAllRecords:true,backupV1AndOlderBackupRestore:true,objectiveGradingUnchanged:true,offlineSelfGradeAndDueQueue:true,widths:[390,768,1024],errors};fs.writeFileSync(path.join(out,process.env.PHASE1_QA_BASE?'live-report.json':'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
