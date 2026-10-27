(function(root,factory){'use strict';var api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;root.TextbookImages=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  var BOOKS=['school','physiology','training'],indexRequest=null,requests={},loaded=Object.create(null);
  function url(file){return new URL(file,new URL('./',root.location&&root.location.href||'https://local.invalid/')).href;}
  function cacheName(book){if(!BOOKS.includes(book))throw Error('未知教材');return 'yanxi-textbook-images-v1-'+book;}
  function validateManifest(raw){
    if(!raw||raw.version!==2||!raw.books||!raw.packs||!raw.images)throw Error('原图目录格式不正确');
    BOOKS.forEach(function(book){var b=raw.books[book];if(!b||!Array.isArray(b.files)||!b.files.length)throw Error('教材目录不完整');b.files.forEach(function(file){var p=raw.packs[file];if(!/^textbook-images\/(school|physiology|training)\/[a-z0-9-]+\.json$/.test(file)||!p||p.book!==book||!/^[a-f0-9]{64}$/.test(p.sha256)||!Number.isInteger(p.bytes)||p.bytes<=0||!Number.isInteger(p.images)||p.images<=0)throw Error('原图分包格式不正确');});});
    Object.keys(raw.images).forEach(function(key){if(!/^[a-f0-9]{24}$/.test(key)||!raw.packs[raw.images[key]])throw Error('原图索引不完整');});return raw;
  }
  async function parsePack(file,text,manifest){
    var meta=manifest.packs[file];if(!meta)throw Error('未知原图分包');
    if(root.crypto&&root.crypto.subtle){var digest=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)),hash=Array.from(new Uint8Array(digest)).map(function(n){return n.toString(16).padStart(2,'0');}).join('');if(hash!==meta.sha256)throw Error('原图分包校验失败');}
    var pack=JSON.parse(text),keys=Object.keys(pack.images||{});
    if(pack.version!==1||pack.book!==meta.book||pack.chapter!==meta.chapter||keys.length!==meta.images||keys.some(function(key){return manifest.images[key]!==file||typeof pack.images[key]!=='string'||!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(pack.images[key]);}))throw Error('原图分包内容不正确');return pack;
  }
  function manifest(){
    if(!indexRequest)indexRequest=fetch(url('textbook-images.json?v=3')).then(function(response){if(!response.ok)throw Error('原图目录暂未载入');return response.json();}).then(validateManifest).catch(function(error){indexRequest=null;throw error;});return indexRequest;
  }
  async function loadFile(file,index){
    var cache=root.caches?await root.caches.open(cacheName(index.packs[file].book)):null,response=cache&&await cache.match(url(file)),pack;
    if(response){try{pack=await parsePack(file,await response.text(),index);}catch(_){await cache.delete(url(file));}}
    if(!pack){response=await fetch(url(file));if(!response.ok)throw Error('原图暂未载入');var text=await response.text();pack=await parsePack(file,text,index);if(cache){try{await cache.put(url(file),new Response(text,{headers:{'Content-Type':'application/json;charset=utf-8'}}));}catch(_){/* Online viewing remains available when cache storage is full. */}}}
    Object.keys(pack.images).forEach(function(key){loaded[key]=pack.images[key];});if(root.YanxiOffline)root.YanxiOffline.check();return pack;
  }
  async function load(keys){
    var index=await manifest(),files=Array.from(new Set(keys.map(function(key){var file=index.images[key];if(!file)throw Error('该原图不在目录中');return file;})));
    var results=await Promise.allSettled(files.map(function(file){if(!requests[file])requests[file]=loadFile(file,index).catch(function(error){delete requests[file];throw error;});return requests[file];}));
    var error=results.find(function(r){return r.status==='rejected';});if(error)throw error.reason;
  }
  return {BOOKS:BOOKS,url:url,cacheName:cacheName,validateManifest:validateManifest,parsePack:parsePack,manifest:manifest,load:load,get:function(key){return loaded[key];}};
});
