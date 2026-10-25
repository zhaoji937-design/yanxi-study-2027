'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist/spelling'),C=require(path.join(root,'core.js')),data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8')),db=C.index(data);
assert.equal(db.total,3660);assert.equal(data.meta.wordCount,db.total);
const legacy=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/word-legacy-list.json'),'utf8'));
for(const id of legacy)assert.ok(db.words.has(id),'Original core word missing: '+id);
for(const w of data.words){assert.match(w.word,/^[a-z]+(?:[-' ][a-z]+)*$/);assert.ok(w.meaning&&w.pos&&w.phonetic,w.id);assert.ok(w.tags.includes('all'));assert.ok(w.accepted.includes(w.word));assert.ok(w.accepted.every(a=>C.checkAnswer(w,a)));for(const key of ['shape','sound'])assert.ok(w[key].every(id=>db.words.has(id)&&id!==w.id&&!w.accepted.includes(id)),w.id+' distractors');}
for(const c of data.categories)assert.equal(db.categories.get(c.id).count,c.count,c.id+' count');
for(const g of data.groups){assert.ok(g.words.length>=2);assert.ok(g.words.every(id=>db.words.has(id)));assert.ok(g.contrast);}
for(const [good,bad]of [['generalize','generally'],['generalization','generalize'],['advice','advise'],['affect','effect']])assert.equal(C.checkAnswer(db.words.get(good),bad),false);
for(const file of ['app.js','core.js','sw.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.equal(fs.readFileSync(path.join(root,'latest.html'),'utf8'),html);
const worker=vm.createContext({URL,self:{location:{href:'https://check.invalid/spelling/sw.js'},addEventListener(){}}});vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),worker);const shell=vm.runInContext('SHELL',worker);
for(const url of shell){const u=new URL(url);assert.equal(u.origin,'https://check.invalid');assert.ok(u.pathname.startsWith('/spelling/'));const file=u.pathname==='/spelling/'?'index.html':u.pathname.slice(10);assert.ok(fs.statSync(path.join(root,file)).isFile(),file);}
for(const [,value]of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(value.startsWith('#'))continue;const u=new URL(value,'https://check.invalid/spelling/');assert.ok(shell.includes(u.href),value+' not cached');}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');
assert.ok(vm.runInContext('CACHE',worker).startsWith('yanxi-spelling-'));
for(const file of ['ECDICT.txt','NETEM.txt','cmudict.txt'])assert.ok(fs.readFileSync(path.join(root,'licenses',file)).equals(fs.readFileSync(path.join(root,'../words/licenses',file))),'license changed: '+file);
require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,'build-spelling.cjs'),'--check'],{stdio:'inherit'});
console.log(JSON.stringify({result:'passed',spellingWords:db.total,categories:db.categories.size,offlineResources:shell.length}));
