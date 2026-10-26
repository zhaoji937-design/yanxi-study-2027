# 第三阶段验收说明

第三阶段包括入口合并、旧代码清理、备份提醒，以及教材定义原图按章分包。沿用奶油白、淡紫、浅绿和小猫样式，不改题目内容、印刷页码或手写锚点。

## 入口和旧链接

- 侧边栏保留“我的书桌、教材知识树、题库、模拟考试、复习”五个主要入口，其余功能放入“更多”。
- “题库”内切换“列表、展开答案、按章节”。切换时保留教材、章、节、题型、搜索与题目范围。可背当前范围，也可继续使用原作答练习。
- “复习”内切换“待复习、收藏”；到期回忆保留单独按钮，并说明它与混合待复习列表的区别。
- 旧 `#bank` 保持可用；`#materials` 转到展开答案，`#professional` 转到按章节。旧 `#mistakes`、`#favorites` 转到复习的相应标签，参数继续保留。
- 背题保存可选的 `reading.listHash`，刷新或恢复备份后，返回时仍保留题库视图和范围。`sanitizeReading` 已加入该字段；旧 `reading.origin` 的全部允许值、专业课 scope、知识树 knowledgeHash 继续接受，旧备份不需要新字段。

## 清理与备份

- 删除闲置 `mockPanel`、`mock-modal`、`confirm-mock` 及其 CSS；删除 `goal-form` 与 `settings.goal` 的运行逻辑。现用的在线模拟考试保留。
- 旧 settings/备份中有 goal 时忽略它，不阻止恢复。去掉主应用中政治、英语的旧筛选与来源；独立“词辨”“词芽”的文件、数据、存储和缓存保持。
- 导出完整备份时记录 `settings.lastExportedAt`；有学习记录且七天未导出时，书桌显示一条浅绿提示，可以导出或关闭。关闭后七天内不再提示；再次导出会刷新时间。
- 无导出记录时，以 `backupStartedAt` 保存学习记录中可核对的最早时间；没有时间戳的旧记录从首次检测时起算。旧备份含 exportedAt 时可作为上次导出时间。
- `lastExportedAt`、`backupStartedAt`、`backupReminderDismissedAt` 统一由 `T.cleanSettings` 校验，启动读取和恢复备份的 cleanSettings 白名单共用此函数。
- localStorage 键不变，完整备份仍为 `{app:'yanxi',version:1}`。新增字段均可缺省。新页面文字使用 `esc()`，状态更新使用 `textContent`。

## 原图加载和离线

- 原来的 `textbook-images.json` 改为小型 version:2 原图目录；这里只是图片资源索引格式升级，学习备份仍为 version:1。
- 353 张定义原图拆成39个章节包。没有原图的章不生成空包；跨题共用图片只保存一份，以索引定位。原图内容及键逐一校验，教材定义、参考文字与印刷页码没有改写。
- 首页只预存题目、答案、程序和小索引。显示某道定义题时，才加载它使用的章节包；关闭的答案不会先下载原图。
- “备份与设置 → 离线教材”可分别保存三本书，显示已保存图片数和完成状态；顶部持续显示题目与原图的保存概况。浏览过的章节原图也会保存。
- 下载部分失败时保留已完成包，重新点击可补齐；未保存的原图断网时显示明确提示，仍可看参考文字。原图保存与学习记录备份分别处理，备份不嵌入原图。
- 离线核心缓存为 `yanxi-offline-v22`，各教材缓存为 `yanxi-textbook-images-v1-school/physiology/training`。旧 v21 整包缓存会先迁移再清理；迁移失败保留旧缓存作为后备。独立英语缓存不参与清理。
- 安装未完成时不替换旧离线版本。已缓存的入口仅接受依赖与当前核心包相符的 HTML，避免后续更新中断时把离线入口换成依赖缺失的新页面。
- 分包有 SHA-256 校验和内容指纹文件名；`.gitattributes` 固定相关 JSON 的 LF，防止 Windows 换行转换改变文件校验值。
- 首次联网等待顶部显示“题目已保存”，按需要保存教材原图，之后可断网使用。浏览器或系统清理站点存储后需重新保存；学习记录仍建议保留导出的备份文件。

## 验证

```powershell
node scripts/check-site.cjs
node --test scripts/*.test.cjs
node scripts/review-flow-qa.cjs
node scripts/reader-recall-qa.cjs
node scripts/library-offline-qa.cjs
node scripts/library-upgrade-qa.cjs
git diff --check
```

浏览器脚本使用 Playwright/Chromium，可通过 `PLAYWRIGHT_MODULE`、`CHROME_EXECUTABLE` 指向本机安装。使用隔离浏览器，不操作使用者已有记录。截图与报告保存在忽略提交的 `qa-output/`。

已通过65项单元检查、现有第一/第二阶段 regression、全书134节 regression、fold audit 和界面 audit。界面 audit 只更新旧版单点标题和已折叠工具的定位，原导航焦点、触控、阅读字号、对比度、画笔与导图检查保留。检查390/768/1024宽度，既有 audit 另覆盖320与1366宽度；模拟触控不代替实体 iPad Safari 实测。

第三阶段专项覆盖三种题库视图、旧 URL 与旧 origin 恢复、筛选返回、复习标签、备份提醒和关闭、时间戳/草稿/列表上下文恢复、按需下载、按书缓存隔离、下载失败重试、未保存原图的文字后备和断网冷启动。v21→v22 升级测试确认353张图片无分包网络重下、旧草稿/回忆/进度/笔迹保留，三本书原图和知识树旧笔迹均能离线打开。

## 文件大小

以下为未压缩文件字节数，不是网络压缩传输量。完整机器可读报告为 [content/textbook-image-sizes.json](content/textbook-image-sizes.json)。

| 项目 | 字节 |
| --- | ---: |
| 拆分前：textbook-images.json | 13,588,483 |
| 拆分后：textbook-images.json 索引 | 40,565 |
| 学校体育学（15个包，69张图） | 2,108,390 |
| 运动生理学（16个包，181张图） | 6,955,505 |
| 运动训练学（8个包，103张图） | 4,527,179 |
| 拆分后：索引及所有原图包合计 | 13,631,639 |

首次原图索引由13.59 MB降为40.57 KB，减少约99.70%；完整保存所有图片时总量增加43,156字节（约0.32%），来自索引和分包元数据，没有以删除原图缩小总量。

每个新分包大小：

| 文件（位于 dist/） | 图片数 | 字节 |
| --- | ---: | ---: |
| `textbook-images/physiology/physiology-00-eb8d8f13e7fe.json` | 10 | 375,933 |
| `textbook-images/physiology/physiology-01-a0aa03b7baf3.json` | 15 | 567,234 |
| `textbook-images/physiology/physiology-02-b03383d6daf2.json` | 10 | 362,169 |
| `textbook-images/physiology/physiology-03-d3655c989029.json` | 16 | 654,359 |
| `textbook-images/physiology/physiology-04-edfb15b42d65.json` | 8 | 350,675 |
| `textbook-images/physiology/physiology-05-5daf5021e77f.json` | 8 | 360,331 |
| `textbook-images/physiology/physiology-06-110a0a077eb4.json` | 6 | 236,157 |
| `textbook-images/physiology/physiology-07-71f9e7d17e81.json` | 13 | 405,884 |
| `textbook-images/physiology/physiology-08-c459619e087f.json` | 17 | 599,952 |
| `textbook-images/physiology/physiology-09-657380f0fbd0.json` | 9 | 291,392 |
| `textbook-images/physiology/physiology-10-794cdce243ca.json` | 27 | 977,690 |
| `textbook-images/physiology/physiology-11-d558288d7ac9.json` | 14 | 559,249 |
| `textbook-images/physiology/physiology-12-73fb4e59c03b.json` | 10 | 460,429 |
| `textbook-images/physiology/physiology-13-b8c86d10da66.json` | 2 | 85,761 |
| `textbook-images/physiology/physiology-14-7e25ca60500c.json` | 6 | 188,117 |
| `textbook-images/physiology/physiology-15-3eee339a3a58.json` | 10 | 480,173 |
| `textbook-images/school/school-01-86f7a8e4de04.json` | 1 | 53,256 |
| `textbook-images/school/school-02-814aec237e3c.json` | 5 | 142,088 |
| `textbook-images/school/school-03-0c21c67d1499.json` | 6 | 154,825 |
| `textbook-images/school/school-04-f0f5325351b8.json` | 3 | 103,954 |
| `textbook-images/school/school-05-1dbea173b793.json` | 3 | 108,030 |
| `textbook-images/school/school-06-a4b028778d29.json` | 3 | 69,466 |
| `textbook-images/school/school-07-101690069a63.json` | 14 | 363,737 |
| `textbook-images/school/school-08-42022b0a1495.json` | 7 | 280,610 |
| `textbook-images/school/school-09-5fcbb7c7d479.json` | 1 | 29,972 |
| `textbook-images/school/school-10-d3de5a9c070d.json` | 1 | 36,004 |
| `textbook-images/school/school-11-9accbb40a359.json` | 11 | 310,026 |
| `textbook-images/school/school-12-2aa92ae3b587.json` | 1 | 46,528 |
| `textbook-images/school/school-13-27949c95bf66.json` | 4 | 97,575 |
| `textbook-images/school/school-14-4c1001bd278f.json` | 6 | 184,197 |
| `textbook-images/school/school-16-0e05a1b12b45.json` | 3 | 128,122 |
| `textbook-images/training/training-01-612fb045ed78.json` | 23 | 1,081,194 |
| `textbook-images/training/training-02-4c97c80db77c.json` | 6 | 299,413 |
| `textbook-images/training/training-03-24090b24adc6.json` | 24 | 913,715 |
| `textbook-images/training/training-04-cbfc5f636c48.json` | 11 | 453,454 |
| `textbook-images/training/training-05-c456253b2deb.json` | 14 | 605,805 |
| `textbook-images/training/training-06-8fc68b78505f.json` | 9 | 437,632 |
| `textbook-images/training/training-07-f919f82c0aeb.json` | 8 | 395,383 |
| `textbook-images/training/training-08-ebbb55b97d9b.json` | 8 | 340,583 |
