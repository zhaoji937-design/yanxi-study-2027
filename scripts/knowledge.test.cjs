'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../dist/knowledge.js');const c=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../dist/knowledge-data.js'),'utf8'),c);const data=JSON.parse(JSON.stringify(c.KNOWLEDGE_DATA)),db=K.index(data);
test('two verified sections retain every major and lower numbered branch',()=>{
 assert.equal(data.sections.length,134);assert.ok(data.sections.includes('tr4s2')&&data.sections.includes('tr4s3'));assert.equal(data.books.length,3);assert.equal(data.nodes.filter(n=>n.kind==='chapter').length,40);
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
 assert.deepEqual(db.links.get('sp4-training-075').slice(0,4),['psy-goals','psy-imagery','psy-relaxation','psy-attention']);
 assert.equal(data.questions.length,204);assert.equal(data.comparisons.length,55);assert.equal(data.bankLinks.length,610);
 for(const q of data.questions){assert.ok(q.answer.length);assert.ok(q.printedPages.every(p=>p>=1&&p<=360));assert.doesNotMatch(q.answer.join(''),/教材指出|书中指出/);}
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

test('full book graph is acyclic, every canonical question is attached and every section has study content',()=>{
 for(const n of data.nodes){const p=K.path(db,n.id);assert.equal(new Set(p.map(n=>n.id)).size,p.length);assert.equal(p[0].kind,'book');assert.ok(p.length<18);if(n.sourceQuestionId)assert.ok(data.bankLinks.some(l=>l.bankId===n.sourceQuestionId));}
 for(const section of data.sections){assert.ok(K.descendants(db,section).length>1,section);assert.ok(data.questions.some(q=>K.relevant(db,q.nodeIds,section)),section);}
 for(const b of data.books)assert.equal(K.descendants(db,b.id).length,b.nodeCount);
});

test('all original pilot anchors, paragraphs and definition text survive the expansion',()=>{
 for(const file of ['knowledge-psychology.json','knowledge-capacity.json']){const source=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../content',file),'utf8'));for(const n of source.nodes){const actual=db.nodes.get(n.id);assert.ok(actual,n.id);for(const field of ['title','body','definition','parentId'])assert.deepEqual(actual[field],n[field],n.id+' '+field);}for(const q of source.questions)assert.deepEqual(db.questions.get(q.id).answer,q.answer,q.id);}
});

test('physiology has actual reading evidence for every heading and all 56 section summaries',()=>{
 const pages=data.readingPages.physiology,manifest=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../dist/textbook-images.json'),'utf8'));
 assert.equal(Object.keys(pages).length,360);
 for(let page=1;page<=360;page++){assert.ok(manifest.images[pages[page].key],'printed '+page);assert.ok(pages[page].width>=1000);}
 const sections=data.sections.filter(id=>id.startsWith('physiology-'));assert.equal(sections.length,56);
 let points=0,headings=0;
 for(const id of sections){const study=db.nodes.get('kb-'+id+'-study');assert.equal(study.readingRole,'study-summary');const children=db.children.get(study.id);assert.equal(children.length,4,id);for(const child of children){const n=db.nodes.get(child);assert.ok(n.body.join('').length>=50,child+' must contain actual readable paragraphs');assert.equal(n.readingRole,'study-summary');points++;}
  for(const node of K.descendants(db,id).map(id=>db.nodes.get(id)).filter(n=>n.original)){for(const page of node.printedPages)assert.ok(pages[page],node.id+' has original-page evidence');if(!['section','chapter','book'].includes(node.kind))headings++;}
 }
 assert.equal(points,224);assert.equal(headings,1046);
});

test('physiology has substantive text and memory routes rather than title/page placeholders',()=>{
 for(const id of data.sections.filter(id=>id.startsWith('physiology-'))){
  const own=K.descendants(db,id).map(key=>db.nodes.get(key)).filter(n=>n.original&&n.readingRole!=='source-fragment');
  assert.ok(own.flatMap(n=>n.body).join('').length>=300,id+' needs actual chapter text');
  const guide=data.readingGuides[id];assert.ok(guide.memory.length>=40&&guide.pitfall.length>=20&&guide.recallOrder.length>=3,id+' memory must be concrete');
  for(const n of own)if(!(db.children.get(n.id)||[]).some(id=>{const child=db.nodes.get(id);return child.original&&child.readingRole!=='source-fragment';}))assert.ok(n.body.join('').length>=8,n.id+' visible leaf must have actual text');
  for(const n of own)assert.ok(!K.path(db,n.id).some(ancestor=>ancestor.readingRole==='source-fragment'),n.id+' actual knowledge must not be hidden below a source fragment');
 }
 assert.match(db.nodes.get('kb-physiology-01-s01-source009').body.join(''),/钾离子.*外流/);
 assert.match(db.nodes.get('kb-physiology-01-s01-source012').body.join(''),/钠离子.*内流/);
 assert.match(db.nodes.get('kb-physiology-01-s01-source012').body.join(''),/钾离子.*外流/);
 assert.equal(db.nodes.get('kb-physiology-01-s02-source007').parentId,'kb-physiology-01-s02-source005');
 for(const i of ['006','007','008'])assert.equal(db.nodes.get('kb-physiology-05-s01-source'+i).parentId,'kb-physiology-05-s01-source005');
 assert.equal(db.nodes.get('kb-physiology-04-s02-source036').parentId,'kb-physiology-04-s02-source033');
 assert.equal(db.nodes.get('kb-physiology-10-s06-source001').parentId,'kb-physiology-restored-core-training');
 for(const i of ['001','002','003'])assert.equal(db.nodes.get('kb-physiology-10-s03-source'+i).parentId,'kb-physiology-restored-anaerobic-basis');
 for(const i of ['004','005'])assert.equal(db.nodes.get('kb-physiology-10-s03-source'+i).parentId,'kb-physiology-restored-anaerobic-measurement');
});
