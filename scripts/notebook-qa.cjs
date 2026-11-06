'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root=path.resolve(__dirname,'../dist'),out=path.resolve(__dirname,'../qa-output/notebook');let browser;
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true});const context=await browser.newContext({viewport:{width:1024,height:1100},locale:'zh-CN',hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));context.setDefaultTimeout(20000);
 const go=async(hash,selector)=>{await page.goto(base+'/latest.html'+hash);await page.locator(selector).first().waitFor();};
 const fit=async label=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' horizontal overflow');
 await go('#overview','.notebook-home');
 await page.waitForFunction(()=>document.querySelector('#offline-summary')?.textContent.startsWith('题目已保存'));
 assert.equal(await page.locator('.subject-card').count(),3);assert.equal(await page.locator('.cozy-book-cover,.desk-mascot').count(),0);
 const q=await page.evaluate(()=>{const q=QuizEngine.validateBank(SPORTS_BANK).questions.find(q=>q.examType==='short');localStorage.setItem('yanxi-settings-v1',JSON.stringify({paperScope:'all'}));localStorage.setItem('yanxi-reading-v1',JSON.stringify({ids:[q.id],index:0,origin:'bank',drafts:{[q.id]:'保留自己的草稿'}}));return q.id;});
 for(const width of [390,768,1024]){
  await page.setViewportSize({width,height:1100});await go('#overview','.notebook-home');await fit('home '+width);
  const layouts=await page.locator('.subject-card').evaluateAll(elements=>elements.map(el=>({display:getComputedStyle(el).display,height:el.getBoundingClientRect().height,radius:getComputedStyle(el).borderRadius})));
  assert.ok(layouts.every(row=>row.display==='grid'&&row.height>=80&&row.radius==='0px'));await page.screenshot({path:path.join(out,'home-'+width+'.png'),fullPage:true});
  await go('#knowledge?book=physiology&node=kb-physiology-01-s01-source008&view=outline','.kt-continuous');await fit('reading '+width);
  const textStyle=await page.locator('.kt-body p').first().evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),color:getComputedStyle(el).color}));assert.ok(textStyle.size>=16);assert.equal(textStyle.color,'rgb(37, 48, 68)');
  const emphasis=page.locator('[data-reading-node="kb-physiology-01-s01-source008"] .kt-body strong').first();await emphasis.waitFor();assert.equal(await emphasis.evaluate(el=>getComputedStyle(el).color),'rgb(63, 87, 151)');
  await page.screenshot({path:path.join(out,'reading-'+width+'.png')});
  await go('#overview','.desk-reading a');await fit('resume '+width);await page.screenshot({path:path.join(out,'resume-'+width+'.png'),fullPage:true});
  await go('#bank?view=list&paperScope=all','.q-row');await fit('bank '+width);await page.screenshot({path:path.join(out,'bank-'+width+'.png')});
  await go('#review?id='+encodeURIComponent(q),'.reader-card');if(!await page.locator('.reading-answer').count())await page.locator('[data-action=reader-toggle-answer]').click();await page.locator('.reading-answer').waitFor();await fit('reader '+width);await page.screenshot({path:path.join(out,'reader-'+width+'.png')});
  assert.ok(await page.locator('.reader-controls').isVisible());
  await go('#settings','#offline-panel');await fit('settings '+width);await page.screenshot({path:path.join(out,'settings-'+width+'.png')});
  await go('#exam?mode=mixed','#mock-exam');await fit('exam '+width);await page.screenshot({path:path.join(out,'exam-'+width+'.png')});
 }
 assert.deepEqual(errors,[]);const report={passed:true,widths:[390,768,1024],threeTextbookRows:true,decorativeCoversRemoved:true,readingFontAtLeast16:true,blueKeywordEmphasis:true,homeResume:true,readerDock:true,pages:['home','reading','resume','bank','reader','settings','exam'],errors};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
