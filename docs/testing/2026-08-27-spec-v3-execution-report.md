# DSH 学习面板 Spec v3 执行与测试报告

日期：2026-08-26 至 2026-08-27  
官方基线：DeepSeek Harness `0.1.1-rc.2`  
官方 commit：`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`  
插件测试包：`@mwangxiang/dsh-visual-learner@0.1.0-alpha.14`  
执行约束：实现阶段使用隔离 Profile；用户随后明确授权替换真实 Web Profile 做安装测试

## 1. 当前结论

本轮已完成并验证 M0、M1、M2 和 M3 的一条现实问题垂直切片。M4 只完成十项内部能力的发现、锁定和路线映射，还没有完成“概念 / 现实问题 / 长期能力”三条真实模型 E2E。M5 完成了本轮涉及的恢复、安装、卸载、重装、双语、窄屏和项目发现子集；图片证据、zip 导出、全部迁移矩阵和全量本地化尚未完成。M6 必须由五名真实目标用户执行，当前不能标绿。

最终 `.tgz`：

- 路径：`release/mwangxiang-dsh-visual-learner-0.1.0-alpha.14.tgz`
- SHA-256：`FF4C2FB02921B9C888D006E2C657C38F322459662ABA04C56FA69785B6B91D2C`
- 大小：120,891 bytes
- 文件数：59
- 内含 Markdown 能力：10/10
- Host、Client、manifest：均存在
- 发布状态：`private: true`；授权未闭合前不得公开发布

## 2. M0：宿主与安全探针

### M0-1 隐藏 Session

结果：通过。

证据：

- 官方 `session.create → archiveSession` 会先发 `host/session-added`，不能满足首帧隐藏；已否决。
- 产品 Session 从创建第一帧即使用 `origin: subagent`，官方侧栏过滤生效。
- 产品 Host 持有 `AgentHandle` 并直接投递；通用 `session.prompt` 对该类 Session 仍拒绝。
- 真实 AgentLoop 完成创建、模型驱动、flush、Host 销毁、resume 和再次驱动。
- Browser + Host API 对账：API 能列出隐藏 Session，原生侧栏没有对应会话行，当前原生 Session 不变。
- 最终修复后隐藏 Session 与当前学习根目录共用 cwd；官方 Workspace 只显示 `learning-root`，不显示内部 project id。

### M0-2 文件与权限边界

结果：通过。

- 项目目录：Host 受控读写。
- 当前能力资源：只读。
- 其他路径、相对路径、遍历和 Windows junction 逃逸：拒绝。
- 权限升级：一律拒绝。
- 产品 Agent 上安装单调 Tool guard，直接 `read/write/edit/glob/grep/bash/pwsh` 不能绕过 Host 文件接口；能力工具仍可用。

### M0-3 RPC 与 ViewModel

结果：通过。

- Typert Gateway 真实注册 `learning-panel/snapshot|list|start|act`。
- 请求统一带 `schemaVersion: 0.2.0`。
- 旧 schema、绝对/遍历路径和内部字段泄漏均被拒绝。
- 学习者 ViewModel 不含隐藏 Session id、内部能力名、命令、RPC 名、sidecar 路径、原始 prompt/output 或绝对路径。

## 3. M1：领域模型、事件与重建

结果：通过。

已实现：

- `ProjectState`、`ProjectRoute`、`RouteStep`、`ReviewEntry`、`Operation`；
- 合法状态机和 mutation 白名单；
- `operationId` 幂等、expected revision / CAS；
- 原子替换式 `route-events.jsonl` 写入和 projection cache；
- `project-created` + `transaction-committed` 事件确定性重建；
- v0.1 manifest 到 v0.2 manifest 的已知迁移；未知 schema 只读失败；
- 一次结构修复、第二次失败关闭提交；
- 本地自然日与 3/7/21 复现梯度；
- 重启后 current step、step order、review queue 和 revision 一致。

## 4. M2：fixture-only 原生前端

结果：通过核心可用性门。

真实浏览器验证：

- 唯一入口位于 `conversation.session.header.actions`；
- 只注册 `conversation.session.header.actions` 和 `shell.overlay`；
- 未注册 root、sidebar、conversation 或 conversation.session replacement；
- 抽屉宽约 481px，在 1280px viewport 下小于 640px 和 50vw；
- 抽屉无 backdrop、无 `aria-modal`、无 focus trap；
- 抽屉打开时原生 composer 可以聚焦、输入和保留内容；
- Esc 关闭后焦点返回 Header Action；重开后证据草稿恢复；
- 路线页、行动页、反馈页每个状态恰好一个 `data-primary-action`；
- separator 支持方向键 16px 和 Shift 64px 调整；
- 740px viewport 不打开完整抽屉，只给调宽提示；
- 960px viewport（高缩放等价检查）仍满足最大 50vw；
- 中英 chrome 可切换；
- 五类卡片、首页 / 复现 / 成果、空态、路线、反馈均存在；
- Client 源码中没有 `lastAssistantText`、conversation nodes 读取或项目事实 localStorage。

截图：`docs/testing/screenshots/dsh-learning-real-route-alpha10.png`。截图来自与 alpha.11 同一 Client UI 的真实路线运行；alpha.11 后续只增加项目发现、cwd 修正和发布元数据。

## 5. M3：真实现实问题闭环

结果：通过一条真实问题切片。

测试目标：判断一份资料到底能证明什么，并把判断用于研究文章。

真实链路：

1. 用户显式生成路线；隐藏 Session 运行导航能力；
2. 结构化 adapter 生成中文路线，Host 校验并写 sidecar；
3. 路线预览不自动开始第一步；
4. 用户显式开始第一步，运行真实教学动作；
5. 用户提交样本、相关/因果和推广边界的独立表现；
6. 审查指出尚未证明项，插入补强步骤并暂停原步骤；
7. 补强范围曾错误扩大到整个项目；修正 adapter 后只按当前步骤完成标准判断；
8. 最终表现达标，当前补强步骤 `completed`；
9. Host 生成三天后的 `scheduled` 复现步骤；
10. 重启和换隔离 Profile 后，项目从事件日志恢复；隐藏 Session 从持久化记录 resume。

最终反馈具体列出已证明、未证明、路线解释和唯一下一步；学习者 ViewModel 未泄漏内部术语。

## 6. 安装、卸载、重装与恢复

结果：通过。

- 新隔离 Web Profile 首次安装成功；最终包无 peer dependency 警告。
- 卸载命令只移除 Bundle dependency 和 patch layer。
- 卸载前后三个 `route-events.jsonl` SHA-256 完全相同。
- 重装成功。
- `learning-panel/list` 在新 Profile 中只扫描已确认学习根目录下一层，恢复既有项目和完整路线。
- 卸载未删除 `.dsh-learning/`、原生学习工件或证据。

命令：

```powershell
dsh plugin --profile web add <absolute-path-to-alpha.11.tgz>
dsh plugin --profile web remove @mwangxiang/dsh-visual-learner
dsh plugin --profile web peers check
```

## 7. 自动化结果

最终命令：

```powershell
node packages/dsh-visual-learner/node_modules/typescript/bin/tsc -p packages/dsh-visual-learner/tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run tests/m0-hidden-session.probe.spec.ts tests/m0-hidden-session.agent-loop.spec.ts tests/m0-path-policy.probe.spec.ts tests/m0-path-policy.runtime.spec.ts tests/m0-rpc-schema.probe.spec.ts tests/m0-rpc-schema.runtime.spec.ts tests/m1-domain.spec.ts tests/m1-store-rebuild.spec.ts tests/m1-structured-results.spec.ts tests/m2-client-contract.spec.ts tests/m4-capability-coverage.spec.ts
git diff --check
```

结果：typecheck 通过；11 个测试文件、30 个测试通过；`git diff --check` 通过。

## 8. 失败与修复记录

- 重复挂载默认 filesystem provider：改为唯一 provider `visual-learner-embedded` 且关闭默认根扫描。
- 自定义 Profile 默认只有 base bundle，不能当 Web Profile：改用隔离 `web` template。
- 产品 Agent 没继承默认模型，prompt assembly 缺 `model`：从 `agentDefaultModel.currentSelection()` 注入 Agent options。
- DeepSeek 某些结构结果在 reasoning block：adapter 先读 text，缺失时读 reasoning，再做 JSON/schema 校验。
- 证据审查拿整个项目判当前小步：投影提示明确绑定当前 step 与 completion evidence。
- 隐藏 Session 以 projectDir 为 cwd 时原生侧栏出现内部 Workspace：改为学习根 cwd，Host 继续独占项目文件权限。
- Workspace 内 `pnpm install` / 同 Profile 包更新在 Windows 偶发长期停在链接替换；首次安装、卸载、重装均正常。最终交付按全新 `.tgz` 首装路径验证。
- 一次 PowerShell 误用了只读 `$home` 变量，命令失败并意外列出用户主目录名称；没有读取文件内容或修改任何文件。后续改用任务专用变量名。
- `ConvertFrom-Yaml` 不可用、一次 Node `yaml` 裸导入失败；随后仅用正则提取凭据键名和值到进程环境，未打印 Key、未写入 Markdown、未复制凭据文件。

## 9. 未完成，不得误报

1. M4：十项能力已发现和映射，但概念路线、长期能力路线未做完整真实模型 E2E；当前只验证现实问题路线。
2. M5：图片证据、URL 证据完整交互、zip 导出、项目移动、全部崩溃点、全部 schema 迁移、forced-colors 真机视觉检查和全量英文学习内容尚未完成。
3. M6：五名目标用户试用尚未开始；必须由真实用户完成，不能由开发者模拟标绿。
4. 授权：嵌入学习源没有仓库 LICENSE。包已标记 `private`；书面授权未转成清晰许可证或发布授权前，不得公开 npm/GitHub 发布。
5. 当前分支仍含历史 `0.0.3/0.0.4` 原型的未提交改动与删除；没有 reset、没有覆盖用户历史、没有 commit/push/tag/release。

## 10. 停止原因

用户设定最多 3 小时。目标计时器最终报告已超过硬停止线，因此本轮停止新增实现，只保留可重复验证状态、测试报告和交接文档。所有 3091–3101 隔离测试服务器已停止；真实用户 Profile 未修改。

## 11. 用户批准后的真实 Profile 安装测试

用户在停止交接后明确要求“给我安装上，进行个测试”，因此此前“不修改真实 Profile”的限制被这次新授权覆盖，仅对安装最终测试包生效。

- 真实 Profile 原版本：`0.0.3-alpha.0`。
- 安装方式：停止 3080，移除同名旧 Bundle，再安装预构建 tgz；未删除学习目录或用户工件。
- 首次安装 `alpha.11` 成功，peer check 无问题。
- 真实页面验证发现 810px viewport 下抽屉 content-box 加边框后超出 50vw 约 0.6px。
- 修复：抽屉增加 `box-sizing: border-box`，版本升级到 `alpha.12`。
- `alpha.12` typecheck、M2 contract 和 M0 RPC 回归通过，重新打包、替换安装并启动 3080。
- 最终 Profile dependency 精确指向 `mwangxiang-dsh-visual-learner-0.1.0-alpha.12.tgz`；bundle layer 存在；3080 正在监听。
- 浏览器实测：官方会话、历史、composer、模型与权限控件全部保留；页头“打开学习空间”存在；右侧抽屉可开关；抽屉打开时原生 composer 可编辑。
- 最终几何：viewport 810px，抽屉 404.79px，最大允许 405px，`withinLimit: true`；`aria-modal` 不存在。
- 测试输入已清空；面板已关闭，页面交还用户，3080 服务保持运行。

## 12. alpha.13 卡死恢复与真实空状态复测

用户报告旧页面卡死并要求重新安装测试。检查确认浏览器仍停留在 3080，但端口已无 listener；随后重新构建并替换安装。

- 修复正式入口在无 `.dsh-learning` 项目时回退显示“历史文章 / Transformer”等 M2 fixture 的问题。
- 首页现在直接显示真实目标输入；复现页显示“今天没有到期复现”；成果页显示“完成第一次真实表现后……”；三个页面均不再显示伪项目、伪证据或伪热力图。
- Action、Project Route 的失效 project id 也不再回退到 fixture，而是提供返回首页的可恢复空状态。
- 初始 `reviewDueCount` 从演示值 `1` 改为真实空值 `0`，并新增生产页面禁止 fixture import 的静态契约测试。
- typecheck 通过；12 个测试文件、34 项测试通过；build 和 `git diff --check` 通过。
- 真实 Profile 已从 alpha.12 替换为 alpha.13；manifest 与已安装包版本一致；3080 listener 恢复。
- 浏览器实测：原生历史、对话、composer、模型和权限控件保留；插件右侧非模态抽屉可打开；810px viewport 下抽屉宽 404.79px，不超过 50vw；无 `aria-modal`。
- 输入测试验证：有目标时主按钮启用，清空后禁用；临时测试文字已清空。
- 页面最终留在插件首页，用户可直接输入真实目标开始测试。

## 13. alpha.14 示例骨架、提交状态与路线续接

真实用户试跑暴露两个产品问题：空白证据框没有告诉普通人该写什么；提交后没有处理中反馈且按钮未禁用，重复点击产生四次提交、八个模型回合，累计模型耗时约 339 秒。旧版补强完成后还会把主步骤留在暂停、后继步骤留在 conditional，导致路线没有可操作下一步。

alpha.14 修复：

- 路线模型投影新增 `inputHint` 与 `exampleSkeleton`；PPT/汇报目标会得到听众、目标、已有材料和最小产出的灰色示例骨架。
- 旧项目不需要重建；缺少新字段时根据原始真实目标生成兼容提示。
- 示例明确标注“不是标准答案”，只在输入为空时显示；“使用这个结构”可插入并继续编辑。
- 提交后立即显示“正在检验你的表现”，提示通常需要 1–2 分钟，并禁用 textarea 和提交按钮。
- Client 在 `operation=running` 时拒绝重复调用；Host 按 projectId 合并并发 action。
- `study-review` 与结构化投影合并为一个模型回合，不再为一次检验固定运行两轮。
- 任何有 feedback 的提交固定进入结果页；结果页只有“查看调整后的下一步”一个主入口。
- 新流程证据充分后把下一 conditional 步骤转为 planned；补强步骤携带 sourceStepId，补强通过时同时完成原主步骤并开放下一真实行动。
- 增加旧事件兼容续接：识别“原步骤 paused + 补强 completed + 下一步 conditional”，点击“开始这一步”后在一次可审计事务中恢复主线并激活下一步，不删除或重写历史事件。

验证：typecheck 通过；12 个测试文件、35 项测试通过；Host/Client build 与 `git diff --check` 通过。真实 alpha.13 Profile 已替换为 alpha.14，3080 listener 正常。当前 PPT 项目已从无按钮的死路恢复到“完成一次真实行动”；灰色 PPT 示例、插入按钮、清空后禁用提交均通过浏览器测试。没有提交伪造的学习证据。
