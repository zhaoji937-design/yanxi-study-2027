(function(root,factory){'use strict';var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.KnowledgeTree=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var dataset=null,db=null,bank=[],answerRenderer=null,onMount=null;
  var state={section:'tr4s2',node:'tr4s2',view:'outline',question:'',query:'',core:false,open:new Set(),scale:1},lastSection='';
  var lastMountedView='',lastMountedSection='',lastMountedNode='',lastMountedQuestion='',mapFocus='';
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function index(data){
    var nodes=new Map(data.nodes.map(function(n){return[n.id,n];})),children=new Map(),questions=new Map(data.questions.map(function(q){return[q.id,q];})),links=new Map();
    data.nodes.forEach(function(n){if(n.parentId){if(!children.has(n.parentId))children.set(n.parentId,[]);children.get(n.parentId).push(n.id);}});
    (data.bankLinks||[]).forEach(function(l){links.set(l.bankId,l.nodeIds);});return{nodes:nodes,children:children,questions:questions,links:links};
  }
  function path(db,id){var out=[],seen=new Set();while(id&&db.nodes.has(id)&&!seen.has(id)){seen.add(id);out.unshift(db.nodes.get(id));id=db.nodes.get(id).parentId;}return out;}
  function descendants(db,id){var out=[],visit=function(n){out.push(n);(db.children.get(n)||[]).forEach(visit);};visit(id);return out;}
  function sectionOf(db,id){return path(db,id).find(function(n){return n.kind==='section';})?.id||'';}
  function relevant(db,questionNodes,id){var scope=new Set(descendants(db,id));return questionNodes.some(function(n){return scope.has(n);});}
  function search(db,section,query,coreOnly){
    var q=String(query||'').trim().toLowerCase(),hits=descendants(db,section).filter(function(id){var n=db.nodes.get(id);return(!coreOnly||!!n.core)&&(!q||[n.title,n.definition||'',n.explanation||''].concat(n.body||[],n.keywords||[]).join(' ').toLowerCase().includes(q));}),allowed=new Set();
    hits.forEach(function(id){path(db,id).forEach(function(n){allowed.add(n.id);});});return{hits:new Set(hits),allowed:allowed,filtered:!!q||coreOnly};
  }
  function layout(db,rootId,open,allowed){
    var items=[],edges=[],sizes=new Map(),gap=18,col=274,width=246;
    function height(id){var title=db.nodes.get(id).title,units=Array.from(title).reduce(function(a,c){return a+(/[\u0000-\u00ff]/.test(c)?.55:1);},0);return Math.max(62,Math.ceil(units/14)*21+24);}
    function childIds(id){return open.has(id)?(db.children.get(id)||[]).filter(function(n){return !allowed||allowed.has(n);}):[];}
    function size(id){var kids=childIds(id),value=Math.max(height(id),kids.reduce(function(a,n){return a+size(n);},0)+Math.max(0,kids.length-1)*gap);sizes.set(id,value);return value;}
    function place(id,depth,top){var kids=childIds(id),h=height(id),y=top+(sizes.get(id)-h)/2;items.push({id:id,x:20+depth*col,y:20+y,width:width,height:h});var offset=top; kids.forEach(function(child){edges.push({from:id,to:child});place(child,depth+1,offset);offset+=sizes.get(child)+gap;});}
    size(rootId);place(rootId,0,0);return{nodes:items,edges:edges,width:Math.max.apply(null,items.map(function(n){return n.x+n.width+20;})),height:sizes.get(rootId)+40};
  }
  function init(data){dataset=data;db=index(data);}
  function pages(a){var groups=[];Array.from(new Set(a||[])).sort(function(a,b){return a-b;}).forEach(function(n){var last=groups[groups.length-1];if(last&&last[1]+1===n)last[1]=n;else groups.push([n,n]);});return groups.map(function(g){return g[0]===g[1]?g[0]:g[0]+'—'+g[1];}).join('、');}
  function ref(a){return '<p class="kt-ref">教材印刷第 '+esc(pages(a))+' 页</p>';}
  function highlight(text,terms){var safe=esc(text);if(globalThis.StudyTools&&terms?.length)return globalThis.StudyTools.highlightTerms(text,terms);return safe;}
  function button(action,label,attrs,cls){return '<button type="button" class="btn '+(cls||'secondary small')+'" data-action="kt-'+action+'" '+(attrs||'')+'>'+label+'</button>';}
  function link(params,label,cls){return '<a class="'+(cls||'kt-link')+'" href="'+href(params)+'">'+label+'</a>';}
  function href(params){var p=Object.assign({section:state.section,node:state.node,view:state.view,question:state.question},params),q=new URLSearchParams();['section','node','view','question'].forEach(function(k){if(p[k])q.set(k,p[k]);});return '#knowledge?'+esc(q.toString());}
  function questionList(){var own=dataset.questions.map(function(q){return Object.assign({},q,{nodes:q.nodeIds});}),existing=(dataset.bankLinks||[]).map(function(l){var q=bank.find(function(q){return q.id===l.bankId;});return q?{id:q.id,prompt:q.prompt,nodes:l.nodeIds,existing:true,printedPages:q.textbookRefs.flatMap(function(r){return r.printedPages;}),examType:q.examType}:null;}).filter(Boolean);return own.concat(existing);}
  function activeQuestion(){return questionList().find(function(q){return q.id===state.question;});}
  function usedNodes(){var q=activeQuestion();return new Set(q?q.nodes:[]);}
  function configure(params){
    if(!db)return;var section=db.nodes.get(params.get('section'))?.kind==='section'?params.get('section'):'tr4s2',node=db.nodes.has(params.get('node'))?params.get('node'):section;
    if(sectionOf(db,node)!==section)node=section;
    state.section=section;state.node=node;state.view=['outline','map','questions'].includes(params.get('view'))?params.get('view'):'outline';state.question=params.get('question')||'';
    if(lastSection!==section){state.query='';state.core=false;state.open=new Set([section]);(db.children.get(section)||[]).forEach(function(id){state.open.add(id);});lastSection=section;}
    path(db,node).forEach(function(n){state.open.add(n.id);});var used=usedNodes();used.forEach(function(id){path(db,id).forEach(function(n){state.open.add(n.id);});});
  }
  function breadcrumb(id){return '<nav class="kt-breadcrumb" aria-label="知识点所属位置">'+path(db,id).map(function(n){return n.kind==='book'||n.kind==='chapter'?'<span>'+esc(n.title)+'</span>':link({section:sectionOf(db,n.id)||state.section,node:n.id,view:state.view==='questions'?'outline':state.view},esc(n.title));}).join('<span aria-hidden="true">›</span>')+'</nav>';}
  function nodeLinks(ids,label){return '<div class="kt-node-links" aria-label="'+esc(label||'相关知识点')+'">'+ids.map(function(id){var n=db.nodes.get(id);return link({section:sectionOf(db,id),node:id,view:'outline'},esc(n.title));}).join('')+'</div>';}
  function outline(results){
    var used=usedNodes();function branch(id,depth){var n=db.nodes.get(id),kids=(db.children.get(id)||[]).filter(function(id){return !results.filtered||results.allowed.has(id);}),open=state.open.has(id)||results.filtered;
      return '<li><div class="kt-tree-row'+(id===state.node?' active':'')+(used.has(id)?' kt-used':'')+'" style="--kt-level:'+depth+'">'+(kids.length?button('toggle',open?'−':'+','data-node="'+esc(id)+'" aria-expanded="'+open+'" aria-label="'+(open?'折叠':'展开')+esc(n.title)+'"','kt-expander'):'<span class="kt-leaf" aria-hidden="true">·</span>')+link({node:id,view:'outline'},esc(n.title)+(n.core?'<span class="kt-dot" title="基础核心考点">●</span>':''),'kt-node'+(id===state.node?' current':''))+'</div>'+(kids.length&&open?'<ul>'+kids.map(function(k){return branch(k,depth+1);}).join('')+'</ul>':'')+'</li>';}
    if(results.filtered&&!results.hits.size)return '<p class="kt-empty">没有找到匹配的知识点，可以清空搜索或关闭核心筛选。</p>';
    return '<ul class="kt-tree" aria-label="教材层级目录">'+branch(state.section,0)+'</ul>';
  }
  function mapView(results){
    if(results.filtered&&!results.hits.size)return '<p class="kt-empty">没有匹配的分支。</p>';
    var expanded=new Set(state.open);if(results.filtered)results.allowed.forEach(function(id){expanded.add(id);});var plan=layout(db,state.section,expanded,results.filtered?results.allowed:null),byid=new Map(plan.nodes.map(function(n){return[n.id,n];})),used=usedNodes();
    var edges=plan.edges.map(function(e){var a=byid.get(e.from),b=byid.get(e.to),x1=a.x+a.width,y1=a.y+a.height/2,x2=b.x,y2=b.y+b.height/2;return '<path d="M'+x1+','+y1+' C'+(x1+16)+','+y1+' '+(x2-16)+','+y2+' '+x2+','+y2+'"/>';}).join('');
    return '<div class="kt-map-tools">'+button('zoom','−','data-delta="-0.15" aria-label="缩小导图"')+'<span>'+Math.round(state.scale*100)+'%</span>'+button('zoom','＋','data-delta="0.15" aria-label="放大导图"')+button('zoom','还原','data-reset="true"')+'<span class="small muted">横向、纵向滑动查看 · 点标题定位 · 点＋展开分支</span></div><div class="kt-map" tabindex="0" aria-label="可滚动的教材思维导图"><div class="kt-map-size" style="width:'+Math.ceil(plan.width*state.scale)+'px;height:'+Math.ceil(plan.height*state.scale)+'px"><div class="kt-map-canvas" style="width:'+plan.width+'px;height:'+plan.height+'px;transform:scale('+state.scale+')"><svg aria-hidden="true" width="'+plan.width+'" height="'+plan.height+'">'+edges+'</svg>'+plan.nodes.map(function(p){var n=db.nodes.get(p.id),children=db.children.get(p.id)||[];return '<div class="kt-map-node'+(p.id===state.node?' active':'')+(used.has(p.id)?' kt-used':'')+'" data-map-id="'+esc(p.id)+'" style="left:'+p.x+'px;top:'+p.y+'px;width:'+p.width+'px;height:'+p.height+'px">'+link({node:p.id,view:'map'},esc(n.title),'kt-map-title')+(children.length?button('toggle',state.open.has(p.id)?'−':'+','data-node="'+esc(p.id)+'" aria-label="'+esc(n.title)+'的下级分支" aria-expanded="'+state.open.has(p.id)+'"','kt-map-expander'):'')+'</div>';}).join('')+'</div></div></div>';
  }
  function comparison(c){return '<details class="kt-compare"><summary>'+esc(c.title)+'</summary>'+ref(c.printedPages)+'<div class="kt-table-scroll"><table><thead><tr>'+c.columns.map(function(v){return'<th scope="col">'+esc(v)+'</th>';}).join('')+'</tr></thead><tbody>'+c.rows.map(function(row){return'<tr>'+row.map(function(v){return'<td>'+esc(v)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div><p class="kt-note">'+esc(c.note||'')+'</p>'+nodeLinks(c.nodeIds)+'</details>';}
  function detail(){
    var n=db.nodes.get(state.node),related=questionList().filter(function(q){return relevant(db,q.nodes,n.id);}),children=db.children.get(n.id)||[],comparisons=dataset.comparisons.filter(function(c){return c.nodeIds.includes(n.id)||c.nodeIds.some(function(id){return children.includes(id);});});
    return '<article class="kt-detail" id="kt-detail">'+breadcrumb(n.id)+'<div class="kt-detail-head"><span class="kt-kind">'+(n.kind==='section'?'教材原节':n.original===false?'整理要点':'教材原有标题 / 分项')+'</span>'+(n.core?'<span class="kt-core-label">基础核心考点</span>':'')+'</div><h2>'+esc(n.title)+'</h2>'+ref(n.printedPages)+(n.definition?'<h3>教材定义 · 原文</h3><blockquote class="kt-definition">'+esc(n.definition)+'</blockquote>':'')+'<div class="kt-body">'+(n.body||[]).filter(function(p){return p!==n.definition;}).map(function(p){return'<p>'+highlight(p,n.keywords)+'</p>';}).join('')+'</div>'+(n.core?'<details class="kt-explain"><summary>为什么这一点要掌握</summary><p>'+esc(n.core)+'</p></details>':'')+(n.explanation?'<details class="kt-explain"><summary>理解提示 · 用自己的话讲清楚</summary><p>'+esc(n.explanation)+'</p></details>':'')+(children.length?'<section class="kt-children"><h3>这一部分包含</h3>'+nodeLinks(children)+'</section>':'')+comparisons.map(comparison).join('')+'<details class="kt-related"><summary>这一部分怎样考 · '+related.length+'题</summary>'+(related.length?related.map(function(q){return link({view:'questions',question:q.id},'<span>'+esc(q.prompt)+'</span><small>'+(q.existing?'已有题库':'本节样板题')+' · 查看作答与知识路径 →</small>','kt-question-link');}).join(''):'<p class="kt-note">本点作为上级问题的作答依据，先掌握它与上级概念的关系。</p>')+'</details></article>';
  }
  function questionsView(){
    var query=state.query.trim().toLowerCase(),all=questionList().filter(function(q){return q.nodes.some(function(id){return sectionOf(db,id)===state.section;})&&(!state.core||q.nodes.some(function(id){return !!db.nodes.get(id).core;}))&&(!query||[q.prompt].concat(q.answer||[],q.nodes.flatMap(function(id){var n=db.nodes.get(id);return[n.title].concat(n.keywords||[]);})).join(' ').toLowerCase().includes(query));}),q=all.find(function(q){return q.id===state.question;}),list='<details class="kt-question-list" '+(!q||window.innerWidth>760?'open':'')+'><summary>本节题目 · '+all.length+'题</summary>'+all.map(function(item){return link({view:'questions',question:item.id},esc(item.prompt),'kt-question-link'+(q?.id===item.id?' active':''));}).join('')+'</details>';
    if(!q)return list+'<article class="kt-detail"><h2>选一道题，沿知识树组织答案</h2><p>先找题目要求调用的知识，再看各部分怎样组成完整作答。可以直接对照答案，无需提交。</p>'+breadcrumb(state.node)+'</article>';
    var content=q.existing?answerRenderer(bank.find(function(x){return x.id===q.id;})):'<h3>'+(q.definitionVerbatim?'参考解释 · 教材原文':'参考答案 · 依据教材组织')+'</h3><div class="kt-answer">'+q.answer.map(function(p){return'<p>'+highlight(p,q.highlights||q.keywords)+'</p>';}).join('')+'</div>';
    return list+'<article class="kt-detail kt-question-detail">'+breadcrumb(state.section)+'<p class="kt-kind">'+(q.existing?'已有研习题库':q.sourceType==='textbook-review'?'教材复习思考题':'原创模拟题')+' · '+({term:'名词解释',short:'简答题',essay:'论述题'}[q.examType]||'参考作答')+'</p><h2>'+esc(q.prompt)+'</h2>'+ref(q.printedPages)+(q.promptPages?'<p class="kt-note">题干见教材印刷第 '+pages(q.promptPages)+' 页；以上为作答知识所在页。</p>':'')+'<section class="kt-used-nodes"><details class="kt-call-paths"><summary>这道题调用的知识 · '+q.nodes.length+'个节点</summary>'+nodeLinks(q.nodes)+'<details class="kt-explain"><summary>查看完整所属路径</summary>'+q.nodes.map(function(id){return'<div class="kt-question-path">'+breadcrumb(id)+'</div>';}).join('')+'</details></details>'+link({view:'map',question:q.id},'在导图中突出显示这些分支','btn secondary small')+'</section>'+content+(q.explanation?'<details class="kt-explain"><summary>理解与作答思路 · 为什么这样组织</summary><p>'+esc(q.explanation)+'</p></details>':'')+(q.keywords?.length?'<details class="kt-explain"><summary>记忆关键词与漏点核对</summary><p>'+q.keywords.map(esc).join(' · ')+'</p></details>':'')+(q.existing?'<button class="btn secondary small" data-action="read-one" data-id="'+esc(q.id)+'">进入研习背题与复习</button>':'')+'</article>';
  }
  function workspace(){var results=search(db,state.section,state.query,state.core);if(state.view==='questions')return '<div class="kt-columns kt-questions">'+questionsView()+'</div>';return '<div class="kt-scope-note">'+(state.query||state.core?'找到 '+results.hits.size+' 个匹配节点，保留其上级路径。':'按原书层级展开；每个知识点都可查看出处与相关题目。')+(state.question?' <strong>已突出显示当前题目使用的知识节点。</strong>':'')+'</div>'+(state.view==='map'?breadcrumb(state.node)+mapView(results)+'<div class="kt-map-detail">'+detail()+'</div>':'<div class="kt-columns"><details class="kt-directory" '+(typeof window==='undefined'||window.innerWidth>760?'open':'')+'><summary>本节目录 · 展开查看完整层级</summary>'+outline(results)+'</details>'+detail()+'</div>');}
  function render(currentBank,renderAnswer,mount){
    if(!dataset&&typeof globalThis!=='undefined'&&globalThis.KNOWLEDGE_DATA)init(globalThis.KNOWLEDGE_DATA);
    if(!db)return '<p>知识树正在准备。</p>';bank=currentBank||[];answerRenderer=renderAnswer;onMount=mount;configure(new URLSearchParams(location.hash.split('?')[1]||''));
    return '<div class="kt-app"><div class="page-heading"><div><h1>教材知识树</h1><p>《运动训练学》（第二版）· 第四章第二、三节样板</p></div></div><div class="kt-sections">'+dataset.sections.map(function(id){var n=db.nodes.get(id);return link({section:id,node:id,view:state.view,question:''},esc(n.title),'kt-section-tab'+(state.section===id?' active':''));}).join('')+'</div><p class="kt-intro">按教材结构理解，再按题目要求组织作答。核心标记依据定义、分类与知识关联整理，不代表命题预测。</p><div class="kt-controls"><div class="kt-view-tabs" role="group" aria-label="知识树视图">'+[['outline','大纲'],['map','导图'],['questions','题目与答案']].map(function(p){return link({view:p[0]},p[1],'btn '+(state.view===p[0]?'':'secondary')+' small');}).join('')+'</div>'+(state.view==='questions'?'':button('expand-all','展开本节全部层级')+button('collapse','收起到主干'))+'</div><div class="kt-search-row"><label class="kt-search-label" for="kt-search">'+(state.view==='questions'?'查找题目或关联知识':'查找知识点')+'<input id="kt-search" type="search" value="'+esc(state.query)+'" placeholder="搜索标题、知识点或易混词"></label>'+button('core',state.core?'查看全部知识':'只看核心','aria-pressed="'+state.core+'"')+button('clear','清空筛选')+'</div><div id="kt-workspace">'+workspace()+'</div></div>';
  }
  function mount(){
    var board=document.querySelector('.kt-map');
    if(board){var target=board.querySelector('[data-map-id="'+(mapFocus||state.node)+'"]')||board.querySelector('.kt-map-node');if(target){var branch=(db.children.get(target.dataset.mapId)||[]).length>0;board.scrollLeft=Math.max(0,target.offsetLeft*state.scale-(branch?24:(board.clientWidth-target.offsetWidth*state.scale)/2));board.scrollTop=Math.max(0,target.offsetTop*state.scale-(board.clientHeight-target.offsetHeight*state.scale)/2);}}
    document.querySelectorAll('.kt-detail>.kt-breadcrumb').forEach(function(el){el.scrollLeft=el.scrollWidth;});
    if(lastMountedView!==state.view||lastMountedSection!==state.section)window.scrollTo(0,0);
    else if(state.view==='questions'&&lastMountedQuestion!==state.question||state.view==='outline'&&window.innerWidth<=760&&lastMountedNode!==state.node){var detail=document.getElementById('kt-detail')||document.querySelector('.kt-question-detail');if(detail)detail.scrollIntoView({block:'start'});}
    lastMountedView=state.view;lastMountedSection=state.section;lastMountedNode=state.node;lastMountedQuestion=state.question;mapFocus='';
  }
  function paint(){var box=document.getElementById('kt-workspace');if(box){box.innerHTML=workspace();mount();if(onMount)onMount();}}
  function input(value){state.query=value;paint();}
  function handle(action,el){
    if(!action.startsWith('kt-')||!db)return false;
    if(action==='kt-toggle'){var id=el.dataset.node;mapFocus=id;if(state.open.has(id))state.open.delete(id);else state.open.add(id);}
    else if(action==='kt-expand-all')descendants(db,state.section).forEach(function(id){state.open.add(id);});
    else if(action==='kt-collapse'){state.open=new Set([state.section]);path(db,state.node).slice(0,-1).forEach(function(n){state.open.add(n.id);});}
    else if(action==='kt-core'){state.core=!state.core;el.setAttribute('aria-pressed',String(state.core));el.textContent=state.core?'查看全部知识':'只看核心';}
    else if(action==='kt-clear'){state.query='';state.core=false;document.getElementById('kt-search').value='';var core=document.querySelector('[data-action="kt-core"]');if(core){core.textContent='只看核心';core.setAttribute('aria-pressed','false');}}
    else if(action==='kt-zoom'){state.scale=el.dataset.reset?1:Math.max(.45,Math.min(1.9,Math.round((state.scale+Number(el.dataset.delta))*100)/100));}
    paint();return true;
  }
  function linksFor(id){if(!db&&typeof globalThis!=='undefined'&&globalThis.KNOWLEDGE_DATA)init(globalThis.KNOWLEDGE_DATA);return db?.links.get(id)||[];}
  function footer(id){var ids=linksFor(id);if(!ids.length)return '';return '<details class="kt-bank-link"><summary>这道题在教材知识树中的位置</summary>'+ids.map(function(n){return link({section:sectionOf(db,n),node:n,view:'map',question:id},esc(path(db,n).map(function(x){return x.title;}).join(' › ')),'kt-bank-path');}).join('')+'</details>';}
  return{init:init,index:index,path:path,descendants:descendants,sectionOf:sectionOf,relevant:relevant,search:search,layout:layout,render:render,mount:mount,handle:handle,input:input,linksFor:linksFor,footer:footer,esc:esc};
});
