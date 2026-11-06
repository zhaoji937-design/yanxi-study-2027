'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),T=require('../dist/study-tools.js');
const fixture={books:['school','physiology','training'].map(key=>({key,id:key+'-book'})),nodes:[]};
for(const key of ['school','physiology','training'])fixture.nodes.push(
 {id:key+'-book',kind:'book',parentId:null,original:true},
 {id:key+'-chapter',kind:'chapter',parentId:key+'-book',original:true},
 {id:key+'-section',kind:'section',parentId:key+'-chapter',original:true},
 {id:key+'-point',kind:'heading',parentId:key+'-section',original:true},
 {id:key+'-fragment',kind:'heading',parentId:key+'-section',original:true,readingRole:'source-fragment'},
 {id:key+'-fragment-child',kind:'point',parentId:key+'-fragment',original:true},
 {id:key+'-summary',kind:'point',parentId:key+'-section',original:false}
);
const place=(node,view='outline',updated=Date.now()-1000)=>({node,view,updated});

test('old backups without textbook places remain valid and produce no invented position',()=>{
 for(const value of [undefined,null,[],true,5,'school'])assert.deepEqual(T.cleanTextbookPlaces(value,fixture),{});
 assert.deepEqual(T.cleanTextbookPlaces({},fixture),{});
 assert.deepEqual(T.cleanTextbookPlaces({school:place('school-section')},null),{});
 assert.deepEqual(T.cleanTextbookPlaces({school:place('school-section')},{nodes:[]}),{});
});

test('three textbook positions retain exact navigation data while dropping extra fields',()=>{
 const raw={school:{...place('school-section'),scroll:999,unsafe:'<img>'},physiology:place('physiology-point','map'),training:place('training-point'),english:place('school-point')},before=JSON.stringify(raw);
 const clean=T.cleanTextbookPlaces(raw,fixture);
 assert.deepEqual(Object.keys(clean),['school','physiology','training']);
 for(const key of Object.keys(clean)){assert.deepEqual(Object.keys(clean[key]),['node','view','updated']);assert.equal(clean[key].node,raw[key].node);assert.equal(clean[key].view,raw[key].view);assert.equal(clean[key].updated,raw[key].updated);assert.notEqual(clean[key],raw[key]);}
 assert.equal(JSON.stringify(raw),before);
});

test('prototype-shaped keys and inherited positions cannot inject or restore entries',()=>{
 const stamp=Date.now()-1000,raw=JSON.parse('{"__proto__":{"polluted":true},"constructor":{"node":"school-point","view":"outline","updated":1},"prototype":{}}');
 raw.school=place('school-point','outline',stamp);raw.physiology=Object.create(place('physiology-point'));
 const inherited=Object.create({school:place('school-point')});
 assert.deepEqual(T.cleanTextbookPlaces(raw,fixture),{school:place('school-point','outline',stamp)});
 assert.deepEqual(T.cleanTextbookPlaces(inherited,fixture),{});
 assert.equal(Object.getPrototypeOf(T.cleanTextbookPlaces(raw,fixture)),Object.prototype);
 assert.equal({}.polluted,undefined);
});

test('positions must belong to the named book and represent readable original material',()=>{
 for(const node of ['training-point','school-book','school-chapter','school-summary','school-fragment','school-fragment-child','missing'])assert.deepEqual(T.cleanTextbookPlaces({school:place(node)},fixture),{},node);
 const broken={books:fixture.books,nodes:fixture.nodes.concat([{id:'school-orphan',kind:'point',original:true,parentId:'absent'},{id:'school-cycle-a',kind:'point',original:true,parentId:'school-cycle-b'},{id:'school-cycle-b',kind:'heading',original:true,parentId:'school-cycle-a'}])};
 for(const node of ['school-orphan','school-cycle-a'])assert.deepEqual(T.cleanTextbookPlaces({school:place(node)},broken),{});
});

test('malformed fields and unreasonable future timestamps are discarded independently',()=>{
 const bad=[{node:'x'.repeat(101),view:'outline',updated:1},place('<img>'),place('school-point','questions'),place('school-point','map',NaN),place('school-point','map',Infinity),place('school-point','map',0),place('school-point','map',-1),place('school-point','map','1'),place('school-point','map',Date.now()+2*86400000),{node:'school-point',view:'outline'},['school-point','outline',1],null];
 for(const value of bad){const good=place('training-section');assert.deepEqual(T.cleanTextbookPlaces({school:value,training:good},fixture),{training:good});}
 const smallClockSkew=place('school-point','map',Date.now()+3600000);assert.deepEqual(T.cleanTextbookPlaces({school:smallClockSkew},fixture),{school:smallClockSkew});
});

test('real textbook sections and pilot knowledge points survive a backup-style JSON round trip',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../dist/knowledge-data.js'),'utf8'),context);const data=context.KNOWLEDGE_DATA;
 const school=data.nodes.find(node=>node.kind==='section'&&node.id.startsWith('school-')).id;
 const raw={school:place(school),physiology:place('kb-physiology-01-s01-source008','map'),training:place('know-meaning')};
 assert.deepEqual(T.cleanTextbookPlaces(JSON.parse(JSON.stringify(raw)),data),raw);
 assert.deepEqual(T.cleanTextbookPlaces({physiology:place('kb-physiology-01-s02-source006')},data),{});
});
