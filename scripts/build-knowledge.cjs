'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=name=>JSON.parse(fs.readFileSync(path.join(root,'content',name),'utf8'));
const psy=read('knowledge-psychology.json'),know=read('knowledge-capacity.json');
const nodes=[
 {id:'training-book',parentId:null,kind:'book',original:true,title:'运动训练学（第二版）',printedPages:[141,164],body:['田麦久主编，高等教育出版社，2017年第二版。样板仅覆盖第四章第二、三节。'],keywords:[]},
 {id:'training-ch4',parentId:'training-book',kind:'chapter',original:true,title:'第四章 运动员竞技能力及其训练（下）',printedPages:[127],body:['本样板保留第四章作为上级归属，展开第二节与第三节。'],keywords:[]},
 {id:'tr4s2',parentId:'training-ch4',kind:'section',original:true,title:psy.section.title,printedPages:psy.section.printedPages,body:['本节依次讨论运动员心理能力的定义及其构成、常用的心理训练方法、心理训练的基本要求。先分清分类依据，再把不同心理技能与训练、比赛情境联系起来。'],keywords:['定义及其构成','心理训练方法','基本要求']},
 {id:'tr4s3',parentId:'training-ch4',kind:'section',original:true,title:know.section.title,printedPages:know.section.printedPages,body:['本节按“是什么与怎样构成—怎样获得和提高—怎样运用”展开。学习时要分别辨清知识的分类标准，并理解实践经验、理论表达与再次运用之间的联系。'],keywords:['构成','获得和提高','运用']}
].concat(psy.nodes,know.nodes);
const mappings={
 'sp4-training-069':['psy-definition'], 'sp4-training-070':['psy-goals'], 'sp4-training-071':['psy-imagery'],
 'sp4-training-072':['psy-relaxation','psy-relax-imagery','psy-relax-progressive','psy-relax-self'],
 'sp4-training-073':['psy-attention'], 'sp4-training-074':['psy-will-training'],
 'sp4-training-075':['psy-goals','psy-imagery','psy-relaxation','psy-attention'], 'sp4-training-076':['psy-requirements'],
 'sp4-training-077':['know-meaning'], 'sp4-training-078':['know-explicit','know-explicit-tacit'],
 'sp4-training-079':['know-tacit','know-explicit-tacit'],
 'sp4-training-080':['know-team','know-life-study','know-practice','know-professional-study','know-conscious','know-reflection','know-practice-application']
};
const data={version:1,title:'运动训练学 · 第四章第二、三节知识树',sections:['tr4s2','tr4s3'],nodes,questions:psy.questions.concat(know.questions),comparisons:psy.comparisons.concat(know.comparisons),bankLinks:Object.entries(mappings).map(([bankId,nodeIds])=>({bankId,nodeIds})),source:{title:'运动训练学（第二版）',author:'田麦久 主编',publisher:'高等教育出版社',edition:'2017年第二版（所用扫描本2019年重印）',file:'原版 运动训练学 (田麦久第2版) 教材电子版.pdf',printedContent:[141,164],reviewQuestionPages:[164,165],verification:'逐页核对用户提供的扫描教材原图；原标题、编号分项与整理辅助节点分开标记。'}};
const K=require('../dist/knowledge.js'),db=K.index(data),ids=new Set();
for(const n of data.nodes){assert.match(n.id,/^[a-z0-9-]+$/);assert.ok(!ids.has(n.id),n.id);ids.add(n.id);assert.ok(n.title&&Array.isArray(n.body)&&n.body.every(t=>typeof t==='string'&&t.trim()),n.id);assert.equal(typeof n.original,'boolean');assert.ok(n.printedPages.length&&n.printedPages.every(p=>Number.isInteger(p)&&p>0));if(n.parentId)assert.ok(db.nodes.has(n.parentId),n.id);assert.ok(K.path(db,n.id).length<=12,'cycle/depth');if(!['book','chapter'].includes(n.kind)){const section=K.sectionOf(db,n.id);assert.ok(data.sections.includes(section),n.id);assert.ok(n.printedPages.every(p=>p>=141&&p<=164),n.id);}}
assert.equal(db.nodes.size,data.nodes.length);assert.equal(db.questions.size,data.questions.length);
for(const q of data.questions){assert.ok(q.prompt&&q.answer.length&&q.answer.every(p=>typeof p==='string'&&p.trim()),q.id);assert.ok(['short','essay','term'].includes(q.examType));assert.ok(q.nodeIds.length&&q.nodeIds.every(id=>db.nodes.has(id)));assert.ok(q.printedPages.every(p=>p>=141&&p<=164));assert.ok(q.explanation&&q.keywords.length);assert.ok(!q.answer.some(t=>/教材指出|书中指出/.test(t)),q.id);if(q.examType==='term'){assert.ok(q.nodeIds.some(id=>db.nodes.get(id).definition===q.answer.join('')),q.id+' verbatim definition');q.definitionVerbatim=true;}}
for(const c of data.comparisons){assert.ok(c.title&&c.columns.length>=2&&c.rows.length);assert.ok(c.nodeIds.every(id=>db.nodes.has(id)));assert.ok(c.rows.every(r=>r.length===c.columns.length),c.id);}
for(const l of data.bankLinks)assert.ok(l.nodeIds.every(id=>db.nodes.has(id)),l.bankId);
for(const q of data.questions){const text=q.answer.join('\n'),keys=q.keywords.concat(q.nodeIds.flatMap(id=>db.nodes.get(id).keywords||[]));q.highlights=[...new Set(keys)].filter(k=>k.length>=2&&k.length<=24&&text.includes(k)&&!['运动员','训练','知识','能力','提高','发展'].includes(k)).slice(0,18);assert.ok(q.highlights.length,q.id+' needs visible answer anchors');}
data.summary={nodes:data.nodes.length,originalItems:data.nodes.filter(n=>n.original&&!['book','chapter','section'].includes(n.kind)).length,organizedPoints:data.nodes.filter(n=>!n.original).length,questions:data.questions.length,comparisons:data.comparisons.length,bankQuestions:data.bankLinks.length};
const json=JSON.stringify(data),output='globalThis.KNOWLEDGE_DATA='+json.replace(/</g,'\\u003c')+';\n';
const target=path.join(root,'dist/knowledge-data.js');
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n'),output,'knowledge data needs rebuilding');
else{fs.writeFileSync(target,output);fs.writeFileSync(path.join(root,'content/knowledge-summary.json'),JSON.stringify(data.summary,null,2)+'\n');}
console.log(JSON.stringify({result:'passed',...data.summary}));
