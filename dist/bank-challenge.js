/* Original advanced exercises. Fictional scenarios, not reports of actual studies. */
(function(root) {
  'use strict';
  var options=function(items){return items.map(function(text,i){return {id:'ABCD'[i],text:text};});};
  var politics=[];
  function pol(n,type,topic,prompt,choices,answer,explanation) {
    politics.push({id:'pol-hard-'+n,subject:'政治',topic:topic,prompt:prompt,type:type,options:choices?options(choices):[],answer:answer,explanation:explanation,difficulty:3,tags:['原创模拟','挑战专项','材料辨析'],sourceNote:'原创模拟｜以实践认识、矛盾分析、历史评价和德法关系等基础原理设计材料辨析；非时政押题、非官方试题。'});
  }
  pol('01','single','马原 · 实践与认识',
    '某地区试点一种训练场馆预约方案后，投诉数量下降。研究者随后发现，试点与非试点地区的人口结构、原有管理方式并不相同，且部分投诉渠道同时发生改变。就认识的检验与发展而言，最恰当的判断是：',
    ['试点已经产生积极结果，说明该方案在一切地区都具有同样效果','只要存在干扰因素，任何实践结果就都不能成为认识的依据','现有结果可以成为继续研究的依据，但结论的适用范围与因果解释仍需在具体实践中检验','认识具有反复性，因而无须区分不同解释与不同证据的优劣'],['C'],
    'C同时肯定实践证据的价值，并限定结论的条件与范围。A从局部结果跳到无条件普遍有效；B因证据有限而全盘否定实践；D把认识的反复发展误解成不能作任何判断。存在不确定性并不意味着所有解释同样合理。');
  pol('02','single','马原 · 具体问题具体分析',
    '一个项目筹建初期，场地不足是活动无法开展的关键制约；场地解决后，教师组织与课程质量成为决定活动效果的突出问题。下列认识最恰当的是：',
    ['既然工作重点发生变化，说明问题之间没有客观联系','矛盾的具体条件与发展阶段发生变化，要求重新分析关键制约并调整工作重点','解决最初的关键制约后，其余矛盾都会自动消失','只要存在多个问题，就不可能确定阶段性工作重点'],['B'],
    'B把工作重心调整建立在条件、阶段和具体矛盾变化之上。A否认联系，C把解决关键环节夸大为解决所有问题，D否认在复杂系统中分析主次的可能。题干没有充分条件要求把每个具体指标机械对应为唯一的哲学范畴。');
  pol('03','multiple','马原 · 真理与检验',
    '某评价小组将“多数人赞同”“暂时没有反例”和“在明确条件下经实践检验得到支持”混为一谈。对此，下列辨析正确的有：',
    ['多数赞同可以是社会评价信息，但不能取代认识是否符合客观实际的检验','对结论作出判断，应说明其成立条件和所依据的实践证据','只要多数成员持相同意见，该意见就必然具有客观真理性','现阶段检验存在范围和条件限制，并不等于否认客观真理和实践标准'],['A','B','D'],
    'A区分共识与真理，B强调条件与证据，D区分检验的具体历史条件与对实践标准的否认。C将投票或共识当作真理根据。题目并不否认专家意见有参考价值，而是反对用意见数量替代事实与实践。');
  pol('04','multiple','马原 · 普遍性与特殊性',
    '某教练学习一种一般训练原则后，发现照搬冠军运动员的具体训练量并不适合青少年。关于一般原则与具体方案，下列判断正确的有：',
    ['一般原则应通过分析具体对象、条件与阶段，转化为适宜的实施方案','承认个体差异意味着一般训练规律完全不存在','对典型经验的研究有助于认识规律，但不能省略对新情境的具体分析','普遍性与特殊性相联系，不能把某个个别方案直接当成所有对象的统一模板'],['A','C','D'],
    'A、C、D共同体现一般与具体的联系，以及反对机械照搬。B从差异推出没有规律，是相对主义式的割裂。具体分析并不取消一般原则，而是其有效运用的必要环节。');
  pol('05','multiple','史纲 · 历史贡献与局限',
    '材料一肯定辛亥革命结束了君主专制制度；材料二指出它没有从根本上改变近代中国的社会性质。理解二者关系，正确的有：',
    ['应区分政治制度的重要变化与整个社会性质的根本变化','没有完成全部历史任务，不能推出其毫无历史进步意义','只要承认革命的局限，就必须否认它结束帝制的贡献','可以在同一历史条件下分析其贡献与局限，避免用单一结果作全盘评价'],['A','B','D'],
    '两则材料讨论不同层次，可以同时成立。A区分层次，B防止以未完成全部任务抹杀进步，D体现历史的具体分析。C制造了贡献与局限之间的虚假二选一。');
  pol('06','multiple','思法 · 德法关系',
    '某服务机构称“我们以公益为目标，因此不必遵循既有程序”；另有人称“只要没有触犯法律，就没有任何道德责任”。对这两种观点，下列分析正确的有：',
    ['正当目标不能直接替代对行为边界、权限与程序的审视','凡是道德评价较差的行为，都应不经区分地认定违法','法律责任与道德责任有关联但不能等同，未违法并不自动排除道德评价','只要加强道德倡导，就能够取消必要的制度与程序保障'],['A','C'],
    'A反对用目标正当为手段和程序无限开脱，C区分责任层次。B把一切失德等同于违法，D把道德教育与制度保障割裂。题目考查原则辨析，不要求据材料臆断具体罪名或处罚。');
  pol('07','free','马原 · 认识发展与评价方法',
    '材料：一个学习平台推出新推荐方案后，刷题时长增加。管理者据此认定“学习能力已显著提高”，并只奖励能增加停留时长的改进。部分学生反映题目更重复、迁移运用反而变差。\n问题：运用实践与认识的关系，分析现有结论的不足，并提出继续检验和改进的思路。',
    null,[
      '一、刷题时长是观察到的行为变化，不能直接代替学习能力。实践为认识提供依据，但对依据的解释仍需要分析，不能把一个容易统计的指标等同于目标本身。',
      '二、现有材料支持进一步提出问题，却不足以排除题目重复、选择偏好和激励方式变化等解释。应结合具体条件明确研究对象、学习目标和结论适用范围。',
      '三、增加能够反映理解、保持和迁移运用的证据，在可比条件下观察变化，并同时收集实际使用体验。不同证据存在矛盾时，应调查原因而非只挑选支持原判断的数据。',
      '四、依据检验结果修正认识和方案，调整将停留时长作为唯一奖励依据的安排。将“提出认识—付诸实践—检验分析—修正并再实践”联结起来。',
      '五、承认结论有条件和认识会发展，不等于否认已有数据的价值，也不意味着不必区分好坏证据。'
    ],
    '高质量作答要明确“数据—指标—目标”并非同一层次，并将认识发展落实为具体的再检验步骤。仅背诵“实践决定认识”而不分析时长指标，不能充分回答材料。');
  pol('08','free','马原 · 矛盾分析方法',
    '材料：一支队伍同时面临经费紧张、训练安排不合理和成员积极性不足。负责人说：“既然经费是目前最突出的制约，就应停止其他一切工作；以后经费解决了，所有问题都会自行消失。”\n问题：结合矛盾分析方法评析，并说明如何理解突出重点与统筹兼顾。',
    null,[
      '一、承认阶段性关键制约是分析复杂问题的必要起点，但还须根据实际联系与条件判断，不能仅凭主观认定。',
      '二、突出重点不等于否认其他矛盾的作用。训练安排和积极性问题可能与经费有关，也可能有相对独立的原因；停止其他一切工作会破坏整体条件。',
      '三、应把资源优先用于关键制约，同时对影响整体运行的其他问题作必要安排，例如改进可立即优化的组织方式、沟通和任务分工。',
      '四、问题的主次地位可随条件和阶段改变。经费改善后，应重新诊断新的关键制约，不能预设所有问题会自动消失。',
      '五、将重点突破与系统检查结合，通过阶段效果评价调整工作安排，形成具体问题具体分析。'
    ],
    '答题要同时指出两个跳跃：从“突出”跳到“唯一”，从“一个制约解除”跳到“全部问题消失”。不宜脱离材料机械罗列哲学原理。');
  var official={
    practice:'https://news.12371.cn/2017/08/29/ARTI1504001411770206.shtml',
    contradiction:'https://news.12371.cn/2017/08/29/ARTI1504001209326173.shtml',
    history:'https://djyj.12371.cn/2021/12/07/ARTI1638840709196964.shtml',
    morality:'https://www.forestry.gov.cn/c/www/gwywj/97073.jhtml'
  };
  politics.forEach(function(item,i){item.sourceUrls=[i===4?official.history:i===5?official.morality:i===1||i===3||i===7?official.contradiction:official.practice];});
  root.POLITICS_BANK=(root.POLITICS_BANK||[]).concat(politics);

  var passageOne={
    title:'When a Measure Becomes a Destination',
    text:'A transport authority decides to assess its new bus service by the percentage of vehicles arriving within five minutes of the timetable. The measure is attractive because it is clear, cheap to collect and easy to compare across routes. Soon, however, managers discover several ways to improve it without making journeys more useful. They can lengthen scheduled travel times, remove stops that are difficult to reach punctually, or favour routes whose passengers have the fewest alternatives. None of these responses requires anyone to falsify a single record. A faithfully reported number can still produce a misleading account of success.\n\nThe difficulty is often described as a failure of measurement, as though a sufficiently sophisticated formula would restore the original purpose. Better measures certainly help, but this account misses something important. An indicator does not merely describe an organisation after its work is done. Once it is attached to rewards, it also helps determine which work will be attempted. A relationship that held while punctuality was simply observed may weaken when employees are instructed to maximise it. The system being measured has begun to respond to the measurement itself.\n\nOne proposed solution is to replace a single target with a balanced collection of indicators. The authority could add passenger satisfaction, journey duration and access to essential services. Yet a longer list is not automatically a better safeguard. Indicators may conflict, and assigning weights to them requires choices about whose interests matter. A route serving a small, isolated community can look inefficient in an average, even when losing it would impose a severe burden on those residents. The calculation cannot decide for itself whether that burden is acceptable.\n\nNor does abandoning numerical evidence solve the problem. Without a record that can be challenged and compared, managers may protect weak decisions with appealing stories. The alternative is to treat a measure as a reason to investigate rather than as a verdict. An unexpected improvement should prompt questions about what changed, who benefited and which effects remain outside the count. Front-line experience and passenger testimony can expose those omissions, provided that neither is treated as automatically more truthful than systematic data.\n\nThis approach makes evaluation less convenient. It asks institutions to explain their purposes and defend the trade-offs behind their conclusions. But inconvenience is not necessarily inefficiency. When a service exists to meet several human needs, a perfectly smooth ranking may conceal the very disagreements that responsible management ought to confront. The aim is not to find a number incapable of being questioned; it is to build a process in which questioning a number can improve the decisions made with it.'
  };
  var passageTwo={
    title:'The Explanation That Arrives Too Soon',
    text:'A student confronting an unfamiliar problem can now obtain a fluent explanation before making any serious attempt to solve it. This appears to remove a familiar obstacle to learning: the discouraging interval in which nothing seems clear. Yet an explanation can be easy to follow precisely because someone else has already decided which details matter. Recognising the steps in a completed argument is different from selecting those steps when the route is still unknown. The first experience can create confidence without supplying reliable evidence of the second ability.\n\nIt would be too simple to conclude that assistance inevitably weakens understanding. Worked examples can reveal structures that beginners would otherwise fail to notice. They can also spare learners from spending all their attention on a minor calculation while missing a larger principle. What matters is not whether help is available, but what intellectual activity remains for the learner after help has arrived. Copying a sequence, explaining why it works and deciding when it would fail are three different tasks, even if they concern the same solution.\n\nConsider a teacher who gives one group a model answer immediately and asks another group to predict an answer, identify an uncertainty and then consult the same model. The second group may complete fewer problems during the lesson. That difference alone cannot establish which group has learned more. A later task with an altered surface but the same underlying structure might be more revealing. So might a problem requiring students to explain why a familiar method is inappropriate. Both tests examine whether learners can discriminate between situations rather than merely reproduce a sequence.\n\nEven these assessments require care. A learner can perform poorly because the new task depends on background knowledge that the lesson never supplied. Conversely, repeated practice with supposedly unfamiliar questions can turn transfer itself into another rehearsed routine. Teachers therefore need several kinds of evidence and a clear account of what each can show. The lesson is not that assessment is impossible, but that no isolated performance should be asked to carry an unlimited claim about understanding.\n\nThe same reasoning applies to tools that generate answers. Their educational value will depend partly on the habits built around them. A prompt to compare two explanations may preserve more useful work for the learner than a demand for an instantly polished response. However, adding a ritual of reflection after every answer is not enough if students can satisfy it by repeating phrases they have just read. Assistance becomes productive when learners must make a choice that the supplied explanation does not make for them, and when subsequent feedback tests that choice. The teacher is still responsible for designing that encounter, even when the first explanation comes from a machine.'
  };
  var english=[];
  function eng(n,passage,prompt,choices,answer,explanation) {
    english.push({id:'eng-hard-'+n,subject:'英语（二）',topic:'阅读理解 · 长篇挑战',prompt:prompt,type:'single',options:options(choices),answer:[answer],explanation:explanation,difficulty:3,tags:['原创模拟','挑战专项','推理辨析'],passage:passage,groupId:n<=5?'eng-hard-measure':'eng-hard-explanation',sourceNote:'原创长篇阅读专项｜文章、情境与题目均为独立编写；强调推理、论证结构与近义干扰，非真题、非完整英语（二）试卷。'});
  }
  eng(1,passageOne,'What is the main purpose of the examples in paragraph 1?',
    ['To suggest that accurate records can coexist with decisions that undermine a service’s purpose.','To prove that punctuality data are usually fabricated by front-line employees.','To show that longer timetables necessarily provide passengers with a better service.','To explain why passengers generally prefer fewer stops to shorter journeys.'],'A',
    '首段刻意说明“不必伪造任何记录”，从而把问题定位在真实指标与服务目的可能偏离，而非数据造假。A保留此区分。B与原文相反；C、D把为了优化指标的手段误写成乘客普遍受益或偏好。');
  eng(2,passageOne,'The statement that the system “has begun to respond to the measurement itself” implies that _____.',
    ['indicators become invalid whenever workers know that information is collected','an observed relationship may change when incentives make the indicator a target','employee behaviour is determined entirely by the formula used to evaluate it','the authority must conceal all performance measures from its employees'],'B',
    '第二段的逻辑是“指标与奖励相连—改变尝试何种工作—原有观察关系可能减弱”。B准确保留may的限定。A将可能变化绝对化为必定无效；C把影响夸大为完全决定；D提出全文未支持的保密方案。');
  eng(3,passageOne,'Why does the author mention the route serving an isolated community?',
    ['To argue that passenger numbers should never be used in transport decisions.','To suggest that all routes should receive identical funding.','To demonstrate that combining indicators does not eliminate value judgments.','To establish that remote routes are always more important than urban ones.'],'C',
    '该例紧接“指标可能冲突，权重需选择谁的利益重要”，说明平均效率不能自行裁决小群体承受的代价。C概括论证功能。A否定一类数据，B主张一律同等资金，D把特定考虑变成普遍优先，均超过原文。');
  eng(4,passageOne,'Which response to an unexpected improvement would best fit the author’s proposal?',
    ['Replace numerical reports with passenger stories until agreement is reached.','Accept the improvement unless someone proves that the records were falsified.','Alter the weighting of indicators so that every route can improve its ranking.','Examine changed practices and excluded effects, using several kinds of evidence.'],'D',
    '第四段将指标作为调查线索，追问改变、受益者和未被统计的影响，并明确数据与经验都不能天然优先。D同时包含调查和多证据。A、B再次用单一来源作最终裁决，C继续围绕排名优化而未检验实际服务。');
  eng(5,passageOne,'In the final paragraph, “inconvenience is not necessarily inefficiency” chiefly serves to _____.',
    ['dismiss the practical costs of collecting detailed information','defend an evaluation process that exposes trade-offs instead of hiding them','claim that disagreement is sufficient evidence that a service is successful','recommend replacing clear decisions with indefinitely prolonged discussion'],'B',
    '作者承认过程不方便，但认为责任管理应解释目的、权衡与分歧；所以不方便未必等于低效。B对应这一辩护。A无视成本不成立；C把讨论条件变为成功标准；D将可质疑程序误读为无限拖延。');
  eng(6,passageTwo,'According to paragraph 1, following a fluent explanation may be misleading because it _____.',
    ['requires learners to master every detail before they can understand the argument','allows recognition of a finished route to be mistaken for independent problem solving','makes unfamiliar problems objectively easier than familiar ones','prevents learners from acquiring any useful knowledge from examples'],'B',
    '首段区分recognising steps与在未知路径中selecting steps，跟得上不等于会独立选择。B是同义转述。A增加“每个细节”的绝对要求；C偷换主观流畅与客观难度；D被第二段承认范例价值所否定。');
  eng(7,passageTwo,'Which feature of assistance does paragraph 2 treat as most important?',
    ['How quickly it eliminates all uncertainty for the learner.','Whether it is delivered by a teacher rather than a machine.','What the learner must still understand, explain or decide after receiving it.','How closely the final answer resembles the wording of a worked example.'],'C',
    '第二段直接提出what intellectual activity remains，并区分复制、解释和识别失效条件。C概括保留给学习者的认知工作。A正是作者担心的过早消除探索；B不是该段区分标准；D强调字句复现，层次较低。');
  eng(8,passageTwo,'What can be concluded about the two groups in paragraph 3?',
    ['The group completing more problems has necessarily learned the underlying structure better.','Requiring an initial prediction guarantees superior performance on every later task.','A lower completion count cannot, by itself, settle the question of comparative learning.','The groups must be assessed only by repeating exactly the problems used in the lesson.'],'C',
    '原文明确That difference alone cannot establish which group has learned more，C保留alone的限制。A将完成量等同于学习；B把一种可能有用的安排写成保证；D与后文改变表面和判断不适用方法的测试相反。');
  eng(9,passageTwo,'The examples in paragraph 4 qualify the proposed assessments by showing that _____.',
    ['all evidence of transfer must be rejected as unreliable','task performance can reflect factors other than the understanding being assessed','background knowledge matters only when students have received immediate assistance','a sufficiently unfamiliar question can reveal understanding without interpretation'],'B',
    '缺失背景知识会降低表现，反复练“迁移题”又可能造成套路化，说明单项表现有其他来源，需要限制解释。B准确。A与“not that assessment is impossible”相反；C添加only且改变比较对象；D正是作者反对的无条件推断。');
  eng(10,passageTwo,'Which activity best matches the final paragraph’s account of productive assistance?',
    ['Having students reproduce a polished answer without changing its sequence.','Requiring a reflection paragraph that can be completed with phrases copied from the explanation.','Removing examples so that students must discover every principle unaided.','Asking students to choose between approaches in a new situation and then testing the reasons for their choice.'],'D',
    '末段的核心是保留解释未替学生完成的选择，再用反馈检验选择。D兼有choice与testing。A只是复现；B是原文明确指出可能流于形式的做法；C误将有意义帮助与完全无帮助对立。');
  root.ENGLISH_BANK=(root.ENGLISH_BANK||[]).concat(english);
})(globalThis);
