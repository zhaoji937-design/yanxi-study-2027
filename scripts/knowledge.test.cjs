'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../dist/knowledge.js');const c=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../dist/knowledge-data.js'),'utf8'),c);const data=JSON.parse(JSON.stringify(c.KNOWLEDGE_DATA)),db=K.index(data);
test('two verified sections retain every major and lower numbered branch',()=>{
 assert.deepEqual(data.sections,['tr4s2','tr4s3']);assert.equal(data.nodes.length,148);
 const counts={'psy-factors':8,'psy-goals':6,'psy-imagery-stages':3,'psy-imagery-conditions':3,'psy-imagery-evaluation':7,'psy-attention-direction':10,'psy-attention-concentration':5,'psy-will-training':7,'psy-requirements':4,'know-acquisition':4,'know-application':3,'know-four-levels':4};
 for(const [id,count]of Object.entries(counts))assert.equal(db.children.get(id).length,count,id);
 assert.equal(K.sectionOf(db,'psy-attention-dir-task'),'tr4s2');assert.equal(K.sectionOf(db,'know-tacit'),'tr4s3');
 assert.match(db.nodes.get('know-explicit-tacit').title,/隐形/);
 for(const n of data.nodes.filter(n=>n.definition))assert.ok(n.original&&n.printedPages.length&&n.definition.length>10);
});
test('search keeps the full ancestor path and respects independent classifications',()=>{
 const result=K.search(db,'tr4s3','程序性',false);assert.ok(result.hits.has('know-procedural'));
 for(const id of ['training-book','training-ch4','tr4s3','know-overview','know-classification','know-procedural-declarative'])assert.ok(result.allowed.has(id),id);
 assert.ok(!result.allowed.has('psy-goals'));
 assert.equal(db.nodes.get('know-procedural').parentId,'know-procedural-declarative');assert.equal(db.nodes.get('know-tacit').parentId,'know-explicit-tacit');
 const core=K.search(db,'tr4s2','',true);assert.ok(core.hits.size>0);for(const id of core.hits)assert.ok(db.nodes.get(id).core);
 assert.equal(K.search(db,'tr4s2','no-such-knowledge',false).hits.size,0);
});
test('question mapping invokes multiple exact nodes and supports reverse lookup',()=>{
 const q=db.questions.get('know-q-classification-cross');assert.ok(q.nodeIds.includes('know-procedural'));assert.ok(q.nodeIds.includes('know-tacit'));
 assert.ok(K.relevant(db,q.nodeIds,'know-classification'));assert.ok(!K.relevant(db,q.nodeIds,'psy-goals'));
 assert.deepEqual(db.links.get('sp4-training-075'),['psy-goals','psy-imagery','psy-relaxation','psy-attention']);
 assert.equal(data.questions.length,32);assert.equal(data.comparisons.length,13);assert.equal(data.bankLinks.length,12);
 for(const q of data.questions){assert.ok(q.answer.length);assert.ok(q.printedPages.every(p=>p>=141&&p<=164));assert.doesNotMatch(q.answer.join(''),/教材指出|书中指出/);}
});
test('expanded map lays out all nodes without overlap or clipping negative coordinates',()=>{
 for(const section of data.sections){const ids=K.descendants(db,section),plan=K.layout(db,section,new Set(ids));assert.equal(plan.nodes.length,ids.length);assert.equal(plan.edges.length,ids.length-1);
 const columns=new Map();for(const n of plan.nodes){assert.ok(n.x>=0&&n.y>=0&&n.x+n.width<=plan.width&&n.y+n.height<=plan.height);if(!columns.has(n.x))columns.set(n.x,[]);columns.get(n.x).push(n);}
 for(const col of columns.values()){col.sort((a,b)=>a.y-b.y);for(let i=1;i<col.length;i++)assert.ok(col[i-1].y+col[i-1].height<=col[i].y,'overlap');}
 }
});
test('rendered labels escape HTML and reference pages are printed book pages',()=>{
 assert.equal(K.esc('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');
 assert.deepEqual(db.nodes.get('psy-definition').printedPages,[141]);assert.deepEqual(db.nodes.get('know-meaning').printedPages,[154]);
 const reviews=data.questions.filter(q=>q.sourceType==='textbook-review');assert.equal(reviews.length,3);for(const q of reviews)assert.deepEqual(q.promptPages,[165]);
});
