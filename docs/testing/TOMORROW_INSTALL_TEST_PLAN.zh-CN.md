# 明日安装测试计划（Builder Trial）

> 计划日期：下一测试时段（用户所说的“明天”）<br>
> 测试对象：`@mwangxiang/dsh-visual-learner@0.0.2-alpha.0`<br>
> 唯一兼容基线：官方 DSH `0.1.1-rc.2`<br>
> 本轮性质：开发者安装、外壳、双语、恢复与卸载测试

## 1. 明天测什么

本轮只证明下面这条链路：

```text
固定 tarball
→ 安装到隔离的官方 Web Profile
→ Host + Client 启动
→ 面板替换官方 sidebar / conversation
→ 10 个嵌入 Skill 被 Host 发现
→ 中英文切换与刷新恢复
→ 卸载后官方 UI 恢复
→ 用户工件保持不变
```

## 2. 明天明确不测什么

以下尚未实现，不要登记为缺陷：

- 最终视觉稿、品牌与完整新手引导；
- 创建真实学习项目；
- `teach-me → teach-core → 表现证据 → study-review` 真实模型闭环；
- 面板内 API key 配置；
- Developer Surface；
- Pilot Desktop 或其他 DSH 下游版本；
- npm registry、GitHub Release、自动更新和跨平台签名。

当前页面明确是 ABI / 单包探针，能显示 `Host 与 Client 已连接 · v0.0.2-alpha.0 · 10 Skills` 即符合本轮范围。

## 3. 测试包

```text
文件：mwangxiang-dsh-visual-learner-0.0.2-alpha.0.tgz
大小：59,059 bytes
SHA-256：c09548e01bb39080169a6173467fd754195370161380ae0b29d7869e38d1f023
```

本地路径：

```text
E:\编程缓存\company-PC\王相的工作区\DSH可视化学习插件\plugin-repo\release\mwangxiang-dsh-visual-learner-0.0.2-alpha.0.tgz
```

若文件大小或 SHA-256 不同，立即停止，不要安装。

## 4. 测试前准备

### 环境记录

先记录：

- Windows 版本与 x64 架构；
- Node 版本，要求 `^22.19.0` 或 `>=24.0.0`；
- npm / pnpm 版本；
- 测试开始时间；
- 浏览器及版本；
- 屏幕分辨率、缩放比例和浏览器缩放；
- 是否使用代理。

建议使用本轮已验证组合：Node `24.13.0`、pnpm `11.7.0`、浏览器缩放 100%。

### 隔离要求

1. 使用专门的测试 `DSH_HOME`，不要复用个人 DSH 配置。
2. 使用独立学习测试目录，不要选择 Obsidian Vault、知识库根目录、HOME 或工作仓库。
3. 测试目录中先放一个“卸载后必须保留”的哨兵文件。
4. 不删除任何旧 DSH_HOME；明天只新增隔离目录。
5. 确认端口 `31888` 没有被其他服务使用；有冲突就改端口并记录。

建议变量：

```powershell
$trialRoot = 'E:\DSH-Visual-Learner-Trial-20260824'
$packagePath = 'E:\编程缓存\company-PC\王相的工作区\DSH可视化学习插件\plugin-repo\release\mwangxiang-dsh-visual-learner-0.0.2-alpha.0.tgz'
$env:DSH_HOME = Join-Path $trialRoot 'dsh-home'
$learningRoot = Join-Path $trialRoot 'learning-workspace'
$sentinel = Join-Path $learningRoot 'KEEP-ME.md'
```

建立哨兵并记录 hash：

```powershell
New-Item -ItemType Directory -Path $learningRoot -Force | Out-Null
Set-Content -LiteralPath $sentinel -Encoding utf8 -Value '# 用户工件：卸载后必须保留'
$sentinelHashBefore = (Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash.ToLower()
$sentinelHashBefore
```

## 5. 凭据与隐私注意事项

- API key 只能输入官方 DSH Credentials / API key 界面。
- 不要把 API key 发到聊天、Markdown、测试报告、终端命令、截图或 Git。
- 安装外壳测试可以在官方 API key 页面选择“稍后配置”。
- 若要顺便配置模型，不要截取输入后的凭据页面。
- 发现日志、UI、Markdown 或截图出现 key 片段时，按 P0 停止测试并立即轮换 key。
- 本轮插件不应读取测试学习目录以外的任何资料，也不应触碰 Obsidian。

## 6. 安装步骤

### T01 校验包

```powershell
$actualHash = (Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash.ToLower()
$actualSize = (Get-Item -LiteralPath $packagePath).Length
$actualHash
$actualSize
```

通过标准：

- hash 为 `c09548e01bb39080169a6173467fd754195370161380ae0b29d7869e38d1f023`；
- 大小为 `59059`。

### T02 安装固定官方版本与 Bundle

推荐使用发布版 CLI：

```powershell
npx --yes @deepseek-ai/dsh@0.1.1-rc.2 plugin --profile web add $packagePath
```

通过标准：

- 退出码为 0；
- 没有安装 `latest`；
- 只修改 `$env:DSH_HOME` 下的测试 Profile；
- 没有要求在安装时构建插件源码。

### T03 检查配置层

```powershell
$dump = npx --yes @deepseek-ai/dsh@0.1.1-rc.2 --profile web --dump-config
$dump | Select-String '@mwangxiang/dsh-visual-learner|dsh-visual-learner'
```

通过标准：出现一层：

```text
# == @mwangxiang/dsh-visual-learner
- id: dsh-visual-learner
  name: '@mwangxiang/dsh-visual-learner'
```

### T04 检查 peer

```powershell
pnpm --dir "$env:DSH_HOME\profiles\web" peers check
```

通过标准：`No peer dependency issues found`。

## 7. 启动与首次引导

### T05 启动

```powershell
npx --yes @deepseek-ai/dsh@0.1.1-rc.2 --profile web --no-open --port 31888
```

通过标准：终端出现：

```text
dsh web: http://127.0.0.1:31888
```

保持终端运行，手动打开这个地址。

### T06 官方宿主的两层首次引导

这两层来自官方 DSH，不是插件：

1. “内测声明 / Developer Preview”——必须由测试者显式点击“继续”。
2. “添加一个 API Key”——外壳测试选择“稍后配置”；需要模型时再配置。

观察并记录：

- 两层是否都能读懂；
- 是否出现顺序异常、重复、空白或无法点击；
- 从打开页面到进入插件面板经过了几次点击；
- 测试者是否误以为它们属于插件。

## 8. 面板测试要点

### T07 简体中文默认态

中文系统/浏览器应默认显示：

- `官方 DSH Web · ABI 探针`；
- `可视化学习插件已接管中心面板`；
- `Host 与 Client 已连接`；
- `v0.0.2-alpha.0`；
- `10 Skills`。

同时确认：

- 左侧只剩插件自有的紧凑“学”栏；
- 看不到 `DSH Local Build`、工作区列表和官方设置入口；
- 看不到原生聊天输入框；
- 没有英文未翻译按钮或 raw error；
- 没有遮罩残留、空白区挡住操作或横向滚动；
- 文本不截断，按钮不换成竖排。

截图：`01-installed-zh-CN.png`。

### T08 英文切换

点击 `English`，确认：

- 标题与说明变为英文；
- `简体中文` 按钮保持单行；
- 状态仍是 connected、版本仍正确、Skills 仍为 10；
- 切换不重新加载 Host，不闪退、不白屏。

截图：`02-installed-en.png`。

### T09 刷新恢复

在英文状态刷新页面：

- 仍保持英文；
- Host RPC 再次回到 connected；
- 仍显示 10 Skills；
- 原生 sidebar / composer 不应闪回并长期停留。

然后切回简体中文，再刷新一次，确认中文同样保持。

截图：`03-reloaded.png`。

### T10 基础尺寸

至少观察：

- 1440×900；
- 1024×768；
- 浏览器缩放 125%。

记录卡片是否溢出、语言按钮是否换行、紧凑栏是否遮挡正文。当前不是最终响应式设计，但不能出现无法操作。

## 9. 主观摩擦观察

除了“能不能用”，请记录：

- 从输入安装命令到看见面板用了几分钟；
- 中途是否需要理解 Bundle、Profile、Skill 或 Markdown；
- 官方两层引导是否让人犹豫；
- 首眼能否看出 Host、Client 和 10 Skills 已就绪；
- 哪些词显得技术化；
- 是否知道下一步应该做什么；
- 如果这是普通用户，他会在哪一步放弃。

“不知道下一步做什么”是当前探针预期缺口，但必须记录，它会直接指导下一版单焦点引导。

## 10. 卸载与恢复

### T11 停止服务

回到启动终端，按 `Ctrl+C`，确认退出。不要在服务运行时操作 Profile 包。

### T12 卸载

```powershell
npx --yes @deepseek-ai/dsh@0.1.1-rc.2 plugin --profile web remove '@mwangxiang/dsh-visual-learner'
```

通过标准：退出码 0。

### T13 配置与工件校验

```powershell
$dumpAfter = npx --yes @deepseek-ai/dsh@0.1.1-rc.2 --profile web --dump-config
$bundleStillPresent = [bool]($dumpAfter -match '@mwangxiang/dsh-visual-learner')
$sentinelHashAfter = (Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash.ToLower()
[PSCustomObject]@{
  BundleStillPresent = $bundleStillPresent
  SentinelExists = Test-Path -LiteralPath $sentinel
  SentinelHashBefore = $sentinelHashBefore
  SentinelHashAfter = $sentinelHashAfter
  ArtifactUnchanged = $sentinelHashBefore -eq $sentinelHashAfter
}
```

通过标准：

- `BundleStillPresent=False`；
- `SentinelExists=True`；
- `ArtifactUnchanged=True`。

### T14 官方 UI 回退

再次启动官方 Web Profile。确认：

- 插件面板消失；
- `DSH Local Build`、官方 Sidebar 和原生会话首页恢复；
- 页面无插件残留错误。

截图：`04-uninstalled-official-ui.png`。

完成后停止服务。保留整个测试目录和日志，不要当晚删除，等待复盘。

## 11. 严重级别与停止线

### P0：立即停止

- API key、token 或凭据出现在日志、页面、截图、Markdown 或 Git；
- 插件扫描或修改 Obsidian Vault、HOME 或未选择目录；
- 卸载删除或修改用户工件；
- 安装覆盖非测试 DSH_HOME；
- 发生不可解释的数据丢失。

### P1：阻断下一阶段

- 安装/启动非 0；
- Host/Client 无法连接；
- 不是 10 Skills；
- sidebar/conversation 没有被替换；
- 中英文有一种不可用；
- 刷新后状态丢失；
- 卸载后官方 UI 不恢复。

### P2：必须修复但可完成测试

- 官方引导与插件引导关系不清；
- 按钮换行、布局溢出、技术词过多；
- 错误信息不够人话；
- 点击数、等待时间或配置步骤明显过多。

### P3：视觉润色

- 间距、字号、颜色、阴影、动效等不阻断操作的问题。

## 12. 常见问题与安全恢复

### 端口被占用

换一个端口，例如 `31889`，并在报告中记录。不要结束与本测试无关的进程。

### npx 下载慢或失败

保持版本 `0.1.1-rc.2` 原样重试；不要改成 `latest`。记录代理、错误文本和重试次数。

### 页面一直有官方遮罩

先确认是“内测声明”还是“API Key 配置”。不要用 DOM/CSS 强行隐藏；按正常按钮继续或稍后配置。

### Host 报 RPC、module loader 或 plugin tree 错误

停止服务，保存完整终端输出，不反复覆盖 Profile。登记为 P1。

### 想重新安装

先停止服务，执行精确 remove，再重新 add 同一 hash 的 tarball。不要手工删除 Profile 内的随机目录。

## 13. 最终通过门

只有以下全部成立才记为“安装 Builder Trial 通过”：

- 包 hash/大小正确；
- 固定 DSH 版本正确；
- install、dump-config、peer check、boot 全部通过；
- Host/Client connected；
- 10 Skills；
- 原生 sidebar/composer 不可见；
- `zh-CN` 与 `en` 可用并可恢复；
- 无凭据泄露、无越界扫描/写入；
- remove 后 Bundle row 消失；
- 官方 UI 恢复；
- 哨兵存在且 hash 不变；
- 日志、截图和结果模板完整。
