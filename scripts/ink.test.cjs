'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Ink=require('../dist/ink.js'),K=require('../dist/knowledge.js');
function example(){const quote='目标设置应明确、可控，兼顾训练过程与比赛结果。',owner='node:psy-goals';return{version:1,blocks:{[owner+'|'+Ink.hash(quote)+'|0']:{owner,quote,space:6,strokes:[{id:'pen-1',at:1790000000000,offset:3,color:'#a34235',width:.145,points:[[.2,.1,.5],[1,1,.5],[2,.5,.5]]}]}}};}
test('handwriting backup retains exact paragraph, character anchor, spacing and vector paths',()=>{
 const original=example(),copy=Ink.validate(JSON.parse(JSON.stringify(original)));assert.deepEqual(copy,original);assert.equal(Ink.count(copy),1);
 Object.values(copy.blocks)[0].strokes[0].points[0][0]=99;assert.notEqual(Object.values(original.blocks)[0].strokes[0].points[0][0],99);
 assert.deepEqual(Ink.validate({version:1,blocks:{}}),{version:1,blocks:{}});
});
test('corrupt, mismatched and oversized handwriting is rejected before restoring storage',()=>{
 const mutate=fn=>{const data=example();fn(data,Object.values(data.blocks)[0]);assert.throws(()=>Ink.validate(data));};
 mutate((d,b)=>b.quote+='原文已改变');mutate((d,b)=>b.owner='node:somewhere-else');mutate((d,b)=>b.strokes[0].offset=9999);
 mutate((d,b)=>b.strokes[0].points[0][0]=NaN);mutate((d,b)=>b.strokes[0].color='url(javascript:bad)');mutate((d,b)=>b.strokes.push(b.strokes[0]));mutate((d,b)=>b.space=100);
 mutate(d=>Object.defineProperty(d.blocks,'__proto__',{value:{quote:'malformed'},enumerable:true}));assert.throws(()=>Ink.validate({version:2,blocks:{}}));
});
test('character-relative strokes move with reflow and retain shape at different paragraph widths',()=>{
 const stroke=Object.values(example().blocks)[0].strokes[0],a=Ink.positioned(stroke,{x:20,y:10},16,500,200),b=Ink.positioned(stroke,{x:60,y:50},16,300,300);
 for(let i=0;i<a.length;i++){assert.ok(Math.abs(b[i][0]-a[i][0]-40)<.001);assert.ok(Math.abs(b[i][1]-a[i][1]-40)<.001);}
 const narrow=Ink.positioned(stroke,{x:295,y:50},16,300,300);assert.ok(narrow.every(p=>p[0]>=3&&p[0]<=297));assert.ok(Math.abs((narrow[2][0]-narrow[0][0])-(a[2][0]-a[0][0]))<.001);
});
test('pinch preserves the world position under the midpoint without recentering the selected node',()=>{
 const next=K.zoomAnchor(1,1.7,420,180);assert.equal(next,840);assert.equal((next+180)/1.7,600);assert.ok(Math.abs(K.zoomAnchor(1.7,1,next,180)-420)<.001);
});
