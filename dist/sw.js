'use strict';
importScripts('textbook-images.js?v=1');
const CACHE='yanxi-offline-v22',ROOT=new URL('./',self.location.href),INDEX=new URL('textbook-images.json?v=2',ROOT).href;
const SHELL=[
 './','latest.html','textbook-images.json?v=2','textbook-images.js?v=1','bank-sports-revised.js?v=2','style.css','simple.css?v=5','icon.svg',
 'study.css?v=3','study-tools.js?v=4','engine.js?v=8','bank-sports-legacy.js','bank-sports.js','bank-sports-expanded.js','bank-sports-systematic.js?v=4.1',
 'bank-study.js?v=1','paper-data.js?v=1','exam-engine.js?v=1','mock-exam.js?v=1','mock-exam.css?v=1','cozy.css?v=7','app.js?v=17','ink.css?v=2','ink.js?v=3','knowledge.css?v=3','knowledge-data.js?v=3','knowledge.js?v=7','offline.js?v=6','manifest.json','touch-icon.png','icon-192.png','icon-512.png'
].map(path=>new URL(path,ROOT).href);
let indexPromise=null,legacyPromise=null;const bookJobs=new Map();
async function pool(items,task){let cursor=0,failure=null;await Promise.all(Array.from({length:Math.min(3,items.length)},async()=>{while(cursor<items.length&&!failure){const item=items[cursor++];try{await task(item);}catch(error){failure=error;}}}));if(failure)throw failure;}
async function index(){if(!indexPromise)indexPromise=(async()=>{const cache=await caches.open(CACHE),response=await cache.match(INDEX);if(!response)throw Error('Missing image directory');return TextbookImages.validateManifest(await response.json());})().catch(error=>{indexPromise=null;throw error;});return indexPromise;}
async function legacy(){if(!legacyPromise)legacyPromise=(async()=>{for(const name of await caches.keys()){if(!name.startsWith('yanxi-offline-')||name===CACHE)continue;const cache=await caches.open(name),response=await cache.match(new URL('textbook-images.json',ROOT).href);if(response){try{const raw=await response.json();if(raw.version===1&&raw.images)return raw.images;}catch(_){}}}return null;})();return legacyPromise;}
async function legacyPack(file,manifest){const images=await legacy();if(!images)return null;const meta=manifest.packs[file],selected={};Object.keys(manifest.images).filter(key=>manifest.images[key]===file).sort().forEach(key=>{if(images[key])selected[key]=images[key];});const text=JSON.stringify({version:1,book:meta.book,chapter:meta.chapter,images:selected})+'\n';await TextbookImages.parsePack(file,text,manifest);return new Response(text,{headers:{'Content-Type':'application/json;charset=utf-8'}});}
async function pack(file,manifest){
 const cache=await caches.open(TextbookImages.cacheName(manifest.packs[file].book)),url=new URL(file,ROOT).href,cached=await cache.match(url);
 if(cached){try{await TextbookImages.parsePack(file,await cached.clone().text(),manifest);return cached;}catch(_){await cache.delete(url);}}
 let response;try{response=await fetch(new Request(url,{cache:'no-cache',redirect:'error'}));if(!response.ok)throw Error('Image unavailable');await TextbookImages.parsePack(file,await response.clone().text(),manifest);}catch(error){response=await legacyPack(file,manifest);if(!response)throw error;}
 try{await cache.put(url,response.clone());}catch(_){}return response;
}
async function bookStatus(manifest){const books={};for(const book of TextbookImages.BOOKS){const definition=manifest.books[book],cache=await caches.open(TextbookImages.cacheName(book));let saved=0,savedImages=0;for(const file of definition.files)if(await cache.match(new URL(file,ROOT).href)){saved++;savedImages+=manifest.packs[file].images;}books[book]={ready:saved===definition.files.length,saved,total:definition.files.length,savedImages,totalImages:definition.images};}return books;}
async function status(){const cache=await caches.open(CACHE),matches=await Promise.all(SHELL.map(url=>cache.match(url)));return {ready:matches.every(Boolean),version:CACHE,books:await bookStatus(await index())};}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);try{await pool(SHELL,async url=>{const response=await fetch(new Request(url,{cache:'reload',redirect:'error',credentials:'same-origin'}));if(!response.ok||url===ROOT.href&&!(await response.clone().text()).includes('id="app"'))throw Error('Offline resource unavailable');await cache.put(url,response);});await self.skipWaiting();}catch(error){await caches.delete(CACHE);throw error;}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 let migrated=true;try{const manifest=await index();if(await legacy())await pool(Object.keys(manifest.packs),async file=>{const response=await legacyPack(file,manifest);await(await caches.open(TextbookImages.cacheName(manifest.packs[file].book))).put(new URL(file,ROOT).href,response);});}catch(_){migrated=false;}
 if(migrated)await Promise.all((await caches.keys()).filter(name=>name.startsWith('yanxi-offline-')&&name!==CACHE).map(name=>caches.delete(name)));
 await self.clients.claim();
})()));
function compatibleHTML(text){return text.includes('id="app"')&&Array.from(text.matchAll(/(?:src|href)="([^"]+)"/g)).map(match=>match[1]).filter(path=>!path.startsWith('#')).every(path=>SHELL.includes(new URL(path,ROOT).href));}
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==ROOT.origin)return;
 const home=event.request.mode==='navigate'&&[ROOT.pathname,ROOT.pathname+'index.html',ROOT.pathname+'latest.html'].includes(url.pathname),image=url.pathname.startsWith(ROOT.pathname+'textbook-images/');
 if(!home&&!image&&!SHELL.includes(url.href))return;
 event.respondWith((async()=>{
  if(image){const manifest=await index(),file=url.pathname.slice(ROOT.pathname.length);return manifest.packs[file]?pack(file,manifest):fetch(event.request);}
  const cache=await caches.open(CACHE),cached=await cache.match(home?ROOT.href:event.request);
  if(home){try{const response=await fetch(event.request);if(response.ok){const text=await response.clone().text();if(compatibleHTML(text))await cache.put(ROOT.href,response.clone());return response;}}catch(_){}if(cached)return cached;throw Error('App unavailable');}
  return cached||fetch(event.request);
 })());
});
self.addEventListener('message',event=>{
 const port=event.ports[0];if(!port)return;
 if(event.data?.type==='YANXI_OFFLINE_STATUS'){event.waitUntil(status().then(value=>port.postMessage(value)).catch(()=>port.postMessage({ready:false,version:CACHE,books:{}})));return;}
 if(event.data?.type!=='YANXI_SAVE_BOOK'||!TextbookImages.BOOKS.includes(event.data.book))return;
 const book=event.data.book;
 event.waitUntil((async()=>{try{const manifest=await index();if(!bookJobs.has(book)){const job=pool(manifest.books[book].files,file=>pack(file,manifest));bookJobs.set(book,job);job.finally(()=>bookJobs.delete(book)).catch(()=>{});}const tick=setInterval(()=>bookStatus(manifest).then(books=>port.postMessage({type:'progress',book,state:books[book]})).catch(()=>{}),500);try{await bookJobs.get(book);}finally{clearInterval(tick);}const value=await status();port.postMessage({type:'complete',ok:value.books[book].ready,...value});}catch(_){port.postMessage({type:'complete',ok:false,...await status()});}})());
});
