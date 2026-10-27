'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=name=>JSON.parse(fs.readFileSync(path.join(root,'content',name),'utf8'));
const K=require('../dist/knowledge.js');
const catalogContext=vm.createContext({SPORTS_BANK:[]});vm.runInContext(fs.readFileSync(path.join(root,'dist/bank-sports-systematic.js'),'utf8'),catalogContext);const catalog=JSON.parse(JSON.stringify(catalogContext.SPORTS_CATALOG));
const definitions={school:{title:'学校体育学（第三版）',shortTitle:'学校体育学',author:'潘绍伟、于可红 主编',edition:'2015年第三版',last:346,file:'原版  潘绍伟 学校体育学 第三版15年.pdf'},physiology:{title:'运动生理学（第三版）',shortTitle:'运动生理学',author:'邓树勋等 主编',edition:'2015年第三版',last:360,file:'原版 运动生理学-邓树勋（第三版）.pdf'},training:{title:'运动训练学（第二版）',shortTitle:'运动训练学',author:'田麦久 主编',edition:'2017年第二版（所用扫描本2019年重印）',last:316,file:'原版 运动训练学 (田麦久第2版) 教材电子版.pdf'}};
const psy=read('knowledge-psychology.json'),know=read('knowledge-capacity.json');
const pilotNodes=[{id:'tr4s2',parentId:'training-ch4',kind:'section',original:true,title:psy.section.title,printedPages:psy.section.printedPages,body:['本节依次讨论运动员心理能力的定义及其构成、常用的心理训练方法、心理训练的基本要求。先分清分类依据，再把不同心理技能与训练、比赛情境联系起来。'],keywords:['定义及其构成','心理训练方法','基本要求']},{id:'tr4s3',parentId:'training-ch4',kind:'section',original:true,title:know.section.title,printedPages:know.section.printedPages,body:['本节按“是什么与怎样构成—怎样获得和提高—怎样运用”展开。学习时要分别辨清知识的分类标准，并理解实践经验、理论表达与再次运用之间的联系。'],keywords:['构成','获得和提高','运用']}].concat(psy.nodes,know.nodes);
const aliases={'training-04':'training-ch4','training-04-s02':'tr4s2','training-04-s03':'tr4s3'},alias=id=>aliases[id]||id;
const nodes=[],questions=psy.questions.concat(know.questions),comparisons=psy.comparisons.concat(know.comparisons),books=[],researchReports=[];
for(const source of catalog){const key=source.key,meta=definitions[key],research=read('knowledge-'+key+'-full.json'),rootId=key+'-book';
 assert.equal(research.bookKey,key);const chapterIds=source.chapters.map(c=>alias(c.id));
 books.push({id:rootId,key,title:meta.title,shortTitle:meta.shortTitle,author:meta.author,edition:meta.edition,chapterIds,sectionIds:source.chapters.flatMap(c=>c.sections.map(s=>alias(s.id)))});
 nodes.push({id:rootId,parentId:null,kind:'book',bookKey:key,original:true,title:meta.title,printedPages:Array.from({length:meta.last},(_,i)=>i+1),body:[meta.author+'，高等教育出版社，'+meta.edition+'。','按教材的章、节和分项理解知识；名词定义从教材原文核对，简答与论述按题干任务组织。可以先看全书目录，再进入一节，沿知识点定位相关题目。'],keywords:['知识结构','教材原文','分类辨析','完整作答']});
 const protectedIds=new Set(pilotNodes.map(n=>n.id));research.nodes.forEach(raw=>{const n=JSON.parse(JSON.stringify(raw));n.id=alias(n.id);n.parentId=alias(n.parentId);if(protectedIds.has(n.id))return;nodes.push(n);});
 questions.push(...(research.questions||[]));comparisons.push(...(research.comparisons||[]));researchReports.push({bookKey:key,...research.report});
}
nodes.push(...pilotNodes);
const db=K.index({nodes,questions,comparisons}),canonical=read('sports-revised.json').questions,bankLinks=[];
assert.equal(canonical.length,610);
const pilotMappings={'sp4-training-069':['psy-definition'],'sp4-training-070':['psy-goals'],'sp4-training-071':['psy-imagery'],'sp4-training-072':['psy-relaxation','psy-relax-imagery','psy-relax-progressive','psy-relax-self'],'sp4-training-073':['psy-attention'],'sp4-training-074':['psy-will-training'],'sp4-training-075':['psy-goals','psy-imagery','psy-relaxation','psy-attention'],'sp4-training-076':['psy-requirements'],'sp4-training-077':['know-meaning'],'sp4-training-078':['know-explicit','know-explicit-tacit'],'sp4-training-079':['know-tacit','know-explicit-tacit'],'sp4-training-080':['know-team','know-life-study','know-practice','know-professional-study','know-conscious','know-reflection','know-practice-application']};
const compact=s=>s.replace(/^[（(]?[一二三四五六七八九十百\d]+[、.．)）]?\s*/,'').replace(/[\s，。；、：:“”‘’（）()？?]/g,'');
for(const q of canonical){const section=alias(q.sectionId),sectionNode=db.nodes.get(section);assert.ok(sectionNode,q.id+' section '+section);const containerId=section+'-bank-points';if(!db.nodes.has(containerId)){const n={id:containerId,parentId:section,kind:'heading',original:false,title:'题库考点与原文定义',printedPages:sectionNode.printedPages,body:['本组将已有题目的考点放回教材所属位置；这是复习归并，不是额外添加的教材标题。名词解释展开后可查看原文定义图，简答与论述可对照完整作答。'],keywords:['定义','作答要点']};nodes.push(n);db.nodes.set(n.id,n);}
 const id='concept-'+q.id,title=q.termName||q.prompt.replace(/^(?:简答题|论述题|简述|试述|论述|请简述)[：:、\s]*/,'').replace(/。.*$/,'').slice(0,100),pages=[...new Set(q.textbookRefs.flatMap(r=>r.printedPages))].sort((a,b)=>a-b),terms=q.recallGuide?.highlights||q.answerOutline||[];
 nodes.push({id,parentId:containerId,kind:'point',original:false,title,printedPages:pages,body:q.examType==='term'?['记忆关键词：'+terms.join(' · ')]:q.answer,keywords:terms.filter(s=>typeof s==='string'&&s.length<=30),...(q.examType==='term'?{sourceQuestionId:q.id}:{}),explanation:q.examType==='term'?'定义以教材原文和原图为准。先记住概念的对象、必要属性与限定条件，再核对易混概念。':q.explanation});
 let headings=pilotMappings[q.id]||[];if(!headings.length){const names=[q.termName||'',...(q.headingPath||[])].map(compact).filter(s=>s.length>=4);const eligible=K.descendants(db,section).map(id=>db.nodes.get(id)).filter(n=>n.original&&['heading','point'].includes(n.kind));const matches=eligible.map(n=>({id:n.id,score:Math.max(0,...names.map(name=>{const target=compact(n.title);return target===name?100:target.length>=4&&(name.includes(target)||target.includes(name))?Math.min(target.length,name.length):0;}))})).filter(m=>m.score>0).sort((a,b)=>b.score-a.score);headings=matches.length?[matches[0].id]:[];}
 bankLinks.push({bankId:q.id,nodeIds:[...new Set(headings.concat(id))]});
}
const sections=catalog.flatMap(b=>b.chapters.flatMap(c=>c.sections.map(s=>alias(s.id))));
const readingPages=read('physiology-reading-pages.json');
assert.equal(Object.keys(readingPages.pages).length,360);
for(let page=1;page<=360;page++){const image=readingPages.pages[page];assert.match(image.key,/^[a-f0-9]{24}$/);assert.ok(image.width>=1000&&image.height>image.width);}
for(const n of nodes)if(/^kb-physiology-.*-study(?:\d+)?$/.test(n.id))n.readingRole='study-summary';
const data={version:2,title:'三本专业课教材知识树',books,sections,nodes,questions,comparisons,bankLinks,readingPages:{physiology:readingPages.pages},source:{books:books.map(b=>({...b,file:definitions[b.key].file})),verification:'依据用户提供教材整理标题及知识，定义原图与校对文字来自既有逐题核对资料。原标题与整理考点分开；不声称为官方答案或押题。'},researchReports};
const indexed=K.index(data),ids=new Set();
const readingVerifications=read('knowledge-reading-verifications.json'),readingGuides=read('knowledge-reading-guides.json');
for(const [id,v] of Object.entries(readingVerifications.nodes)){
 const n=indexed.nodes.get(id);assert.ok(n,id+' verification node');assert.ok(v.printedPages?.length&&v.printedPages.every(p=>Number.isInteger(p)&&p>=173&&p<=187),id+' verified printed pages');
 for(const field of ['additionalBody','verifiedText'])if(v[field])assert.ok(v[field].every(p=>typeof p==='string'&&p.trim()),id+' '+field);
 if(v.verifiedDefinition)assert.ok(v.verifiedText.includes(v.verifiedDefinition),id+' verified definition must match checked original');
 if(v.additionalBody)assert.ok(v.additionalBody.every(p=>!n.body.includes(p)),id+' must supplement rather than duplicate');
 if(v.excludeFromReading)assert.ok(v.correctionNote,id+' reason for OCR fragment');
 if(v.verifiedComparison){const c=v.verifiedComparison;assert.ok(c.columns.length>=3&&c.rows.every(row=>row.length===c.columns.length));}
}
for(const [id,g] of Object.entries(readingGuides.nodes)){
 const n=indexed.nodes.get(id),v=readingVerifications.nodes[id]||{};assert.ok(n,id+' memory node');
 const evidence=[n.title,n.definition||''].concat(n.body,v.additionalBody||[],v.verifiedText||[]).join('\n');
 assert.ok(g.keywords.length&&g.keywords.every(k=>typeof k==='string'&&k.length>=2&&evidence.includes(k)),id+' memory anchors must be exact phrases');
 assert.ok(g.recallOrder?.length&&g.recallOrder.every(p=>typeof p==='string'&&p.trim())&&g.memory&&g.pitfall,id+' complete memory guidance');
}
data.readingVerifications=readingVerifications.nodes;data.readingGuides=readingGuides.nodes;data.readingSources={verifications:readingVerifications.source,guides:readingGuides.source};
for(const n of data.nodes){assert.match(n.id,/^[a-z0-9-]+$/);assert.ok(!ids.has(n.id),n.id);ids.add(n.id);assert.ok(n.title&&Array.isArray(n.body)&&n.body.every(t=>typeof t==='string'&&t.trim()),n.id);assert.equal(typeof n.original,'boolean');assert.ok(n.printedPages.length&&n.printedPages.every(p=>Number.isInteger(p)&&p>0&&p<=400),n.id+' printed pages');if(n.parentId)assert.ok(indexed.nodes.has(n.parentId),n.id+' parent '+n.parentId);assert.ok(K.path(indexed,n.id).length<=18,'cycle/depth '+n.id);if(!['book','chapter'].includes(n.kind))assert.ok(sections.includes(K.sectionOf(indexed,n.id)),n.id+' section');}
assert.equal(books.length,3);assert.equal(sections.length,134);assert.equal(new Set(sections).size,134);for(const id of sections)assert.ok(indexed.nodes.get(id)?.kind==='section',id);
assert.equal(data.nodes.filter(n=>n.kind==='chapter').length,40);assert.equal(indexed.questions.size,data.questions.length,'duplicate questions');assert.equal(new Set(comparisons.map(c=>c.id)).size,comparisons.length,'duplicate comparisons');
for(const q of data.questions){assert.ok(q.prompt&&q.answer.length&&q.answer.every(p=>typeof p==='string'&&p.trim()),q.id);assert.ok(['short','essay','term'].includes(q.examType));assert.ok(q.nodeIds.length&&q.nodeIds.every(id=>indexed.nodes.has(id)),q.id+' nodes');assert.ok(q.printedPages.length&&q.printedPages.every(p=>p>0&&p<=400));assert.ok(q.explanation&&q.keywords.length);assert.ok(!q.answer.some(t=>/教材指出|书中指出/.test(t)),q.id);if(q.examType==='term'){assert.ok(q.nodeIds.some(id=>indexed.nodes.get(id).definition===q.answer.join('')),q.id+' verbatim definition');q.definitionVerbatim=true;}
 const text=q.answer.join('\n'),keys=q.keywords.concat(q.nodeIds.flatMap(id=>indexed.nodes.get(id).keywords||[]));q.highlights=[...new Set(keys)].filter(k=>k.length>=2&&k.length<=30&&text.includes(k)&&!['运动员','训练','知识','能力','提高','发展'].includes(k)).slice(0,20);assert.ok(q.highlights.length,q.id+' needs visible anchors');}
for(const c of data.comparisons){assert.ok(c.title&&c.columns.length>=2&&c.rows.length,c.id);assert.ok(c.nodeIds.length&&c.nodeIds.every(id=>indexed.nodes.has(id)),c.id);assert.ok(c.rows.every(row=>row.length===c.columns.length),c.id);assert.ok(c.printedPages.length&&c.printedPages.every(p=>p>0&&p<=400));}
assert.equal(bankLinks.length,610);assert.equal(new Set(bankLinks.map(l=>l.bankId)).size,610);for(const l of bankLinks)assert.ok(l.nodeIds.every(id=>indexed.nodes.has(id)),l.bankId);
for(const book of books){assert.ok(book.chapterIds.every(id=>indexed.nodes.get(id)?.kind==='chapter'));assert.ok(book.sectionIds.every(id=>indexed.nodes.get(id)?.kind==='section'));const ownIds=new Set(K.descendants(indexed,book.id));book.nodeCount=ownIds.size;book.questionCount=canonical.filter(q=>q.bookKey===book.key).length;book.practiceCount=questions.filter(q=>q.nodeIds.some(id=>ownIds.has(id))).length;}
data.summary={books:books.length,chapters:40,sections:134,nodes:nodes.length,originalItems:nodes.filter(n=>n.original&&!['book','chapter','section'].includes(n.kind)).length,organizedPoints:nodes.filter(n=>!n.original).length,questions:questions.length,comparisons:comparisons.length,bankQuestions:610};
const output='globalThis.KNOWLEDGE_DATA='+JSON.stringify(data).replace(/</g,'\\u003c')+';\n',target=path.join(root,'dist/knowledge-data.js');
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n'),output,'knowledge data needs rebuilding');else{fs.writeFileSync(target,output);fs.writeFileSync(path.join(root,'content/knowledge-summary.json'),JSON.stringify(data.summary,null,2)+'\n');}
console.log(JSON.stringify({result:'passed',...data.summary}));
