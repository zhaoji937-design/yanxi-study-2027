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
test('freehand paragraph strokes never clamp the first point or reshape near a boundary',()=>{
 const stroke={points:[[-1,.1,.5],[0,.5,.5],[3,2,.5]]};
 const one=Ink.translatePoints(stroke,{x:20,y:30},16);assert.deepEqual(one,[[4,31.6,.5],[20,38,.5],[68,62,.5]]);
 const moved=Ink.translatePoints(stroke,{x:20,y:120},16);for(let i=0;i<one.length;i++){assert.equal(moved[i][0],one[i][0]);assert.ok(Math.abs(moved[i][1]-one[i][1]-90)<1e-8);}
 assert.match(Ink.smoothPath(one),/^M4,31.6 Q/);assert.match(Ink.smoothPath(one),/L68,62$/);
});
test('custom colors, brush types, opacity and large nibs survive alongside legacy saved strokes',()=>{
 for(const brush of ['pen','fountain','pencil','marker','highlighter']){
  const value=example(),stroke=Object.values(value.blocks)[0].strokes[0];Object.assign(stroke,{brush,opacity:.25,color:'#12aBcD',width:2,anchorMode:'paragraph'});
  assert.deepEqual(Ink.validate(JSON.parse(JSON.stringify(value))),value);
  const svg=Ink.strokeMarkup(stroke,[[10,15,.3],[20,8,.5],[30,15,.7]],15);assert.match(svg,/#12aBcD/);assert.doesNotMatch(svg,/NaN|undefined/);
  if(brush==='pencil')assert.match(svg,/stroke-dasharray/);if(brush==='fountain')assert.match(svg,/fill="#12aBcD"/);if(brush==='highlighter')assert.match(svg,/multiply/);
 }
 for(const property of [{opacity:0},{opacity:2},{brush:'<svg>'},{color:'red;bad()'},{anchorMode:'screen'}]){const value=example();Object.assign(Object.values(value.blocks)[0].strokes[0],property);assert.throws(()=>Ink.validate(value));}
});
