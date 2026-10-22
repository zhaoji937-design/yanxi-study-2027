/* All passages, situations, questions and model answers below are original practice material.
   This short bank is not a past paper, a complete mock examination, or a prediction. */
globalThis.ENGLISH_SOURCES = [
  {
    title: '研招网：2013 年英语（二）考试大纲（历史题型参考）',
    url: 'https://yz.chsi.com.cn/kyzx/en/201210/20121023/353891830.html',
    scope: '仅参考历史大纲中阅读理解、推断和词义理解等技能要求；不作为目标年度考纲依据。本文库的材料和答案均为原创，阅读篇幅为短篇专项练习。'
  }
];

(() => {
  const source = 'https://yz.chsi.com.cn/kyzx/en/201210/20121023/353891830.html';
  const library = {
    title: 'A Library of Useful Things',
    text: `When Brookfield Library began lending tools, its aim was not to compete with local shops. A survey suggested that many residents occasionally needed a drill or a carpet cleaner but could not justify buying one. By lending such items, the library hoped to reduce unnecessary purchases while making everyday tasks affordable for more households.

During the first months, staff celebrated every increase in loans. Yet the figures soon became difficult to interpret. Some items were borrowed repeatedly because they were easy to use, while others remained on shelves because their instructions were confusing. Later, loans of basic repair tools actually fell after volunteers taught residents how to maintain their own equipment. A lower number could therefore accompany a useful result.

The workshops also changed the nature of the service. People who had arrived simply to collect an object began exchanging advice with neighbours. Several returned as volunteers. These encounters did not appear in the lending totals, although participants often described them as the most valuable part of the programme. Access to equipment had become a starting point for learning rather than an end in itself.

None of this means that costs should be ignored. A rarely borrowed machine may be expensive to maintain, and staff time is limited. The library now reviews repair costs alongside information about who uses the service and what they gain from it. Its experience suggests that a public programme can be accountable without allowing its easiest measurement to define its purpose.`
  };
  const workplace = {
    title: 'The Silence Between Messages',
    text: `At a small design company, managers once treated a quick reply as evidence of commitment. Employees learned to keep messaging windows open even when they were working on difficult tasks. The habit made activity highly visible, but it told managers little about whether a proposal was thoughtful or a deadline realistic. Being available had quietly become a substitute for being effective.

The company tested a different arrangement. Teams set aside two periods each day for work without routine messages. A separate channel remained open for genuinely urgent problems. After six weeks, project completion times were broadly unchanged, while staff reported fewer interruptions. The trial did not show that communication was unnecessary; it showed that constant communication was not always the best way to coordinate work.

Not everyone welcomed the arrangement equally. New employees worried that delayed replies would look unfriendly, and workers supporting customers could not follow the same schedule as designers. These concerns revealed a weakness in the initial plan: freedom is difficult to use when people are unsure how others will interpret it. Teams therefore agreed on response expectations for different tasks and explained them to new colleagues.

Digital tools still play an important role. The question is which signals managers choose to reward. If an online status is treated as proof of contribution, employees will protect that status. If managers discuss finished work, obstacles and reasonable availability, the same tools can support cooperation without demanding continuous attention. Flexibility, in this sense, depends less on removing rules than on making useful rules clear.`
  };
  const opt = (...items) => items.map((text, index) => ({id: 'ABCD'[index], text}));
  const questions = [];
  const add = (id, data) => questions.push({
    id: `eng-${String(id).padStart(3, '0')}`,
    subject: '英语（二）',
    difficulty: 2,
    tags: ['原创模拟', '专项练习'],
    sourceNote: data.topic.startsWith('语言理解')
      ? '原创模拟｜词汇与句意专项训练，服务于阅读和翻译；不代表英语（二）正式试卷设有此独立题型。'
      : '原创模拟｜题型与技能参照研招网历史英语（二）大纲；非真题、非完整仿真卷。',
    sourceUrls: [source],
    ...data
  });

  add(1, {
    topic: '阅读理解·细节', type: 'single', groupId: 'eng-reading-library', passage: library,
    prompt: 'The tool-lending programme was originally intended to help residents who _____.',
    options: opt('wanted to start small repair businesses', 'needed certain equipment too infrequently to buy it', 'preferred buying used goods to visiting local shops', 'had difficulty finding professional repair services'),
    answer: ['B'],
    explanation: '首段说明居民只是偶尔需要某些工具，购买不划算，因此借用能够减少不必要的购买并降低日常任务的成本。B 同义改写了 occasionally needed 与 could not justify buying。A、C、D 都加入了原文没有说明的需求。'
  });
  add(2, {
    topic: '阅读理解·推理', type: 'single', groupId: 'eng-reading-library', passage: library,
    prompt: 'The fall in loans of basic repair tools is mentioned to show that _____.',
    options: opt('residents had lost interest in maintaining their equipment', 'workshops were less useful than the library expected', 'the library had reduced the range of tools it offered', 'a decline in a simple measure need not mean a poorer service'),
    answer: ['D'],
    explanation: '第二段把借用量下降与居民学会保养自己的设备相联系，说明单一数量指标下降也可能伴随积极结果。D 保留了 need not（未必）的限定。A 与居民学会保养的事实相反；B、C 无依据。不能从文中推导出“所有借用量下降都是好事”。'
  });
  add(3, {
    topic: '阅读理解·段落主旨', type: 'single', groupId: 'eng-reading-library', passage: library,
    prompt: 'According to paragraph 3, the workshops added value mainly by _____.',
    options: opt('turning the borrowing service into an opportunity for shared learning', 'training residents to replace the library’s paid staff', 'helping the library record every interaction more accurately', 'encouraging neighbours to purchase equipment together'),
    answer: ['A'],
    explanation: '第三段的关键变化是借工具的人开始交流经验、参与志愿服务，器材使用成为学习的起点。A 概括了这一层次。B 把“有人做志愿者”夸大为替代员工；C 与互动没有体现在借用统计中相反；D 未提及。'
  });
  add(4, {
    topic: '阅读理解·观点理解', type: 'single', groupId: 'eng-reading-library', passage: library,
    prompt: 'Which approach would the author most likely support when reviewing the programme?',
    options: opt('Keep every machine as long as one resident values it.', 'Judge success primarily by the total number of loans.', 'Consider financial costs together with access and learning outcomes.', 'Replace borrowing records with positive comments from volunteers.'),
    answer: ['C'],
    explanation: '末段同时强调维护成本、员工时间、使用者构成和实际收益，支持综合评价。C 包括资源投入和服务效果。A 忽略资源限制；B 继续把最易统计的数量当作首要目的；D 用另一单一信息替代原指标，也不符合综合评价思路。'
  });
  add(5, {
    topic: '阅读理解·作者态度', type: 'single', groupId: 'eng-reading-library', passage: library,
    prompt: 'The author’s attitude towards the tool-lending programme is best described as _____.',
    options: opt('enthusiastic about expansion regardless of expense', 'sceptical because its benefits cannot be counted', 'indifferent to outcomes beyond equipment use', 'supportive while recognising practical limits'),
    answer: ['D'],
    explanation: '作者肯定项目的可负担性、学习和社区价值，同时承认维护费用与人力有限，因此是“支持但认识到现实限制”。A 的 regardless of expense 被末段否定；B、C 都忽略作者对非借用量价值的肯定。'
  });

  add(6, {
    topic: '阅读理解·细节', type: 'single', groupId: 'eng-reading-workplace', passage: workplace,
    prompt: 'What was the main problem with the company’s original messaging habit?',
    options: opt('It made employees communicate less frequently than managers expected.', 'It encouraged visible responsiveness to stand in for meaningful contribution.', 'It prevented managers from knowing whether staff were online.', 'It allowed employees to decide which deadlines were realistic.'),
    answer: ['B'],
    explanation: '首段指出“随时在线、快速回复”逐渐成为有效工作的替代指标，却不能说明方案质量或截止时间是否合理。B 准确概括。A、C 与文中即时通信高度可见的状态相反；D 把原文用于说明指标局限的例子误读成赋权政策。'
  });
  add(7, {
    topic: '阅读理解·实验结论', type: 'single', groupId: 'eng-reading-workplace', passage: workplace,
    prompt: 'What conclusion is supported by the six-week trial?',
    options: opt('Reducing routine interruptions can be compatible with maintaining the existing pace of project completion.', 'An urgent channel eliminates the need to plan communication.', 'Project completion becomes faster whenever employees stop answering messages.', 'Staff reports alone establish a lasting rise in the company’s profits.'),
    answer: ['A'],
    explanation: '试验中项目完成时间大体不变，而员工报告的打断减少，可推出减少日常打断与维持既有项目完成速度能够并存。A 采用 can be compatible 的适度表述。B 超出结论；C 将“大体不变”改成“必然更快”；D 加入利润和长期因果结论，均无依据。'
  });
  add(8, {
    topic: '阅读理解·原因推断', type: 'single', groupId: 'eng-reading-workplace', passage: workplace,
    prompt: 'Why were some new employees uneasy about the new arrangement?',
    options: opt('They lacked the technical skills needed to use a separate channel.', 'They wanted customer-support staff to adopt the designers’ schedule.', 'They were uncertain how delayed responses would be viewed by colleagues.', 'They believed that written rules would remove all personal freedom.'),
    answer: ['C'],
    explanation: '第三段明确写到新人担心延迟回复显得不友好，并总结为不确定他人如何理解自己的行为。C 是直接同义转述。A 无关；B 把岗位差异的问题移给新人；D 与作者主张把有用规则讲清楚的内容混淆。'
  });
  add(9, {
    topic: '阅读理解·词义推断', type: 'single', groupId: 'eng-reading-workplace', passage: workplace,
    prompt: 'The word “signals” in the last paragraph most nearly refers to _____.',
    options: opt('technical commands that keep the communication system running', 'formal announcements that introduce a new company policy', 'warnings employees send when a project is likely to fail', 'observable signs used to judge an employee’s contribution'),
    answer: ['D'],
    explanation: '下文将 online status 与 finished work 等评价线索相对照，signals 指管理者用来判断贡献的外显信号。D 符合语境。A 是技术层面的字面义，B、C 范围太窄，且无法解释后文“奖励什么，员工就维护什么”的逻辑。'
  });
  add(10, {
    topic: '阅读理解·全文主旨', type: 'single', groupId: 'eng-reading-workplace', passage: workplace,
    prompt: 'Which of the following would be the best title for the passage?',
    options: opt('Why Digital Communication Should Be Removed from Offices', 'Making Flexible Work Effective Through Clear Expectations', 'The Financial Benefits of Hiring More Customer-Support Staff', 'How Faster Replies Help New Employees Win Promotion'),
    answer: ['B'],
    explanation: '全文从过度重视即时回复切入，介绍专注工作试验、岗位和新人差异，并落脚于明确合理的响应预期，因此 B 涵盖问题、调整及结论。A 与末段肯定数字工具相反；C 未讨论招聘和财务效果；D 把受到质疑的快速回复标准当成主旨。'
  });

  add(11, {
    topic: '语言理解·语境词义', type: 'single',
    prompt: 'Read the sentence and choose the meaning of “contingent on”.\n\nThe board approved the training proposal, but the approval was contingent on an independent review of its costs.',
    options: opt('unrelated to', 'a substitute for', 'dependent on', 'evidence against'),
    answer: ['C'],
    explanation: 'but 引出限制条件：董事会虽已批准方案，但该批准以独立成本审查为条件。contingent on 在此意为 dependent on。A 颠倒条件关系；B 表示替代；D 表示反对的证据，均不符句意。'
  });
  add(12, {
    topic: '语言理解·让步关系', type: 'single',
    prompt: 'Which statement best expresses the meaning of the sentence?\n\nEven when an online course is free, the time required to complete it may prevent people with unpredictable work schedules from taking part.',
    options: opt('Removing tuition fees does not necessarily remove every barrier to participation.', 'People with irregular work schedules generally prefer paid courses.', 'Free online courses take more time to complete than paid ones.', 'Course providers should require learners to follow identical work schedules.'),
    answer: ['A'],
    explanation: 'even when 引导让步：即使课程免费，所需时间仍可能成为工作安排不固定者的障碍。A 保留了“免费不等于没有一切障碍”的核心含义。B、C 无比较依据；D 不是原句结论。'
  });
  add(13, {
    topic: '语言理解·逻辑连接', type: 'single',
    prompt: 'Choose the word that best completes the sentence.\n\nThe researchers found a link between regular exercise and reported well-being. _____, the study’s design did not allow them to conclude that exercise alone caused the improvement.',
    options: opt('Similarly', 'Consequently', 'For example', 'However'),
    answer: ['D'],
    explanation: '前句报告相关关系，后句限制因果推断，属于转折和结论边界，故选 However。Consequently 表结果，Similarly 表相似，For example 表举例，均不能准确连接两句。题目考查语言逻辑，不把该虚构研究当作健康建议。'
  });
  add(14, {
    topic: '语言理解·长难句', type: 'single', difficulty: 3,
    prompt: 'What does the sentence suggest?\n\nWhat made the revised plan more acceptable was not that it demanded less effort, but that those expected to carry it out had been involved in deciding how the effort would be shared.',
    options: opt('The plan was accepted mainly because it removed demanding tasks.', 'Participation in allocating responsibilities helped make the plan acceptable.', 'Only the people who opposed the first plan were allowed to revise it.', 'Effort was shared equally because the revised plan required everyone’s agreement.'),
    answer: ['B'],
    explanation: '主语从句 What made... 后接 not that...but that...；真正原因是执行者参与了如何分担工作的决策，而不是付出减少。B 正确。A 恰好是被否定的原因；C 无依据；D 把“参与决定如何分担”偷换成“必须平均分担且全体同意”。'
  });

  add(15, {
    topic: '英译汉·公共服务', type: 'free', options: [], difficulty: 3,
    prompt: `Translate the following original passage into Chinese. Aim for accuracy, completeness and natural expression.\n\nA useful public service does more than make a resource available. It also helps people understand how that resource can fit into their lives. A community centre may install new exercise equipment, for example, yet attract few visitors if the instructions are difficult to follow or the opening hours conflict with local working patterns. Asking residents why they do not attend can therefore be as important as counting those who do. Such conversations may reveal barriers that are inexpensive to remove, including unclear signs or uncertainty about whether beginners are welcome. This does not mean that every suggestion can be adopted. It means that decisions about improvement should be informed by the experiences of people who use the service, as well as those who have not yet found a way to use it.`,
    answer: ['有价值的公共服务不只是提供某种资源，还应帮助人们了解这种资源如何融入自己的生活。例如，社区中心虽然安装了新的健身器材，但如果使用说明难懂，或开放时间与当地居民的工作安排冲突，仍可能鲜有人来。因此，询问居民为什么不来，可能与统计到访人数同样重要。这样的交流可能发现一些只需较低成本就能消除的障碍，例如标识不清，或人们不确定是否欢迎初学者。这并不意味着每一条建议都能采纳，而是说，改进决策既应参考现有使用者的体验，也应考虑那些尚未找到使用途径的人的经历。'],
    explanation: '自评要点：① does more than 译成“不只是”，不能译成“做得更多”；② yet 为转折；③ conflict with 指时间安排冲突；④ as important as 保留同等重要关系；⑤ those who have not yet... 指潜在使用者。参考译文仅展示一种表达，准确、完整、通顺的其他译法也可以。'
  });
  add(16, {
    topic: '英译汉·学习方法', type: 'free', options: [], difficulty: 3,
    prompt: `Translate the following original passage into Chinese. Aim for accuracy, completeness and natural expression.\n\nWhen learners review a familiar page, understanding may feel easier than it will be a week later, when the page is no longer in front of them. One way to discover this gap is to close the book and explain an idea in ordinary language. The explanation need not be elegant. Its purpose is to reveal what the learner can recall and where the reasoning becomes uncertain. Mistakes found in this process are not simply evidence of failure; they provide information about what deserves attention next. A short review can then focus on a missing connection rather than repeat everything. No single method suits every task, but a study routine becomes more useful when it includes opportunities to check understanding instead of relying entirely on the feeling of familiarity.`,
    answer: ['学习者复习熟悉的书页时，可能觉得理解起来很容易；但一周后书页不在眼前时，理解或回忆未必还会如此轻松。发现这种差距的一种方法，是合上书，用日常语言解释一个概念。解释不必十分漂亮，其目的是发现学习者能回忆起什么，以及推理在哪些地方变得不确定。这个过程中发现的错误不只是失败的证据，也能提示下一步应重点关注什么。随后，简短的复习便可聚焦于某个缺失的联系，而无须把所有内容重来一遍。没有一种方法适合所有任务，但如果学习安排包含检验理解的机会，而非完全依赖熟悉感，它就会更有帮助。'],
    explanation: '自评要点：① 首句比较“眼前复习的容易感”与“一周后脱离材料的表现”，不可漏掉时间和条件；② need not 是“不必”；③ where 引出推理不确定之处；④ not simply... 强调错误的诊断价值；⑤ rather than/instead of 保留取舍关系。本题不按关键词自动评分。'
  });
  add(17, {
    topic: '写作·应用文', type: 'free', options: [],
    prompt: `Your university running club is looking for volunteers for a community fun run. Write an email of about 100 words to Alex, an international student, to:\n1) invite Alex to volunteer;\n2) explain the main duties and arrangements;\n3) ask for a reply.\n\nUse “Li Ming” as your name. Do not write a real address.`,
    answer: [`Dear Alex,\n\nOur university running club will organise a community fun run next Saturday morning, and I am writing to invite you to join us as a volunteer.\n\nWe need volunteers to welcome participants, explain the route and hand out water at the finish. You do not need any previous experience, as a short briefing will be provided. Please arrive at the university’s south gate at 8 a.m.; the activity should finish before noon. Comfortable shoes and a bottle of water would be useful.\n\nWould you let me know by Thursday whether you are available? I would be delighted to work with you.\n\nBest wishes,\nLi Ming`],
    explanation: '自评要点：邀请目的清楚；职责和集合安排具体；有回复请求；称呼、结尾和署名合适；语气礼貌；控制在约100词。时间、地点可合理自拟但应一致。参考范文约107词（含称呼署名），不要求逐字复现，不作自动分数判定。'
  });
  add(18, {
    topic: '写作·图表作文', type: 'free', options: [], difficulty: 3,
    prompt: `Write an essay of at least 150 words based on the table below. Describe the main changes and give your comments.\n\nThe following data are fictional and provided only for this writing exercise. Respondents chose one main reason for using a community sports centre.\n\nMain reason | 2022 | 2025\nImproving physical fitness | 55% | 42%\nMeeting other people | 20% | 33%\nLearning a new sport | 15% | 18%\nOther reasons | 10% | 7%`,
    answer: [`The table compares the main reasons people gave for using a community sports centre in 2022 and 2025. Improving physical fitness remained the most common reason, although its share fell from 55% to 42%. By contrast, the proportion choosing social contact increased from 20% to 33%. Learning a new sport also became slightly more popular, while other reasons accounted for a smaller share.\n\nThese changes suggest that the centre may be serving a broader social role. People may increasingly value opportunities to meet neighbours as well as exercise. However, the table does not explain the causes of the changes, and it would be unwise to assume that users have become less concerned about their health. Each respondent selected only one main reason.\n\nIn my view, the centre should maintain reliable fitness facilities while offering welcoming group sessions for different abilities. It could also ask users what prevents them from joining activities. Combining the figures with such feedback would help the centre make better decisions.`],
    explanation: '自评要点：① 准确写出健身仍居首位但占比下降，社交增长明显，其他两项小幅变化；② 可写42%-55%=-13个百分点，不应写“下降13%”来指代百分点；③ 虚构表格仅给比例，没有样本量，不能推出总人数增减；④ 原因只能审慎推测，不可当作已证实事实；⑤ 评论应与数据相连，结构清晰且不少于150词。范文约164词。'
  });

  globalThis.ENGLISH_BANK = questions;
})();
