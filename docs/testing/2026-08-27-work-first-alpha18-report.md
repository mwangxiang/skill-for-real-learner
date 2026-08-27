# DSH Work & Learning alpha.18 测试报告

> 日期：2026-08-27（Asia/Shanghai）  
> 基线：官方 DeepSeek Harness `0.1.1-rc.2` / `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`  
> 最终包：`@mwangxiang/dsh-visual-learner@0.1.0-alpha.18`

## 1. 本轮目标

验证 Spec v4 的第一个工作优先垂直切片：

```text
描述真实工作 → AI 生成真实 PPTX 初稿 → 集中反馈生成新版
→ 接受终稿 → 自动沉淀资产 → 可选学习
```

学习不得成为生成或接受成品的前置关卡。

## 2. 包信息

- tgz：`release/mwangxiang-dsh-visual-learner-0.1.0-alpha.18.tgz`
- SHA-256：`7FCDBF8609C1481A28066F5EE25002CE4289742D531616BA02DCDD6276DA1193`
- 大小：306,003 bytes
- 文件数：60
- Profile：`E:\DSH-Visual-Learner-Trial-20260825\native-official-home`
- Web：`http://127.0.0.1:3080/`
- 测试工作区：`E:\编程缓存\company-PC\王相的工作区\dsh-native-frontend-sandbox`

## 3. 自动化结果

- TypeScript `--noEmit`：通过。
- Vitest：13 个测试文件、38 项测试全部通过。
- Host build：通过；`pptxgenjs` 与 ZIP 依赖被打入 Host Bundle。
- Client build：通过。
- WorkProject 测试覆盖：单一事实源、operationId 去重、PPTX/Markdown 真实文件、7 页 OOXML、资产文件、模型输出缺页时的安全占位。
- 旧 M2 Client contract 已改为断言新的三步工作流，不再要求旧的“提交表现 → 证据结果页”。

## 4. 官方 DSH 真实闭环

测试输入使用内置普通用户示例：

> 做一份给部门主管的 7 页项目汇报。重点说明项目进度、时间与资源投入、已完成工作和当前困难，希望争取技术支持与资源倾斜。最好可以直接发送，合格版本只需微调。

### 4.1 安装与原生 UI

- Profile manifest 精确指向 alpha.18 tgz。
- Profile 内安装版本为 `0.1.0-alpha.18`。
- 已安装 `lib/index.js`、`lib/client.js` 与构建目录 SHA-256 一致。
- 3080 正常监听。
- 插件只增加 Header Action 与非模态右抽屉；原生侧栏、会话、composer、权限和模型控件仍存在。
- 910px 视口下抽屉 455px；`aria-modal` 不存在；原生 composer 可见。

### 4.2 v1 初稿

- 信息足够，0 个 Grill 问题，直接生成。
- 页面进入“第 2 步 · 看 AI 做出的初稿”。
- 生成 7 页预览、核心论点、可逆假设、PPTX 下载与 Markdown 下载。
- 真实文件：
  - `deliverables/XX项目阶段汇报：进度、资源投入与所需支持-v1.pptx`，118,020 bytes；
  - 同名 `v1.md`，5,841 bytes。
- PPTX magic 为 `PK`，ZIP 中存在 7 个独立 `ppt/slides/slideN.xml`。
- 缺少的真实数据全部以“待补充”占位，没有捏造项目事实。

### 4.3 集中反馈与 v2

测试反馈：

> 把标题中的“XX项目”改成“学习插件项目”，并让第 1 页的资源请求更具体；其他结构保持不变。

结果：

- v2 标题正确改为“学习插件项目阶段汇报：进度、资源投入与所需支持”。
- 第 1 页资源请求增加了技术支持角色、投入时长、人力/算力、环境/权限和确认时限等可编辑占位。
- v1 保留，v2 新增；没有覆盖旧文件。
- v2 PPTX 118,288 bytes，v2 Markdown 6,128 bytes。
- 重启 Harness 后首页正确恢复 v2、7 页和“继续完成”。

### 4.4 接受、资产与可选学习

- 点击“接受这一版”后项目进入 `completed / distilled`。
- 自动生成 `assets/个人汇报方法.md`，1,295 bytes。
- 页面显示识别出的偏好和交付检查清单。
- 页面最后才显示一个高价值学习点，并同时提供：
  - “把这个问题学透”；
  - “先结束，保留成果”。
- 实测项目状态：`learning.offered=true`、`learning.selected=false`；不选学习仍完整完成。

测试项目：

`E:\编程缓存\company-PC\王相的工作区\dsh-native-frontend-sandbox\work-projects\project-68be0dec-0c73-4de7-9738-87011f8f27e2`

## 5. 本轮发现并修复的问题

### 5.1 一次性返回完整 PPTX 会冲击 Web 连接

初版下载 RPC 把整个 118 KB PPTX 转成单个 base64 响应。真实浏览器测试时出现连接重试，且下载事件无法可靠观察。

修复：Host 每次只返回 24 KiB 文件块，Client 顺序拉取、重组 Blob 后下载；UI 显示“正在准备下载”与“已准备文件，浏览器将开始下载”。alpha.18 实测出现成功提示，项目页面和连接保持可用。

### 5.2 同版本重打包不会刷新 Profile

alpha.15 内部修复后曾用同版本/同路径重打包，DSH 的 pnpm 安装判断为已是最新，安装目录仍为旧构建。

处理：后续每个可安装构建均递增 alpha 版本；安装后比较源构建与 Profile 内 `lib/index.js` / `lib/client.js` hash。alpha.18 已通过。

### 5.3 首次加载项目列表存在连接时序

服务刚重启后立即打开抽屉，偶尔在连接尚未就绪时先显示空首页；刷新并等待连接后项目可恢复。

状态：本轮没有把它列为阻断，因为重启恢复事实成立；下一轮应在 Client connection ready/reconnect 后自动重试 `refreshProjects()`，消除手动刷新需求。

## 6. 当前人工测试入口

Harness 已运行并停在最终成果页。用户下一轮可重点测试：

1. 新建自己的真实工作项目，而不是继续本报告的 smoke 项目。
2. 用实际项目名称、数据、截图和材料替换占位，判断 v1 是否“只需微调”。
3. 下载 PPTX 后用 PowerPoint/WPS 打开并编辑。
4. 再给一批集中反馈，观察是否少于三轮达到可发送标准。
5. 接受终稿后核对资产是否准确，不选择学习也应正常结束。
6. 刷新、关闭抽屉、重启恢复与卸载保留工件。

## 7. 尚未关闭

- 需要用户在 PowerPoint/WPS 中做人眼版式验收；当前只证明 OOXML 有效、7 页存在、内容可编辑。
- Client 应在连接恢复后自动重新拉取项目列表。
- 当前只支持 PPT 汇报黄金场景；其他工作成品类型尚未实现。
- 学习选择目前只记录选择并进入“学习”页，尚未完成从真实工作问题到完整学习/复现闭环。
- learner 源授权问题仍阻断公开发布；包继续保持 private。
