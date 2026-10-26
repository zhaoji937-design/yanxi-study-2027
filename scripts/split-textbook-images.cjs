'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),manifestFile=path.join(dist,'textbook-images.json'),old=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
const originalBytes=old.version===1?fs.statSync(manifestFile).size:old.originalBytes;
let images={};if(old.version===1)images=old.images;else for(const file of Object.keys(old.packs))Object.assign(images,JSON.parse(fs.readFileSync(path.join(dist,file),'utf8')).images);
const context=vm.createContext({URL});for(const[,src]of fs.readFileSync(path.join(dist,'index.html'),'utf8').matchAll(/<script[^>]+src="([^"]+)"/g)){const file=src.split('?')[0];if(file==='engine.js'||file.startsWith('bank-'))vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),context);}
const questions=context.QuizEngine.validateBank(context.SPORTS_BANK).questions,groups=new Map(),assigned=new Set();
for(const q of questions)for(const image of q.textbookRevision?.images||[]){if(assigned.has(image.key))continue;assert.ok(images[image.key]);assigned.add(image.key);const id=q.bookKey+'/'+q.chapterId;if(!groups.has(id))groups.set(id,{book:q.bookKey,chapter:q.chapterId,images:{}});groups.get(id).images[image.key]=images[image.key];}
assert.equal(assigned.size,Object.keys(images).length,'All existing definition images must be retained');
const books={school:{title:'学校体育学',files:[],images:0,bytes:0},physiology:{title:'运动生理学',files:[],images:0,bytes:0},training:{title:'运动训练学',files:[],images:0,bytes:0}},manifest={version:2,originalBytes,books,packs:{},images:{}},files={};
for(const[,group]of [...groups].sort(([a],[b])=>a.localeCompare(b))){
 const ordered=Object.fromEntries(Object.entries(group.images).sort(([a],[b])=>a.localeCompare(b))),data=JSON.stringify({version:1,book:group.book,chapter:group.chapter,images:ordered})+'\n',sha256=crypto.createHash('sha256').update(data).digest('hex'),file='textbook-images/'+group.book+'/'+group.chapter+'-'+sha256.slice(0,12)+'.json',bytes=Buffer.byteLength(data);
 manifest.packs[file]={book:group.book,chapter:group.chapter,images:Object.keys(ordered).length,bytes,sha256};manifest.books[group.book].files.push(file);manifest.books[group.book].images+=Object.keys(ordered).length;manifest.books[group.book].bytes+=bytes;Object.keys(ordered).forEach(key=>manifest.images[key]=file);files[file]=data;
}
const serialized=JSON.stringify(manifest)+'\n';files['textbook-images.json']=serialized;
const report={originalBytes,manifestBytes:Buffer.byteLength(serialized),totalBytes:Buffer.byteLength(serialized)+Object.values(manifest.packs).reduce((sum,p)=>sum+p.bytes,0),books:manifest.books,files:manifest.packs};
const reportFile=path.join(root,'content/textbook-image-sizes.json'),reportText=JSON.stringify(report,null,2)+'\n';
if(process.argv.includes('--check')){for(const[file,data]of Object.entries(files))assert.equal(fs.readFileSync(path.join(dist,file),'utf8'),data,file+' differs');assert.equal(fs.readFileSync(reportFile,'utf8'),reportText);}else{for(const[file,data]of Object.entries(files)){fs.mkdirSync(path.dirname(path.join(dist,file)),{recursive:true});fs.writeFileSync(path.join(dist,file),data);}fs.writeFileSync(reportFile,reportText);}
console.log(JSON.stringify({passed:true,originalBytes,manifestBytes:report.manifestBytes,totalBytes:report.totalBytes,chapters:Object.keys(manifest.packs).length,images:assigned.size,books:Object.fromEntries(Object.entries(books).map(([id,b])=>[id,{images:b.images,bytes:b.bytes,files:b.files.length}]))}));
