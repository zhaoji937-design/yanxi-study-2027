(function(root,factory){'use strict';var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.StudyTools=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var RESULTS=['forgot','missing','confused','independent'];
  function highlightTerms(text,terms){
    text=String(text);var keys=Array.from(new Set((terms||[]).filter(function(k){return typeof k==='string'&&k.length>=2;}))).sort(function(a,b){return b.length-a.length;});
    var escape=function(s){return s.replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
    var html='',plain='',i=0;
    while(i<text.length){var key=keys.find(function(k){return text.startsWith(k,i);});if(key){html+=escape(plain)+'<strong class="answer-key">'+escape(key)+'</strong>';plain='';i+=key.length;}else{plain+=text[i];i++;}}
    return html+escape(plain);
  }
  function cleanRecalls(raw,ids){
    var out={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
    Object.keys(raw).slice(0,10000).forEach(function(id){
      if(!ids.has(id)||['__proto__','constructor','prototype'].includes(id))return;
      var r=raw[id];if(!r||!RESULTS.includes(r.result)||!Number.isFinite(r.due)||r.due<0||!Number.isFinite(r.updated)||r.updated<0)return;
      out[id]={result:r.result,streak:Math.max(0,Math.min(30,Math.trunc(Number(r.streak)||0))),due:r.due,updated:r.updated};
    });return out;
  }
  function cleanReaderDrafts(raw,ids){
    var out={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
    Object.keys(raw).slice(0,10000).forEach(function(id){
      if(ids.has(id)&&!['__proto__','constructor','prototype'].includes(id)&&typeof raw[id]==='string'&&raw[id].length)out[id]=raw[id].slice(0,40000);
    });return out;
  }
  function keywordExercise(q){
    if(!q||q.type!=='free'||!['term','short','essay'].includes(q.examType))return null;
    var source=q.examType==='term'?q.answerOutline:q.recallGuide&&q.recallGuide.highlights;
    if(!Array.isArray(source)||!Array.isArray(q.answer))return null;
    var keywords=Array.from(new Set(source.filter(function(k){return typeof k==='string'&&k.trim().length;})));
    if(!keywords.length)return null;
    var order=keywords.map(function(k,i){return {text:k,index:i};}).sort(function(a,b){return b.text.length-a.text.length;}),used=new Set();
    var parts=q.answer.filter(function(part){return typeof part==='string';}).map(function(part){
      var tokens=[],plain='',i=0;
      while(i<part.length){
        var key=order.find(function(k){return part.startsWith(k.text,i);});
        if(key){if(plain)tokens.push({text:plain});plain='';tokens.push({index:key.index});used.add(key.index);i+=key.text.length;}
        else{plain+=part[i];i++;}
      }
      if(plain)tokens.push({text:plain});return tokens;
    });
    return {keywords:keywords,parts:parts,extras:keywords.map(function(_,i){return i;}).filter(function(i){return !used.has(i);})};
  }
  function matchesKeyword(input,keyword){
    if(typeof input!=='string'||typeof keyword!=='string')return false;
    var normalize=function(text){return text.normalize('NFKC').toLowerCase().replace(/[\s、，,；;]/g,'');};
    return !!normalize(input)&&normalize(input)===normalize(keyword);
  }
  function nextRecall(prior,result,now){
    if(!RESULTS.includes(result)||!Number.isFinite(now)||now<0)throw new Error('回忆记录不合法');
    var streak=result==='independent'?Math.min(30,(prior&&prior.streak||0)+1):0;
    var days=[1,3,7,14,30],delay=result==='independent'?days[Math.min(streak-1,4)]*86400000:result==='forgot'?600000:1800000;
    return {result:result,streak:streak,due:now+delay,updated:now};
  }
  function paperIndex(papers,includeConcepts){
    var result=new Map();(papers||[]).forEach(function(p){var exact=p.eligible===false?[]:p.matches||[],canUseConcept=p.conceptEligible===true||p.conceptEligible==null&&p.eligible!==false;exact.concat(includeConcepts&&canUseConcept?p.conceptMatches||[]:[]).forEach(function(m){if(!result.has(m.questionId))result.set(m.questionId,[]);result.get(m.questionId).push({paper:p,match:m});});});return result;
  }
  function allowPaper(q,scope,index,conceptIndex){if(scope==='past')return q.subject==='346 体育综合'&&index.has(q.id);if(scope==='all')return true;if(q.subject!=='346 体育综合')return true;return scope==='topics'?!(conceptIndex||index).has(q.id):!index.has(q.id);}
  var FAQ=[
    ['看着熟，合上却想不起来，怎么办？','先只看题目，尝试说出定义或列框架，再展开核对。看答案时觉得熟悉，不等于独立回忆成功。完全没想起、漏要点、混淆了要分开记录。'],
    ['相近概念总串在一起，怎么办？','把两者放在同一组，逐项比较对象、形成条件、作用和限制。先分别说明，再不看标题判断区别。例如重复训练法与持续训练法，先抓住组间休息与无间断连续的区别，不把它们简单等同于无氧与有氧。'],
    ['记得口诀，却展开不了，怎么办？','用有意义的小标题代替只有首字母的口诀。每个标题接一句“它是什么／为什么／怎样影响结果”。能从提示还原完整关系后，再减少提示。口诀只能帮助找回内容，不能代替解释。'],
    ['题目一换问法，我就不会了，怎么办？','同一概念轮流练“是什么、为什么、与谁不同、如何应用”。先确认这次问的任务。练过定义，并不等于已练过原因或应用；不要把旧答案整段搬到新问题中。'],
    ['怎样避免答到相邻知识点？','先找对象，再找任务，再找范围和附加要求。“红细胞的功能及运动影响”中，对象是红细胞，任务有两项；白细胞免疫功能属于另一个对象。写之前列任务标题，写之后逐项回看题干。'],
    ['要点都写了，为什么仍显得空？','每个要点至少解释清楚一个关系：是什么、为什么，或者如何发生。比如不能只有“过程／成果”四个字，应说明教学设计是研究筹划的过程，教学计划是该过程形成的成果。'],
    ['答案太长，应该怎么背？','先记整个框架，再逐点补定义、原因和例子，最后遮住全部内容复述。不要一次从第一句机械背到最后一句。原文用来校准，考场整理用来练习围绕题目完整表达。'],
    ['复习间隔应该固定吗？','先尝试回忆，再根据表现安排下一次。这里采用便于执行的默认间隔：独立回忆后约1、3、7、14、30天复习；想不起或混淆时更早再看。这是排程示例，不是对每个人都最优的规律。'],
    ['只在脑海过一遍够吗？','快速过题可以提高覆盖，但容易把“想到了这个话题”当成“能答完整”。每轮挑几道题限时口述或写提纲，检查是否能补齐条件、分点、因果和例子。不要求每题都完整抄写。'],
    ['完全陌生的题怎么落笔？','先分清题目对象与任务，写出有把握的相关定义和原理，再尝试建立关系。对不确定的内容不编造术语或数据，也不把熟悉但无关的整章内容填进去。'],
    ['怎样分配考场时间？','先看试卷各题分值和总时长，再分配答题时间并留出检查时间。某一点卡住时先列其余要点，避免为了回忆一句原文耗尽整道题的时间；不能按资料篇幅决定答题篇幅。'],
    ['教材、整理答案说法不一致时怎么办？','先确认是不是同一版教材、同一个概念、同一种语境。名词解释优先核实教材定义，自己的说明另列。当前只有标为“原文已核对”的条目完成了逐页核查，其他整理答案还需核对。'],
    ['考过的知识点能确定不再考吗？','不能据此确定。按你的选择，日常练习可排除已匹配的原题及关联考点，也可切换为只排除原题；原题与关联理由保留在历年题页面。筛选帮助安排时间，不是对下一次命题的预测。部分年份未取得正文，当前也不能覆盖全部历史考点。']
  ];
  return {RESULTS:RESULTS,cleanRecalls:cleanRecalls,cleanReaderDrafts:cleanReaderDrafts,keywordExercise:keywordExercise,matchesKeyword:matchesKeyword,nextRecall:nextRecall,paperIndex:paperIndex,allowPaper:allowPaper,highlightTerms:highlightTerms,FAQ:FAQ};
});
