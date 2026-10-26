'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const T=require('../dist/study-tools.js'),P=require('../dist/textbook-images.js'),dist=path.resolve(__dirname,'../dist'),manifest=P.validateManifest(JSON.parse(fs.readFileSync(path.join(dist,'textbook-images.json'),'utf8')));
test('legacy list links resolve to one library and preserve full chapter/query context',()=>{
 const cases=[['#bank?status=seen','bank','list'],['#materials?book=school&search=训练%26恢复','bank','answers'],['#professional?book=training&chapter=training-05&section=training-05-s02&type=short','bank','chapters']];
 for(const[old,route,view]of cases){const result=T.canonicalHash(old),[name,query]=result.slice(1).split('?'),p=new URLSearchParams(query);assert.equal(name,route);assert.equal(p.get('view')||'list',view);for(const[k,v]of new URLSearchParams(old.split('?')[1]))assert.equal(p.get(k),v);assert.equal(T.canonicalHash(result),result);}
 assert.match(T.canonicalHash('#mistakes?book=training'),/^#revision\?/);assert.equal(new URLSearchParams(T.canonicalHash('#favorites').split('?')[1]).get('tab'),'favorites');assert.equal(T.canonicalHash('#review?id=a'),'#review?id=a');
});
test('old goal values are ignored while backup timestamps survive settings restore',()=>{
 const then=Date.now()-9*86400000,raw={goal:100,paperScope:'all',lastExportedAt:then,backupStartedAt:then-100,backupReminderDismissedAt:then+100};
 const clean=T.cleanSettings(raw);assert.equal(clean.goal,undefined);for(const key of ['lastExportedAt','backupStartedAt','backupReminderDismissedAt'])assert.equal(clean[key],raw[key]);assert.equal(clean.paperScope,'all');assert.equal(T.cleanSettings({goal:40},new Date(then).toISOString()).lastExportedAt,then);assert.equal(T.cleanSettings({lastExportedAt:'<img>'}).lastExportedAt,0);
});
test('backup reminders require records and seven elapsed days, dismissal postpones a new reminder',()=>{
 const now=1800000000000,settings={lastExportedAt:now-8*86400000,backupStartedAt:0,backupReminderDismissedAt:0};assert.equal(T.backupDue(settings,false,now),false);assert.equal(T.backupDue(settings,true,now),true);assert.equal(T.backupDue({...settings,lastExportedAt:now-6*86400000},true,now),false);assert.equal(T.backupDue({...settings,backupReminderDismissedAt:now},true,now),false);assert.equal(T.backupDue({...settings,backupReminderDismissedAt:now-7*86400000},true,now),true);assert.equal(T.backupDue({backupStartedAt:now},true,now),false);
});
test('all chapter packs retain verified image bytes and reject corrupted responses',async()=>{
 let total=0;for(const[file,meta]of Object.entries(manifest.packs)){const text=fs.readFileSync(path.join(dist,file),'utf8'),pack=await P.parsePack(file,text,manifest);assert.equal(Buffer.byteLength(text),meta.bytes);total+=Object.keys(pack.images).length;}
 assert.equal(total,353);const file=Object.keys(manifest.packs)[0],text=fs.readFileSync(path.join(dist,file),'utf8');await assert.rejects(P.parsePack(file,text+' ',manifest),/校验失败/);assert.throws(()=>P.validateManifest({...manifest,images:{bad:'https://example.com'}}));
});
function workerContext(){const listeners={},context=vm.createContext({URL,Request,Response,TextEncoder,Uint8Array,TextbookImages:P,console,setInterval,clearInterval,self:{location:{href:'https://check.invalid/sw.js'},addEventListener(name,fn){listeners[name]=fn;}},importScripts(){}});vm.runInContext(fs.readFileSync(path.join(dist,'sw.js'),'utf8'),context);return context;}
test('an incompletely updated HTML cannot replace the working offline entry',()=>{
 const context=workerContext(),compatible=vm.runInContext('compatibleHTML',context),html=fs.readFileSync(path.join(dist,'index.html'),'utf8');assert.equal(compatible(html),true);assert.equal(compatible(html.replace('app.js?v=17','app.js?v=future')),false);assert.equal(compatible('<h1>Network error</h1>'),false);const shell=vm.runInContext('SHELL',context);assert.ok(shell.includes('https://check.invalid/textbook-images.json?v=2'));assert.ok(!shell.some(url=>url.includes('/textbook-images/')));
});
test('old complete image cache reconstructs an identical hashed chapter pack',async()=>{
 const context=workerContext(),file=Object.keys(manifest.packs)[0],raw=JSON.parse(fs.readFileSync(path.join(dist,file),'utf8'));context.fixture=raw.images;vm.runInContext('legacyPromise=Promise.resolve(fixture)',context);const response=await vm.runInContext('legacyPack',context)(file,manifest);assert.equal(await response.text(),fs.readFileSync(path.join(dist,file),'utf8'));
});
