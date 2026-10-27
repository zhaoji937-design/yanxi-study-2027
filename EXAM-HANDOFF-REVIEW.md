# 模拟考试网页版转交修复

依据使用者提供的 `mock-exam-handoff-reference.js` 参考实现逐项接入，没有整文件替换。考试记录及完整备份仍为 version:1，localStorage 键未改；题目 ID、评分标准版本、原始答案指纹及既有记录结构保留。

## 改动文件

- `dist/exam-engine.js`：合并 norm、quoteFound、宽容的 parseJSON、slimPacket 和 fixRequest；更新两处原句校验及题号/完整引用错误信息，修正 missing 字段说明。原 packet 保留给自动评阅 API 使用。
- `dist/mock-exam.js`：报告页内常驻三步向导；删除旧 handoff 函数及 handoff/import-open 动作；复制与打开页面分离。失败时展开、选中原文，修正请求复制也有手动备用文本框。评分导入失败原地显示，保留粘贴内容，保存失败回滚评分状态。
- `dist/mock-exam.css`：奶油色三步卡片、成功对勾、文本框、文件选择及可换行错误提示，手机按钮至少44px高。
- `dist/index.html`、`dist/latest.html`：同步引用 `exam-engine.js?v=2`、`mock-exam.js?v=2`、`mock-exam.css?v=2` 和 `offline.js?v=7`。
- `dist/offline.js`、`dist/sw.js`：核心缓存升为 `yanxi-offline-v23`，教材/英语缓存继续保留。按书保存失败提示不再被后台状态检查立即覆盖，重试时清除。
- `scripts/exam-handoff.test.cjs`：引用规整、省略号、编造引用、两处校验错误定位、带说明/代码块 JSON、材料精简和修正请求测试。
- `scripts/exam-handoff-qa.cjs`：三步向导、复制与备用方式、导入失败保留输入、文件导入、存储失败回滚、手动离线与自动联网通道的浏览器测试。
- `scripts/exam-handoff-upgrade-qa.cjs`：从实际 v22/考试模块 v1 更新至 v23/v2，检查旧考试、成绩、订正、学习记录及原图/词库缓存。
- `scripts/measure-exam-handoff.cjs`、`content/exam-handoff-size-report.json`：可重现的精简前后字符数。
- `scripts/exam.test.cjs`：旧引用错误断言改用新的具体提示；既有服务签名、超时、评分和未配置拒绝检查保留。
- `scripts/library-offline-qa.cjs`、`scripts/library-upgrade-qa.cjs`、`scripts/reader-recall-qa.cjs`、`scripts/review-flow-qa.cjs`：仅同步当前目标缓存号 v23。
- `README.md`、本说明：更新操作步骤、通道联网规则及验收方法。

## 交卷后的三步

1. **复制答卷**：剪贴板写入直接由点击触发，之前没有联网探测或打开新窗口。成功时显示对勾和下一步；失败时在原页展开全文、聚焦并全选，显示手动复制提示。
2. **去 ChatGPT 粘贴并发送**：只有使用者点击“打开 ChatGPT”链接时才新开 `https://chatgpt.com/`。仍需自行粘贴并发送。
3. **回到研习，粘贴回复**：整段回复或 JSON 代码块均可，也可选择 JSON 文件。校验失败不会重绘清空文本框；提示包含题号、题目 ID 和找不到的完整引用，并提供可复制的修正请求。校验、保存通过后才显示分数与反馈。

输入中的 HTML 均按文字显示；新 HTML 文本使用 esc，交互状态使用 textContent。向导状态和未导入的回复只保留在本页面内存中，不增加记录字段，也不写入备份；刷新会清除尚未导入的回复，已保存的答卷、成绩和订正继续保留。

## 校验边界

- 引用按 NFKC 统一全半角，统一常见引号，忽略空白、换行和零宽字符。省略号分段后，每段仍须在规整后的本题答卷中真实出现；不以同义改写或语义相似代替原句核对，编造引用仍被拒绝。
- 保留试卷号、答卷 SHA-256、评分标准版本、9题覆盖、评分项覆盖、分值范围、0.5分步长、空白题零分、总分相加检查。
- JSON 可带前后说明和代码块；不是任意文字评分解析器。复制不完整或缺少必填字段时仍需让 ChatGPT 返回完整结果。

## 联网和旧数据

- manual 通道不再以联网状态限制开考、答题或交卷。倒计时、到时锁卷、自动保存及刷新恢复继续工作。打开 ChatGPT 在线评阅时仍需联网。
- auto 通道的联网探测、断网锁定、服务器检查点、签名提交和截止时间保持原逻辑；自动 API 的 packet 结构未精简。
- 向导也可用于原有“已交卷待评阅”记录。旧版已评分记录的分数、反馈与订正继续显示；进行中手动考试更新后可继续离线作答。
- 更新后联网重新打开 latest.html，等待顶部显示题目已保存，必要时再刷新一次。无需清除站点数据；核心缓存换为 v23，原图和独立英语缓存继续保留。

## 字符数

对同一份综合9题、固定 seed=37、同一试卷号和指纹测量；每题作答使用完整参考答案，答案共2,156字符。这是测试夹具，不是使用者真实答卷。按 JavaScript string.length 统计，不能当作 token 数或接口费用。

| 材料 | 修改前 | 修改后 | 减少 |
| --- | ---: | ---: | ---: |
| 完整转交文本（含指令和格式要求） | 19,145 | 11,898 | 7,247（37.85%） |
| 其中的试卷 JSON | 16,627 | 9,390 | 7,237 |

已用 Git 中实际旧版 e133524 的 handoff 函数独立核对修改前计数。精简仅移除与 rubric.expected 重复的 referenceAnswer、压缩 JSON 缩进及页码结构，逐题评分参考要点仍完整保留。

## 验证方法

```powershell
node scripts/check-site.cjs
node --test scripts/*.test.cjs
node scripts/measure-exam-handoff.cjs
node scripts/exam-handoff-qa.cjs
node scripts/exam-handoff-upgrade-qa.cjs
node scripts/library-offline-qa.cjs
node scripts/reader-recall-qa.cjs
node scripts/review-flow-qa.cjs
git diff --check
```

已通过71项单元检查、专项浏览器流程、v22→v23升级、现有背题/复习/离线 regression、全书134节导航及界面/折叠 audit。

浏览器脚本使用隔离的 Playwright/Chromium；PLAYWRIGHT_MODULE 和 CHROME_EXECUTABLE 可指定本机路径。检查390/768/1024宽度；沿用的界面 audit 和 fold audit 另检查320–1366宽度、导航、导图、折叠和笔迹。剪贴板允许/拒绝、ChatGPT 页面与自动评阅传输使用测试替身，未发送真实 ChatGPT 消息或调用计费 API；实体 iPad/Safari 仍需使用者按下列步骤验收。

## 手动验收

1. 联网打开新版模拟考试，刷新一次；选择“现有 ChatGPT 网页评阅”。可断网开始一份模拟，填写后刷新，检查作答与截止时间保留，继续作答并交卷。
2. 交卷后应直接看到三个步骤。点击“复制答卷”，研习应留在当前页面，按钮显示已复制；复制受限时展开全文后手动复制。
3. 点击第二步“打开 ChatGPT”，在官网粘贴发送。研习不自动发送内容。等待回复完整，复制回复，再回第三步粘贴或选 JSON 文件。
4. 可先粘贴一段无效文字测试：应原地提示错误，输入内容不消失。复制修正请求发回同一 ChatGPT 对话，再粘贴其完整修订结果。
5. 正确导入后检查逐题得分、扣分理由、漏点、错误和修订答案；填写订正并刷新确认保存。
6. 打开以前的待评阅卷和已评分卷，检查三步向导及旧成绩；导出完整备份确认 version 仍为1。无需删除旧记录或清理站点数据。
