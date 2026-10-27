# 手动评阅轻量批改验收说明

本次用使用者附件 PART START–PART END 的函数实现手动通道轻量批改。自动评阅通道继续使用原来的请求、签名、答卷指纹、严格 JSON 评分校验和报告。

## 改动文件

- `dist/exam-engine.js`：并入并导出 halfStep、clampScore、quickScore、buildLitePrompt、parseReply、LITE_SOURCES、makeLite、validateLite。没有替换原自动评阅函数。
- `dist/mock-exam.js`：手动报告改为“自己批改 / 让 GPT 批改”两卡；新记录按 kind:lite 显示；删除评分 JSON 文件导入、修正请求和打开 GPT 的按钮。启动读取、validateBackup 和 reload 共用新旧评分分支。
- `dist/mock-exam.css`：每题折叠、自评并排/手机上下排、快捷档位、数字框、识别结果表与纯文字点评样式。
- `dist/index.html`、`dist/latest.html`：考试脚本和样式统一 v=3，离线控制为 offline.js?v=8。
- `dist/offline.js`、`dist/sw.js`：核心缓存更新为 yanxi-offline-v24，原图和独立英语缓存保留。
- `scripts/exam-lite.test.cjs`、`scripts/exam-lite-fixtures.cjs`：纯文字解析、计分、记录校验与新旧混合读取/恢复/reload 测试及夹具。
- `scripts/exam-lite-qa.cjs`：手机/平板自评、复制受限、任意回复手填、纯文字转义、混合备份、自动通道的浏览器检查。
- `scripts/exam-lite-upgrade-qa.cjs`：从上一实际发布版57bc332的 v23/考试模块 v2 升级为 v24/v3，检查旧成绩、旧订正和缓存。
- `scripts/exam-handoff-qa.cjs`、`scripts/exam-handoff-upgrade-qa.cjs`：原命令保留为新专项测试的入口，旧 JSON 向导的界面测试已被替代。
- `scripts/library-offline-qa.cjs`、`scripts/library-upgrade-qa.cjs`、`scripts/reader-recall-qa.cjs`、`scripts/review-flow-qa.cjs`：同步当前缓存目标 v24。
- `README.md`、本说明：当前流程、兼容规则和验收步骤。

## 自己批改

交卷后默认展开自评卡，9道题各有折叠块。展开后对照原始作答和每个评分点的 label/expected；宽屏左右并排，手机上下排。可以点“没写到 / 写到一部分 / 写全了”，也可直接输入分数，统一到0.5分步长并限制在本点满分内。

各评分点默认0分，未评分的要点按0分计入，页面直接显示这一规则。完成后按评分点相加、再按9题相加，立即保存自评分。自评分由使用者自行核对，不伪称 AI 或官方阅卷。

## 让 GPT 批改

此卡默认折叠。复制的是纯文字题目、本人作答、每项评分参考和教材印刷页码；不再要求 JSON、试卷号或答卷指纹。点击复制不联网探测、不跳页；浏览器拒绝自动复制时展开全文并全选，留在研习页手动复制。

页面只提示到已经打开的任意 GPT 对话中粘贴发送，没有外站打开按钮或 window.open。返回后粘贴回复、点击“识别分数”，显示9行可编辑分数框。未识别的留空、标红，可直接手填；不会因回复格式不符合要求而拒绝点评。保存前仍需填完9题的分数，缺少时提示具体题号。

解析优先每题第一次出现的得分，支持全半角数字、斜杠和小数点；不采用回复写的满分分母，也不采用声称的总分。每题以试卷满分为上限，总分只由研习相加。总评后的再次提及不当作新评分。用户可以修改所有识别结果，再确认保存。

回复原文保存到 reportText，逐题点评保存为 comment。结果页显示来源、总分、9题得分表、总评/完整原文及每题点评。所有本人/GPT文字均经 esc，原文用 pre-wrap 显示，不解析 HTML 或 Markdown。依附件容量规则，回复最多60000字符、逐题 comment最多6000字符；页面标明回复上限。

## 三处兼容与安全保存

- 启动读取 localStorage：新 lite 评分走 validateLite；旧 JSON 评分继续走 validateGrade。
- 恢复模拟考试备份：validateBackup 使用相同分支，旧记录、新自评、GPT文字评分可以混合。错误备份不替换当前记录。
- 完整备份恢复后的 reload：继续通过 validateBackup 重新读取，包含相同分支；恢复完成后重置临时编辑状态。

完整备份、模拟考试备份及 localStorage外层继续为 version:1，原键 yanxi-mock-exams-v1 保留。新评分本身是 app:yanxi-exam-grade-lite、version:1、kind:lite；只有 manual 通道接收它，auto继续严格 JSON 评分。

保存失败时回滚内存里的 grade/status/provenance，保留界面分数和回复，不能显示未保存的成功成绩。尚未完成的自评/回复编辑只保留在当前页面内存中，完成保存后才随记录与完整备份保留。原始答案和已有订正不改写。

clampScore 将空值/空字符串保留为“未填写”，避免 Number('') 被误判0分。validateLite 还核对题号集合、单题满分、单题小计和总分，防止损坏的备份混入。

## 检查

```powershell
node scripts/check-site.cjs
node --test scripts/*.test.cjs
node scripts/exam-lite-qa.cjs
node scripts/exam-lite-upgrade-qa.cjs
node scripts/library-offline-qa.cjs
node scripts/reader-recall-qa.cjs
node scripts/review-flow-qa.cjs
git diff --check
```

已通过77项单元检查、轻量批改专项流程、v23→v24升级、原有背题/复习/离线 regression、界面及折叠 audit、全书134节导航。

专项覆盖 parseReply、makeLite、validateLite、空分数与0分的区别、异常分母/总分、重复题号、混合本地读取、两类备份恢复及 reload。浏览器覆盖390/768/1024宽度、折叠、44px以上按钮/数字框、原文转义、手动复制备用、自评与GPT评分落盘、订正刷新、存储失败回滚、旧缓存升级。沿用界面/折叠audit和全书导航回归。

与上一发布版独立比较确认，自动评阅引擎的 instructions、packet、schema、validateGrade、createPaper、publicPaper、paperFromIds、digest、answersFor 函数未改；自动联网锁定、检查点、服务器截止时间仍经原HTTP流程测试。测试使用夹具，不向真实 GPT 发消息，不调用计费模型。触控与尺寸检查使用Chrome模拟，实体Safari仍可按下面步骤验收。

## 手动验收

1. 联网打开最新模拟考试并刷新，选择“自己批改 / GPT 文字批改”。旧待评阅卷也可以直接打开，不必重考。
2. 交卷后确认有两张卡，自评卡默认展开。展开一题，试三个快捷档位和数字框，完成批改后检查总分；刷新后成绩和订正应保留。
3. 在另一份待评阅卷展开“让 GPT 批改”，点复制，研习应留在当前页；复制受限时展开全文手动复制。到你已经打开的 GPT 对话粘贴发送，不需要通过研习再打开或登录。
4. 粘贴它的回复，点识别。也可故意粘贴一段没有分数的文字：9题应留空标红，补填即可；修改已识别分数后保存，检查总分按题目相加，点评原文保留。
5. 打开以前的 JSON 评分卷，检查旧分数、反馈和订正。导出含新旧记录的完整备份并恢复，确认都能打开且version仍为1。
6. 已完成首次离线保存后，断网进行手动考试、刷新、作答和交卷。联网更新后旧浏览器应加载考试模块v3、缓存v24，无需清除站点数据。
