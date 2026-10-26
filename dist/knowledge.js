(function(root,factory){'use strict';var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.KnowledgeTree=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var dataset=null,db=null,bank=[],bankMap=new Map(),questionCache=[],answerRenderer=null,onMount=null;
  var foldedReading=new Set();
  var ui={directoryHidden:true,focus:false,layout:'quiet-v1'};try{var savedUI=JSON.parse(localStorage.getItem('yanxi-knowledge-ui-v1'));if(savedUI?.layout==='quiet-v1'&&typeof savedUI.directoryHidden==='boolean')ui.directoryHidden=savedUI.directoryHidden;if(savedUI?.focus===true)ui.focus=true;if(Array.isArray(savedUI?.readingCollapsed))savedUI.readingCollapsed.slice(-1500).forEach(function(id){if(typeof id==='string'&&/^[a-z0-9-]{1,100}$/.test(id))foldedReading.add(id);});}catch(_){}
  function saveUI(){try{localStorage.setItem('yanxi-knowledge-ui-v1',JSON.stringify(Object.assign({},ui,{readingCollapsed:Array.from(foldedReading).slice(-1500)})));}catch(_){}}
  function ink(){return globalThis.InkNotes;}
  var state={book:'',scope:'',section:'tr4s2',node:'tr4s2',view:'outline',question:'',query:'',core:false,open:new Set(),scale:1},lastSection='';
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
  function layout(db,rootId,open,allowed,titleFor){
    var items=[],edges=[],sizes=new Map(),gap=18,col=274,width=246;
    function height(id){var title=titleFor?titleFor(db.nodes.get(id)):db.nodes.get(id).title,units=Array.from(title).reduce(function(a,c){return a+(/[\u0000-\u00ff]/.test(c)?.55:1);},0);return Math.max(62,Math.ceil(units/14)*21+24);}
    function childIds(id){return open.has(id)?(db.children.get(id)||[]).filter(function(n){return !allowed||allowed.has(n);}):[];}
    function size(id){var kids=childIds(id),value=Math.max(height(id),kids.reduce(function(a,n){return a+size(n);},0)+Math.max(0,kids.length-1)*gap);sizes.set(id,value);return value;}
    function place(id,depth,top){var kids=childIds(id),h=height(id),y=top+(sizes.get(id)-h)/2;items.push({id:id,x:20+depth*col,y:20+y,width:width,height:h});var offset=top; kids.forEach(function(child){edges.push({from:id,to:child});place(child,depth+1,offset);offset+=sizes.get(child)+gap;});}
    size(rootId);place(rootId,0,0);return{nodes:items,edges:edges,width:Math.max.apply(null,items.map(function(n){return n.x+n.width+20;})),height:sizes.get(rootId)+40};
  }
  function ordinal(title){var m=String(title).match(/^(?:第)?[（(]?([一二三四五六七八九十百零〇\d]+)(?:[章节、.．)）])/);if(!m)return null;var s=m[1];if(/^\d+$/.test(s))return Number(s);var digits='零一二三四五六七八九',parts=s.split('十');if(parts.length===2)return (parts[0]?digits.indexOf(parts[0]):1)*10+(parts[1]?digits.indexOf(parts[1]):0);return digits.indexOf(s);}
  function cn(n){if(n<10)return '零一二三四五六七八九'[n];if(n<100)return(n<20?'':cn(Math.floor(n/10)))+'十'+(n%10?cn(n%10):'');return String(n);}
  function init(data){dataset=data;db=index(data);db.children.forEach(function(ids){ids.sort(function(a,b){var x=db.nodes.get(a),y=db.nodes.get(b),p=(x.original===false)-(y.original===false);if(p)return p;var nx=ordinal(x.title),ny=ordinal(y.title);return Math.min.apply(null,x.printedPages)-Math.min.apply(null,y.printedPages)||(nx!=null&&ny!=null?nx-ny:0);});});}
  function titlePrefix(n){
    if(!n||!n.original||['book','chapter'].includes(n.kind)||ordinal(n.title)!=null||/^[a-zA-Z①-⑳][、.．)）]?/.test(n.title))return '';
    var siblings=(db.children.get(n.parentId)||[]).map(function(id){return db.nodes.get(id);}).filter(function(x){return x.original&&x.kind===n.kind;}),number=siblings.findIndex(function(x){return x.id===n.id;})+1;
    if(!number)return '';if(n.kind==='section')return '第'+cn(number)+'节 ';
    var section=sectionOf(db,n.id),line=path(db,n.id),depth=line.findIndex(function(x){return x.id===n.id;})-line.findIndex(function(x){return x.id===section;});
    return depth<=1?cn(number)+'、':depth===2?'（'+cn(number)+'）':depth===3?number+'. ':'（'+number+'）';
  }
  function nodeLabel(n){return titlePrefix(n)+n.title;}
  function pages(a){var groups=[];Array.from(new Set(a||[])).sort(function(a,b){return a-b;}).forEach(function(n){var last=groups[groups.length-1];if(last&&last[1]+1===n)last[1]=n;else groups.push([n,n]);});return groups.map(function(g){return g[0]===g[1]?g[0]:g[0]+'—'+g[1];}).join('、');}
  function ref(a){return '<p class="kt-ref">教材印刷第 '+esc(pages(a))+' 页</p>';}
  function highlight(text,terms){var safe=esc(text);if(globalThis.StudyTools&&terms?.length)return globalThis.StudyTools.highlightTerms(text,terms);return safe;}
  function button(action,label,attrs,cls){return '<button type="button" class="btn '+(cls||'secondary small')+'" data-action="kt-'+action+'" '+(attrs||'')+'>'+label+'</button>';}
  function link(params,label,cls){return '<a class="'+(cls||'kt-link')+'" href="'+href(params)+'">'+label+'</a>';}
  function bookOf(id){return path(db,id).find(function(n){return n.kind==='book';});}
  function scopeOf(id){var n=db.nodes.get(id);return n&&['book','chapter'].includes(n.kind)?id:sectionOf(db,id);}
  function href(params){var p=Object.assign({book:state.book,section:state.section,node:state.node,view:state.view,question:state.question,scope:state.scope},params),q=new URLSearchParams();if(params&&params.node&&db.nodes.has(params.node)){p.book=bookOf(params.node)?.bookKey||'';p.section=sectionOf(db,params.node);if(!state.scope||!descendants(db,state.scope).includes(params.node))p.scope=scopeOf(params.node);if(['book','chapter','section'].includes(db.nodes.get(params.node).kind))p.scope=params.node;}['book','section','node','view','question','scope'].forEach(function(k){if(p[k])q.set(k,p[k]);});return '#knowledge?'+esc(q.toString());}
  function questionList(){return questionCache;}
  function cacheQuestions(){questionCache=dataset.questions.map(function(q){return Object.assign({},q,{nodes:q.nodeIds});}).concat((dataset.bankLinks||[]).map(function(l){var q=bankMap.get(l.bankId);return q?{id:q.id,prompt:q.prompt,nodes:l.nodeIds,existing:true,printedPages:q.textbookRefs.flatMap(function(r){return r.printedPages;}),examType:q.examType}:null;}).filter(Boolean));}
  function activeQuestion(){return questionList().find(function(q){return q.id===state.question;});}
  function usedNodes(){var q=activeQuestion();return new Set(q?q.nodes:[]);}
  function configure(params){
    if(!db)return;var book=(dataset.books||[]).find(function(b){return b.key===params.get('book');}),section=db.nodes.get(params.get('section'))?.kind==='section'?params.get('section'):'',node=db.nodes.has(params.get('node'))?params.get('node'):section||(book?.id)||dataset.books?.[0]?.id||'tr4s2';
    state.book=bookOf(node)?.bookKey||book?.key||'training';state.section=sectionOf(db,node);var requested=params.get('scope');state.scope=requested&&db.nodes.has(requested)&&descendants(db,requested).includes(node)?requested:scopeOf(node);state.node=node;state.view=['outline','map','questions'].includes(params.get('view'))?params.get('view'):'outline';state.question=params.get('question')||'';
    if(lastSection!==state.scope){state.query='';state.core=false;state.open=new Set([state.scope]);if(db.nodes.get(state.scope)?.kind==='section')(db.children.get(state.scope)||[]).forEach(function(id){state.open.add(id);});lastSection=state.scope;}
    path(db,node).forEach(function(n){state.open.add(n.id);});usedNodes().forEach(function(id){path(db,id).forEach(function(n){state.open.add(n.id);});});
    if(state.view==='outline'){var unfolded=false;path(db,node).forEach(function(n){if(foldedReading.delete(n.id))unfolded=true;});if(unfolded)saveUI();}
  }
  function breadcrumb(id){return '<nav class="kt-breadcrumb" aria-label="知识点所属位置">'+path(db,id).map(function(n){return link({node:n.id,view:state.view==='questions'?'outline':state.view,question:''},esc(n.title));}).join('<span aria-hidden="true">›</span>')+'</nav>';}
  function navigation(){var book=dataset.books?.find(function(b){return b.key===state.book;});if(!book)return '';var chapter=path(db,state.node).find(function(n){return n.kind==='chapter';}),sections=chapter?(db.children.get(chapter.id)||[]).filter(function(id){return db.nodes.get(id).kind==='section';}):[];function options(ids,value,placeholder){return '<option value="">'+placeholder+'</option>'+ids.map(function(id){return '<option value="'+esc(id)+'"'+(id===value?' selected':'')+'>'+esc(db.nodes.get(id).title)+'</option>';}).join('');}return '<div class="kt-sections">'+dataset.books.map(function(b){return link({book:b.key,section:'',node:b.id,view:state.view,question:''},esc(b.shortTitle),'kt-section-tab'+(state.book===b.key?' active':''));}).join('')+'</div><div class="kt-book-navigation"><label>章<select id="kt-chapter">'+options(book.chapterIds,chapter?.id,'全书目录')+'</select></label><label>节<select id="kt-section"'+(!chapter?' disabled':'')+'>'+options(sections,state.section,chapter?'本章目录':'先选一章')+'</select></label>'+link({node:book.id,question:''},'全书目录','btn secondary small')+'</div>';}
  function change(id,value){if(id!=='kt-chapter'&&id!=='kt-section')return false;var book=dataset.books.find(function(b){return b.key===state.book;}),chapter=path(db,state.node).find(function(n){return n.kind==='chapter';});location.hash=href({node:value||(id==='kt-chapter'?book.id:chapter?.id||book.id),question:''}).replace(/&amp;/g,'&');return true;}
  function nodeLinks(ids,label){return '<div class="kt-node-links" aria-label="'+esc(label||'相关知识点')+'">'+ids.map(function(id){var n=db.nodes.get(id);return link({section:sectionOf(db,id),node:id,view:'outline'},esc(nodeLabel(n)));}).join('')+'</div>';}
  function readingNav(){
    var n=db.nodes.get(state.node),book=bookOf(n.id),chapter=path(db,n.id).find(function(x){return x.kind==='chapter';}),parent=n.parentId&&db.nodes.get(n.parentId),links=[];
    if(parent)links.push(link({node:parent.id,view:'outline',question:''},parent.kind==='book'?'‹ 返回全书目录':'‹ 返回上一级','kt-parent-link'));
    else links.push('<a href="#overview" class="kt-parent-link">‹ 返回书桌</a>');
    if(chapter&&parent?.id!==chapter.id&&n.id!==chapter.id)links.push(link({node:chapter.id,view:'outline',question:''},'本章目录','kt-return-chapter'));
    if(book&&n.id!==book.id&&parent?.id!==book.id)links.push(link({node:book.id,view:'outline',question:''},'全书目录','kt-return-book'));
    return '<nav class="kt-reading-nav" aria-label="返回教材目录">'+links.join('')+'</nav>';
  }
  function locationPicker(){
    var book=dataset.books.find(function(b){return b.key===state.book;}),chapter=path(db,state.node).find(function(n){return n.kind==='chapter';});
    return '<div class="kt-location-bar"><a href="#overview" class="kt-home-link">‹ 书桌</a><details class="kt-book-picker kt-popover"><summary><strong>'+esc(book?.shortTitle||'选择教材')+'</strong><span class="kt-location-name">'+esc(chapter?chapter.title:'全书目录')+'</span><span class="kt-picker-arrow" aria-hidden="true">⌄</span></summary><div class="kt-picker-panel">'+navigation()+'</div></details></div>';
  }
  function outline(results){
    var used=usedNodes();function branch(id,depth){var n=db.nodes.get(id),kids=(db.children.get(id)||[]).filter(function(id){return !results.filtered||results.allowed.has(id);}),open=state.open.has(id)||results.filtered;
      return '<li><div class="kt-tree-row'+(id===state.node?' active':'')+(used.has(id)?' kt-used':'')+'" style="--kt-level:'+depth+'">'+(kids.length?button('toggle',open?'−':'+','data-node="'+esc(id)+'" aria-expanded="'+open+'" aria-label="'+(open?'折叠':'展开')+esc(nodeLabel(n))+'"','kt-expander'):'<span class="kt-leaf" aria-hidden="true">·</span>')+link({node:id,view:'outline'},esc(nodeLabel(n))+(n.core?'<span class="kt-dot" title="基础核心考点">●</span>':''),'kt-node'+(id===state.node?' current':''))+'</div>'+(kids.length&&open?'<ul>'+kids.map(function(k){return branch(k,depth+1);}).join('')+'</ul>':'')+'</li>';}
    if(results.filtered&&!results.hits.size)return '<p class="kt-empty">没有找到匹配的知识点，可以清空搜索或关闭核心筛选。</p>';
    return '<ul class="kt-tree" aria-label="教材层级目录">'+branch(state.scope,0)+'</ul>';
  }
  function mapView(results){
    if(results.filtered&&!results.hits.size)return '<p class="kt-empty">没有匹配的分支。</p>';
    var expanded=new Set(state.open);if(results.filtered)results.allowed.forEach(function(id){expanded.add(id);});var plan=layout(db,state.scope,expanded,results.filtered?results.allowed:null,nodeLabel),byid=new Map(plan.nodes.map(function(n){return[n.id,n];})),used=usedNodes();
    var edges=plan.edges.map(function(e){var a=byid.get(e.from),b=byid.get(e.to),x1=a.x+a.width,y1=a.y+a.height/2,x2=b.x,y2=b.y+b.height/2;return '<path d="M'+x1+','+y1+' C'+(x1+16)+','+y1+' '+(x2-16)+','+y2+' '+x2+','+y2+'"/>';}).join('');
    return '<div class="kt-map-tools">'+button('zoom','−','data-delta="-0.15" aria-label="缩小导图"')+'<span class="kt-scale-label">'+Math.round(state.scale*100)+'%</span>'+button('zoom','＋','data-delta="0.15" aria-label="放大导图"')+button('zoom','还原','data-reset="true"')+'<span class="small muted">单指移动 · 双指缩放 · 点＋展开分支</span></div><div class="kt-map" tabindex="0" aria-label="可滚动的教材思维导图"><div class="kt-map-size" style="width:'+Math.ceil(plan.width*state.scale)+'px;height:'+Math.ceil(plan.height*state.scale)+'px"><div class="kt-map-canvas" style="width:'+plan.width+'px;height:'+plan.height+'px;transform:scale('+state.scale+')"><svg aria-hidden="true" width="'+plan.width+'" height="'+plan.height+'">'+edges+'</svg>'+plan.nodes.map(function(p){var n=db.nodes.get(p.id),children=db.children.get(p.id)||[];return '<div class="kt-map-node'+(p.id===state.node?' active':'')+(used.has(p.id)?' kt-used':'')+'" data-map-id="'+esc(p.id)+'" style="left:'+p.x+'px;top:'+p.y+'px;width:'+p.width+'px;height:'+p.height+'px">'+link({node:p.id,view:'map'},esc(nodeLabel(n)),'kt-map-title')+(children.length?button('toggle',state.open.has(p.id)?'−':'+','data-node="'+esc(p.id)+'" aria-label="'+esc(n.title)+'的下级分支" aria-expanded="'+state.open.has(p.id)+'"','kt-map-expander'):'')+'</div>';}).join('')+'</div></div></div>';
  }
  function comparison(c){return '<details class="kt-compare"><summary>'+esc(c.title)+'</summary>'+ref(c.printedPages)+'<div class="kt-table-scroll"><table><thead><tr>'+c.columns.map(function(v){return'<th scope="col">'+esc(v)+'</th>';}).join('')+'</tr></thead><tbody>'+c.rows.map(function(row){return'<tr>'+row.map(function(v){return'<td>'+esc(v)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div><p class="kt-note">'+esc(c.note||'')+'</p>'+nodeLinks(c.nodeIds)+'</details>';}
  function verification(n){return dataset.readingVerifications?.[n.id]||{};}
  function guideFor(n){return dataset.readingGuides?.[n.id]||null;}
  function shortTitle(n){return n.title.replace(/^(?:第[一二三四五六七八九十\d]+[章节]\s*|[（(]?[一二三四五六七八九十\d]+[、.．)）]\s*)/,'').replace(/及其(?:应用|训练)$|的?基本(?:特点|结构|要求)$|概述$|释义$/,'');}
  function anchors(n){
    var g=guideFor(n),text=[n.title,n.definition||''].concat(n.body||[],verification(n).additionalBody||[]).join('\n'),terms=(g?.keywords||[]).concat(n.keywords||[],shortTitle(n),shortTitle(n).split(/与|和|及/).filter(function(s){return s.length>=3;}));
    (db.children.get(n.id)||[]).map(function(id){return db.nodes.get(id);}).filter(function(x){return x.original;}).forEach(function(x){terms.push(shortTitle(x));});
    var common=['训练目标','训练内容','训练负荷','检查手段','评定标准','训练手段','信息反馈','过程监督','结果评定','方案修正','科学控制','系统控制','反馈控制','训练模式','定量关系','逻辑顺序','时间序列','适时恢复','负荷强度','身体练习','认识活动','最大摄氧量','有氧代谢','无氧代谢','兴奋性','内环境','稳态','信息化','定量化','循环性','系统化','定性化','程序化','自动化','菜单化','一体化'];
    common.forEach(function(k){if(text.includes(k))terms.push(k);});
    var pattern=/(?:一是|二是|三是|四是|五是|六是)([^，。；：]{2,12})/g,m;while((m=pattern.exec(text)))terms.push(m[1]);
    return Array.from(new Set(terms)).filter(function(k){return typeof k==='string'&&k.length>=2&&k.length<=30&&!['运动员','训练','知识','能力','发展','提高','应用','结构','特点'].includes(k);});
  }
  function readingText(text,terms){return text.split('；').map(function(part){return highlight(part,terms);}).join('；<br class="kt-clause-break">');}
  function titleMarkup(n,tag,inline){return '<'+tag+' class="kt-reading-title" data-heading-prefix="'+esc(titlePrefix(n))+'" aria-label="'+esc(nodeLabel(n))+'"'+(inline?' data-ink-text':'')+'>'+esc(n.title)+'</'+tag+'>';}
  function nodeBody(n){
    var v=verification(n),terms=anchors(n),body=(n.body||[]).filter(function(p){return p!==n.definition;}).map(function(p){
      var label='';(v.verifiedText||[]).forEach(function(full){var m=full.match(/^([一二三四五六七八九十]+是[^。]{2,12})。([\s\S]+)$/);if(m&&m[2]===p)label='<div class="kt-verified-label"><strong>'+esc(m[1])+'</strong></div>';});
      return label+'<p data-ink-text>'+readingText(p,terms)+'</p>';
    }).join('');
    return (n.definition?'<h5 class="kt-definition-label">教材定义 · 原文</h5><blockquote class="kt-definition" data-ink-text>'+readingText(n.definition,terms)+'</blockquote>':'')+'<div class="kt-body">'+body+(v.verifiedDefinition?'<h5 class="kt-definition-label">教材原文定义</h5><blockquote class="kt-definition" data-ink-text>'+readingText(v.verifiedDefinition,terms)+'</blockquote>':'')+(v.additionalBody||[]).map(function(p){return '<p data-ink-text class="kt-verified-continuation">'+readingText(p,terms)+'</p>';}).join('')+'</div>'+(v.additionalBody?.length?'<p class="kt-verified-ref">续文已按教材印刷第 '+pages(v.printedPages)+' 页核对补齐</p>':'');
  }
  function memoryCue(n,primary){
    var g=guideFor(n),kids=(db.children.get(n.id)||[]).map(function(id){return db.nodes.get(id);}).filter(function(x){return x.original&&!verification(x).excludeFromReading;}),selected=state.node===n.id;
    if(!primary&&!selected&&!(g&&/基本结构|基本特点|应用方式/.test(n.title)))return '';
    var steps=g?.recallOrder||kids.slice(0,7).map(function(x){return shortTitle(x);}),keys=anchors(n).filter(function(k){return [n.definition||''].concat(n.body||[]).join('').includes(k);}).slice(0,5);
    var memory=g?.memory||n.explanation||(steps.length?'先用一句话说明“'+shortTitle(n)+'”的含义，再依次展开'+steps.map(function(s){return '“'+s+'”';}).join('、')+'。回忆时先说全这个框架，再补各项的条件、作用和相互关系。':keys.length?'先抓住'+keys.map(function(k){return '“'+k+'”';}).join('、')+'这些原文线索，遮住正文后，试着用它们把本段的对象、条件和结论连成完整的话。':'先看清本段回答的是什么，再按“概念或结论—依据与条件—作用或应用”的顺序复述；只使用本段实际涉及的要素。');
    return '<aside class="kt-memory-cue"><strong>怎么记</strong>'+(steps.length?'<ol class="kt-recall-order">'+steps.map(function(s){return'<li>'+esc(s)+'</li>';}).join('')+'</ol>':'')+'<p>'+esc(memory)+'</p></aside>'+(g?.pitfall&&(primary||selected)?'<details class="kt-explain kt-memory-pitfall"><summary>易混提醒</summary><p>'+esc(g.pitfall)+'</p></details>':'');
  }
  function verifiedComparison(c){return '<section class="kt-reading-comparison"><h3>放在一起辨析 · '+esc(c.title)+'</h3>'+ref(c.printedPages)+'<div class="kt-table-scroll"><table><thead><tr>'+c.columns.map(function(v){return '<th scope="col">'+esc(v)+'</th>';}).join('')+'</tr></thead><tbody>'+c.rows.map(function(row){return '<tr>'+row.map(function(v){return '<td>'+esc(v)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div><p class="kt-note">'+esc(c.sourceLabel||'')+' · '+esc(c.note||'')+'</p></section>';}
  function continuousReading(selected){
    var rootNode=db.nodes.get(sectionOf(db,selected.id)),ids=descendants(db,rootNode.id),allowed=new Set(ids),main=(db.children.get(rootNode.id)||[]).filter(function(id){return db.nodes.get(id).original&&!verification(db.nodes.get(id)).excludeFromReading;}),related=questionList().filter(function(q){return q.nodes.some(function(id){return allowed.has(id);});});
    function unit(id,depth){
      var n=db.nodes.get(id);if(!n.original)return '';var v=verification(n),children=(db.children.get(id)||[]).filter(function(child){return db.nodes.get(child).original;}),tag=depth===1?'h3':depth===2?'h4':'h5';
      var foldable=depth===1,folded=foldable&&foldedReading.has(id),heading=titleMarkup(n,tag,true);
      if(foldable)heading='<div class="kt-unit-heading">'+heading+'<button type="button" class="kt-unit-fold" data-action="kt-fold" data-node="'+esc(id)+'" aria-expanded="'+(!folded)+'" aria-controls="kt-reading-body-'+esc(id)+'" aria-label="'+(folded?'展开':'收起')+esc(nodeLabel(n))+'">'+(folded?'展开':'收起')+'</button></div>';
      var content='<p class="kt-unit-ref">印刷第 '+pages(n.printedPages)+' 页</p>'+nodeBody(n)+memoryCue(n,depth===1)+(n.explanation&&!guideFor(n)?'<details class="kt-explain"><summary>理解提示</summary><p>'+esc(n.explanation)+'</p></details>':'')+children.map(function(child){return unit(child,depth+1);}).join('');
      var html='<section class="kt-reading-unit" data-reading-node="'+esc(id)+'" data-ink-owner="node:'+esc(id)+'" data-reading-depth="'+Math.min(3,depth)+'"'+(foldable?' data-folded="'+folded+'"':'')+'>'+heading+(foldable?'<div class="kt-unit-content" id="kt-reading-body-'+esc(id)+'"'+(folded?' hidden':'')+'>'+content+'</div>':content)+'</section>';
      return v.excludeFromReading?'<details class="kt-source-fragment"'+(selected.id===id?' open':'')+'><summary>原扫描表格片段 · 不作为独立背诵条目</summary>'+html+'</details>':html;
    }
    var toc='<nav class="kt-unit-toc" aria-label="本节知识点"><div class="kt-section-fold-tools"><span>本节内容</span><button type="button" data-action="kt-fold-all" data-collapsed="true">全部收起</button><button type="button" data-action="kt-fold-all" data-collapsed="false">全部展开</button></div>'+main.map(function(id){return link({node:id,view:'outline'},esc(nodeLabel(db.nodes.get(id))),'kt-unit-jump');}).join('')+'</nav>';
    var comparisonData=verification(rootNode).verifiedComparison;
    return '<article class="kt-detail kt-continuous" id="kt-detail" data-reading-node="'+esc(rootNode.id)+'" data-ink-owner="node:'+esc(rootNode.id)+'">'+breadcrumb(rootNode.parentId)+titleMarkup(rootNode,'h2',false)+ref(rootNode.printedPages)+toc+nodeBody(rootNode)+memoryCue(rootNode,true)+main.map(function(id){return unit(id,1);}).join('')+(comparisonData?verifiedComparison(comparisonData):'')+dataset.comparisons.filter(function(c){return c.nodeIds.some(function(id){return allowed.has(id);});}).map(comparison).join('')+(related.length?'<div class="kt-related-entry">'+link({view:'questions',node:rootNode.id,question:'',scope:rootNode.id},'看这一节的题目 <span>'+related.length+' 题 ›</span>','kt-related-button')+'</div>':'')+'<div class="kt-reading-bottom">'+link({node:rootNode.parentId,view:'outline',question:''},'‹ 返回本章目录','kt-parent-link')+'</div></article>';
  }
  function detail(){
    var n=db.nodes.get(state.node),scopeIds=new Set(descendants(db,n.id)),related=questionList().filter(function(q){return q.nodes.some(function(id){return scopeIds.has(id);});}),children=db.children.get(n.id)||[],comparisons=dataset.comparisons.filter(function(c){return c.nodeIds.includes(n.id)||c.nodeIds.some(function(id){return children.includes(id);});});
    if(n.original&&sectionOf(db,n.id))return continuousReading(n);
    var directory=['book','chapter'].includes(n.kind),body='<div class="kt-body">'+(n.body||[]).filter(function(p){return p!==n.definition;}).map(function(p){return'<p data-ink-text>'+highlight(p,n.keywords)+'</p>';}).join('')+'</div>';
    var pathHTML=directory?'':breadcrumb(n.parentId||n.id);
    return '<article class="kt-detail'+(directory?' kt-index-page':'')+'" id="kt-detail" data-ink-owner="node:'+esc(n.id)+'">'+pathHTML+titleMarkup(n,'h2',false)+ref(n.printedPages)+(n.core?'<span class="kt-core-label">核心考点</span>':'')+(n.sourceQuestionId&&bankMap.has(n.sourceQuestionId)?'<section class="kt-source-answer">'+answerRenderer(bankMap.get(n.sourceQuestionId))+'</section>':'')+(n.definition?'<h3>教材定义 · 原文</h3><blockquote class="kt-definition" data-ink-text>'+esc(n.definition)+'</blockquote>':'')+(directory?'':body)+(n.studyNodeIds?.length?'<section class="kt-children"><h3>关联知识</h3>'+nodeLinks(n.studyNodeIds)+'</section>':'')+(children.length?'<section class="kt-children"><h3>'+(n.kind==='book'?'章节目录':n.kind==='chapter'?'本章目录':'下一级知识')+'</h3>'+nodeLinks(children)+'</section>':'')+(related.length?'<div class="kt-related-entry">'+link({view:'questions',question:'',scope:n.id},'看这一部分的题目 <span>'+related.length+' 题 ›</span>','kt-related-button')+'</div>':'')+(directory?'<details class="kt-explain kt-index-about"><summary>'+(n.kind==='book'?'教材信息':'本章概览')+'</summary>'+body+'</details>':'')+(n.core?'<details class="kt-explain"><summary>考点提示</summary><p>'+esc(n.core)+'</p></details>':'')+(n.explanation?'<details class="kt-explain"><summary>理解提示</summary><p>'+esc(n.explanation)+'</p></details>':'')+comparisons.map(comparison).join('')+'</article>';
  }
  function questionLinks(items){return items.map(function(item,i){var kind={term:'名词解释',short:'简答题',essay:'论述题'}[item.examType]||'参考作答';return link({view:'questions',question:item.id},'<span class="kt-question-number">'+(i+1)+'</span><span class="kt-question-copy"><span>'+esc(item.prompt)+'</span><small>'+kind+'</small></span><span class="kt-row-arrow" aria-hidden="true">›</span>','kt-question-link');}).join('');}
  function questionsView(){
    var scopeIds=new Set(descendants(db,state.scope)),query=state.query.trim().toLowerCase(),all=questionList().filter(function(q){return q.nodes.some(function(id){return scopeIds.has(id);})&&(!state.core||q.nodes.some(function(id){return !!db.nodes.get(id).core;}))&&(!query||[q.prompt].concat(q.answer||[],q.nodes.flatMap(function(id){var n=db.nodes.get(id);return[n.title].concat(n.keywords||[]);})).join(' ').toLowerCase().includes(query));}),q=all.find(function(q){return q.id===state.question;}),current=all.indexOf(q),scope=db.nodes.get(state.scope);
    if(!q)return '<section class="kt-question-list"><div class="kt-list-heading"><h2>'+esc(scope.title)+'</h2><p>'+all.length+' 道题 · 点开看答案</p></div><div class="kt-question-rows">'+(all.length?questionLinks(all):'<p class="kt-empty">没有符合筛选条件的题目。可在工具中清空筛选。</p>')+'</div></section>';
    var content=q.existing?answerRenderer(bank.find(function(x){return x.id===q.id;})):'<div data-ink-owner="'+(q.definitionVerbatim?'node:'+esc(q.nodes[0]):'question:'+esc(q.id))+'"><h3>'+(q.definitionVerbatim?'参考解释 · 教材原文':'参考答案 · 依据教材组织')+'</h3><div class="kt-answer">'+q.answer.map(function(p){return'<p data-ink-text>'+highlight(p,q.highlights||q.keywords)+'</p>';}).join('')+'</div></div>';
    var paging='<nav class="kt-question-nav" aria-label="题目切换">'+link({view:'questions',question:''},'‹ 返回题目列表','kt-question-back')+'<span>'+(current+1)+' / '+all.length+'</span><div>'+(current>0?link({view:'questions',question:all[current-1].id},'上一题','kt-question-step'):'')+(current<all.length-1?link({view:'questions',question:all[current+1].id},'下一题 ›','kt-question-step'):'')+'</div></nav>';
    return paging+'<article class="kt-detail kt-question-detail" data-ink-surface-owner="question:'+esc(q.id)+'"><p class="kt-kind">'+({term:'名词解释',short:'简答题',essay:'论述题'}[q.examType]||'参考作答')+'</p><h2>'+esc(q.prompt)+'</h2>'+(!q.existing?ref(q.printedPages):'')+(q.promptPages?'<p class="kt-note">题干见教材印刷第 '+pages(q.promptPages)+' 页。</p>':'')+content+(q.explanation?'<details class="kt-explain"><summary>作答思路</summary><p>'+esc(q.explanation)+'</p></details>':'')+(q.keywords?.length?'<details class="kt-explain"><summary>关键词核对</summary><p>'+q.keywords.map(esc).join(' · ')+'</p></details>':'')+'<section class="kt-used-nodes"><details class="kt-call-paths"><summary>知识出处 · '+q.nodes.length+'个知识点</summary>'+nodeLinks(q.nodes)+'<details class="kt-explain"><summary>完整所属路径</summary>'+q.nodes.map(function(id){return'<div class="kt-question-path">'+breadcrumb(id)+'</div>';}).join('')+'</details>'+link({view:'map',question:q.id},'在导图中查看','btn secondary small')+'</details></section>'+(q.existing?'<button class="btn secondary small kt-review-link" data-action="read-one" data-id="'+esc(q.id)+'">背诵这道题</button>':'')+'</article>'+paging;
  }
  function workspace(){var results=search(db,state.scope,state.query,state.core);if(state.view==='questions')return '<div class="kt-questions">'+questionsView()+'</div>';return(state.query||state.core?'<p class="kt-scope-note">找到 '+results.hits.size+' 个匹配节点</p>':'')+(state.view==='map'?mapView(results)+'<details class="kt-map-reading"><summary>展开当前知识点正文</summary><div class="kt-map-detail">'+detail()+'</div></details>':'<div class="kt-columns"><details class="kt-directory" open><summary>教材层级目录</summary>'+outline(results)+'</details>'+detail()+'</div>');}
  function render(currentBank,renderAnswer,mount){
    if(!dataset&&typeof globalThis!=='undefined'&&globalThis.KNOWLEDGE_DATA)init(globalThis.KNOWLEDGE_DATA);
    if(!db)return '<p>知识树正在准备。</p>';bank=currentBank||[];bankMap=new Map(bank.map(function(q){return[q.id,q];}));cacheQuestions();answerRenderer=renderAnswer;onMount=mount;configure(new URLSearchParams(location.hash.split('?')[1]||''));
    var settings='<div class="kt-settings-area"><div class="kt-search-row"><label class="kt-search-label" for="kt-search">搜索<input id="kt-search" type="search" value="'+esc(state.query)+'" placeholder="标题、知识点或题目"></label>'+button('core',state.core?'查看全部知识':'只看核心','aria-pressed="'+state.core+'"')+button('clear','清空筛选')+'</div>'+(state.view==='questions'?'':'<div class="kt-controls">'+button('expand-all','展开当前范围')+button('collapse','收起到主干')+'</div>')+'</div>';
    return '<div class="kt-app kt-quiet" data-view="'+state.view+'"'+(ui.focus?' data-focus="true"':'')+'><h1 class="visually-hidden">教材知识树</h1><div class="kt-heading-area">'+locationPicker()+'</div><div class="kt-controls kt-toolbar"><div class="kt-view-tabs" role="group" aria-label="知识树视图">'+[['outline','大纲'],['map','导图'],['questions','题目与答案']].map(function(p){return '<a href="'+href({view:p[0]})+'" class="btn '+(state.view===p[0]?'':'secondary')+' small"'+(state.view===p[0]?' aria-current="page"':'')+'>'+p[1]+'</a>';}).join('')+'</div>'+(state.view==='outline'?button('directory','目录','aria-pressed="'+(!ui.directoryHidden&&!ui.focus)+'" aria-label="显示或隐藏教材层级目录"'):'')+'<details class="kt-tools kt-popover"'+(state.query||state.core?' open':'')+'><summary>工具<span aria-hidden="true">⌄</span></summary><div class="kt-tools-panel"><div class="kt-tool-actions">'+button('focus',ui.focus?'退出专注':'专注阅读','aria-pressed="'+ui.focus+'"')+(ink()?ink().controls():'')+'</div>'+settings+'</div></details></div>'+(ink()?ink().toolbar():'')+(state.view==='questions'?'':readingNav())+'<div id="kt-workspace">'+workspace()+'</div><button type="button" class="kt-back-top" data-action="kt-top" aria-label="快速回到页面顶部" hidden><span aria-hidden="true">↑</span> 回到顶部</button></div>';
  }
  function mount(){
    syncUI();var board=document.querySelector('.kt-map');if(board)attachMapGestures(board);
    if(board){var target=board.querySelector('[data-map-id="'+(mapFocus||state.node)+'"]')||board.querySelector('.kt-map-node');if(target){var branch=(db.children.get(target.dataset.mapId)||[]).length>0;board.scrollLeft=Math.max(0,target.offsetLeft*state.scale-(branch?24:(board.clientWidth-target.offsetWidth*state.scale)/2));board.scrollTop=Math.max(0,target.offsetTop*state.scale-(board.clientHeight-target.offsetHeight*state.scale)/2);}}
    document.querySelectorAll('.kt-detail>.kt-breadcrumb').forEach(function(el){el.scrollLeft=el.scrollWidth;});
    var changed=lastMountedView!==state.view||lastMountedSection!==state.scope||lastMountedNode!==state.node,target=state.view==='outline'&&state.node!==state.section&&document.querySelector('[data-reading-node="'+state.node+'"]');
    if(target&&changed){for(var ancestor=target.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor.tagName==='DETAILS')ancestor.open=true;target.scrollIntoView({block:'start'});}
    else if(lastMountedView!==state.view||lastMountedSection!==state.scope)window.scrollTo(0,0);
    else if(state.view==='questions'&&lastMountedQuestion!==state.question||state.view==='outline'&&lastMountedNode!==state.node){var detail=state.view==='questions'?document.querySelector('.kt-question-nav,.kt-question-list'):document.getElementById('kt-detail');if(detail)detail.scrollIntoView({block:'start'});}
    lastMountedView=state.view;lastMountedSection=state.scope;lastMountedNode=state.node;lastMountedQuestion=state.question;mapFocus='';if(ink())ink().mount();syncTopButton();
  }
  function syncTopButton(){var b=document.querySelector('.kt-back-top');if(b)b.hidden=window.scrollY<300;}
  function setReadingFold(id,folded){
    var body=document.getElementById('kt-reading-body-'+id),node=db.nodes.get(id);if(!body||!node)return;
    body.hidden=folded;var unit=body.parentElement,b=unit.querySelector('[data-action="kt-fold"]');unit.dataset.folded=String(folded);
    if(b){b.textContent=folded?'展开':'收起';b.setAttribute('aria-expanded',String(!folded));b.setAttribute('aria-label',(folded?'展开':'收起')+nodeLabel(node));}
    if(folded)foldedReading.add(id);else foldedReading.delete(id);
  }
  function paint(){if(ink())ink().finish();var box=document.getElementById('kt-workspace');if(box){box.innerHTML=workspace();mount();if(onMount)onMount();}}
  function input(value){state.query=value;paint();}
  function handle(action,el){
    if(!action.startsWith('kt-')||!db)return false;
    if(action==='kt-top'){if(ink())ink().finish();window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return true;}
    if(action==='kt-fold'||action==='kt-fold-all'){
      if(ink())ink().finish();var folded=action==='kt-fold-all'?el.dataset.collapsed==='true':el.getAttribute('aria-expanded')==='true';
      if(action==='kt-fold')setReadingFold(el.dataset.node,folded);else document.querySelectorAll('.kt-continuous>.kt-reading-unit[data-folded]').forEach(function(unit){setReadingFold(unit.dataset.readingNode,folded);});
      saveUI();if(ink())ink().mount();if(folded){var anchor=action==='kt-fold'?el.closest('.kt-reading-unit'):document.querySelector('.kt-unit-toc');if(anchor)anchor.scrollIntoView({block:'start'});}syncTopButton();return true;
    }
    if(action==='kt-directory'){ui.directoryHidden=!(ui.directoryHidden||ui.focus);if(ui.focus)ui.focus=false;saveUI();syncUI();return true;}
    if(action==='kt-focus'){ui.focus=!ui.focus;saveUI();syncUI();if(!ui.focus)document.querySelector('.kt-tools>summary')?.focus();return true;}
    if(action==='kt-toggle'){var id=el.dataset.node;mapFocus=id;if(state.open.has(id))state.open.delete(id);else state.open.add(id);}
    else if(action==='kt-expand-all')descendants(db,state.scope).forEach(function(id){state.open.add(id);});
    else if(action==='kt-collapse'){state.open=new Set([state.scope]);path(db,state.node).slice(0,-1).forEach(function(n){state.open.add(n.id);});}
    else if(action==='kt-core'){state.core=!state.core;el.setAttribute('aria-pressed',String(state.core));el.textContent=state.core?'查看全部知识':'只看核心';}
    else if(action==='kt-clear'){state.query='';state.core=false;document.getElementById('kt-search').value='';var core=document.querySelector('[data-action="kt-core"]');if(core){core.textContent='只看核心';core.setAttribute('aria-pressed','false');}}
    else if(action==='kt-zoom'){var board=document.querySelector('.kt-map');if(board)setMapScale(board,el.dataset.reset?1:state.scale+Number(el.dataset.delta));return true;}
    paint();return true;
  }
  function syncUI(){
    var app=document.querySelector('.kt-app');if(!app)return;var wasFocused=app.classList.contains('kt-focused');app.classList.toggle('kt-directory-hidden',ui.directoryHidden||ui.focus);app.classList.toggle('kt-focused',ui.focus);document.body.classList.toggle('knowledge-focus',ui.focus);
    var directory=app.querySelector('[data-action="kt-directory"]'),focus=app.querySelector('[data-action="kt-focus"]'),tools=app.querySelector('.kt-tools');if(directory){directory.textContent=ui.directoryHidden||ui.focus?'目录':'收起目录';directory.setAttribute('aria-pressed',String(!ui.directoryHidden&&!ui.focus));}if(!ui.directoryHidden&&!ui.focus)app.querySelectorAll('.kt-directory').forEach(function(el){el.open=true;});if(focus){focus.textContent=ui.focus?'退出专注':'专注阅读';focus.setAttribute('aria-pressed',String(ui.focus));}if(tools){if(ui.focus)tools.open=true;else if(wasFocused)tools.open=false;}
  }
  function zoomAnchor(oldScale,newScale,scroll,point){return(scroll+point)/oldScale*newScale-point;}
  function setMapScale(board,value,point,world){
    var old=state.scale,next=Math.max(.35,Math.min(2.5,value)),p=point||{x:board.clientWidth/2,y:board.clientHeight/2},x=world?world.x*next-p.x:zoomAnchor(old,next,board.scrollLeft,p.x),y=world?world.y*next-p.y:zoomAnchor(old,next,board.scrollTop,p.y),canvas=board.querySelector('.kt-map-canvas'),size=board.querySelector('.kt-map-size');if(!canvas||!size)return;
    state.scale=next;canvas.style.transform='scale('+next+')';size.style.width=Math.ceil(parseFloat(canvas.style.width)*next)+'px';size.style.height=Math.ceil(parseFloat(canvas.style.height)*next)+'px';board.scrollLeft=Math.max(0,x);board.scrollTop=Math.max(0,y);var label=document.querySelector('.kt-scale-label');if(label)label.textContent=Math.round(next*100)+'%';
  }
  function attachMapGestures(board){
    if(board.dataset.gestures)return;board.dataset.gestures='true';var pinch=null,gesture=null,suppress=0;
    function center(touches){var r=board.getBoundingClientRect();return{x:(touches[0].clientX+touches[1].clientX)/2-r.left-board.clientLeft,y:(touches[0].clientY+touches[1].clientY)/2-r.top-board.clientTop};}
    function distance(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);}
    board.addEventListener('touchstart',function(e){if(e.touches.length===2){e.preventDefault();var p=center(e.touches);pinch={scale:state.scale,distance:Math.max(1,distance(e.touches)),world:{x:(board.scrollLeft+p.x)/state.scale,y:(board.scrollTop+p.y)/state.scale}};gesture=null;suppress=Date.now()+500;}},{passive:false});
    board.addEventListener('touchmove',function(e){if(e.touches.length>=2){e.preventDefault();if(pinch)setMapScale(board,pinch.scale*distance(e.touches)/pinch.distance,center(e.touches),pinch.world);suppress=Date.now()+500;}},{passive:false});
    function end(){if(pinch||gesture)suppress=Date.now()+500;pinch=null;gesture=null;}
    board.addEventListener('touchend',end);board.addEventListener('touchcancel',end);
    // Safari's native gesture events are a fallback for trackpads; touch events own two-finger gestures.
    board.addEventListener('gesturestart',function(e){e.preventDefault();if(!pinch)gesture={scale:state.scale};},{passive:false});
    board.addEventListener('gesturechange',function(e){e.preventDefault();if(!pinch&&gesture)setMapScale(board,gesture.scale*e.scale);},{passive:false});board.addEventListener('gestureend',end);
    board.addEventListener('wheel',function(e){if(e.ctrlKey){e.preventDefault();var r=board.getBoundingClientRect();setMapScale(board,state.scale*Math.exp(-e.deltaY*.008),{x:e.clientX-r.left,y:e.clientY-r.top});}},{passive:false});
    board.addEventListener('click',function(e){if(Date.now()<suppress){e.preventDefault();e.stopImmediatePropagation();}},true);
  }
  function linksFor(id){if(!db&&typeof globalThis!=='undefined'&&globalThis.KNOWLEDGE_DATA)init(globalThis.KNOWLEDGE_DATA);return db?.links.get(id)||[];}
  function footer(id){var ids=linksFor(id);if(!ids.length)return '';return '<details class="kt-bank-link"><summary>这道题在教材知识树中的位置</summary>'+ids.map(function(n){return link({section:sectionOf(db,n),node:n,view:'map',question:id},esc(path(db,n).map(function(x){return x.title;}).join(' › ')),'kt-bank-path');}).join('')+'</details>';}
  if(typeof document!=='undefined'){
    window.addEventListener('scroll',syncTopButton,{passive:true});
    document.addEventListener('toggle',function(e){if(e.target.matches?.('.kt-popover[open]'))document.querySelectorAll('.kt-popover[open]').forEach(function(other){if(other!==e.target&&!other.closest('.kt-focused'))other.open=false;});},true);
    document.addEventListener('click',function(e){document.querySelectorAll('.kt-popover[open]').forEach(function(panel){if(panel.closest('.kt-focused'))return;if(!panel.contains(e.target)||e.target.closest('[data-action="ink-toggle"]'))panel.open=false;});});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){var panel=document.querySelector('.kt-popover[open]');if(panel&&!panel.closest('.kt-focused')){panel.open=false;panel.querySelector('summary').focus();}}});
  }
  return{init:init,index:index,path:path,descendants:descendants,sectionOf:sectionOf,relevant:relevant,search:search,layout:layout,render:render,mount:mount,handle:handle,change:change,input:input,linksFor:linksFor,footer:footer,esc:esc,zoomAnchor:zoomAnchor};
});
