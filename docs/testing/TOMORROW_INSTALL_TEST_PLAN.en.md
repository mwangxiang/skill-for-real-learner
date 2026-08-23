# Tomorrow's Installation Test Plan (Builder Trial)

> Planned window: the next test session (the user's “tomorrow”)<br>
> Subject: `@mwangxiang/dsh-visual-learner@0.0.2-alpha.0`<br>
> Only compatibility baseline: official DSH `0.1.1-rc.2`<br>
> Scope: developer installation, shell, bilingual UI, reload, and uninstall

## 1. Scope

This trial proves:

```text
locked tarball
→ isolated official Web Profile install
→ Host + Client boot
→ official sidebar / conversation replacement
→ ten embedded Skills discovered by the Host
→ zh-CN / en switching and reload persistence
→ official UI restored after uninstall
→ user artifact unchanged
```

It does not test the final design, project creation, credential onboarding,
Developer Surface, Pilot Desktop, public publishing, or the live
`teach-me → evidence → study-review` model loop. The current screen is an ABI
and single-package probe.

## 2. Locked artifact

```text
File: mwangxiang-dsh-visual-learner-0.0.2-alpha.0.tgz
Size: 59,059 bytes
SHA-256: c09548e01bb39080169a6173467fd754195370161380ae0b29d7869e38d1f023
```

Stop before installation if either value differs.

## 3. Safety preparation

- Record Windows, Node, npm/pnpm, browser, viewport, zoom, proxy, and start time.
- Node must be `^22.19.0` or `>=24.0.0`; the verified combination is Node
  `24.13.0` with pnpm `11.7.0`.
- Use a dedicated test `DSH_HOME`; never reuse or delete a personal one.
- Use a dedicated learning directory, not an Obsidian Vault, HOME, knowledge
  base root, or source repository.
- Create one sentinel user artifact outside the Profile and record its SHA-256.
- Use port `31888` when free; otherwise choose another and record it.

Suggested PowerShell variables:

```powershell
$trialRoot = 'E:\DSH-Visual-Learner-Trial-20260824'
$packagePath = 'E:\编程缓存\company-PC\王相的工作区\DSH可视化学习插件\plugin-repo\release\mwangxiang-dsh-visual-learner-0.0.2-alpha.0.tgz'
$env:DSH_HOME = Join-Path $trialRoot 'dsh-home'
$learningRoot = Join-Path $trialRoot 'learning-workspace'
$sentinel = Join-Path $learningRoot 'KEEP-ME.md'
New-Item -ItemType Directory -Path $learningRoot -Force | Out-Null
Set-Content -LiteralPath $sentinel -Encoding utf8 -Value '# User artifact: keep after uninstall'
$sentinelHashBefore = (Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash.ToLower()
```

## 4. Credential rules

- Enter API keys only in official DSH Credentials / API-key UI.
- Never put a key in chat, Markdown, commands, logs, screenshots, reports, or Git.
- Select `Configure later` for this shell-only trial.
- If any credential fragment appears outside Credentials, stop as P0 and rotate
  the credential.
- The plugin must not inspect or modify Obsidian or any directory outside the
  explicit trial scope.

## 5. Installation checklist

### T01 — Verify artifact

```powershell
(Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash.ToLower()
(Get-Item -LiteralPath $packagePath).Length
```

Expected: the locked hash and `59059`.

### T02 — Install into the fixed official CLI

```powershell
npx --yes @deepseek-ai/dsh@0.1.1-rc.2 plugin --profile web add $packagePath
```

Expected: exit `0`, no `latest`, no source build, and writes only under the
isolated `DSH_HOME`.

### T03 — Dump the composition

```powershell
$dump = npx --yes @deepseek-ai/dsh@0.1.1-rc.2 --profile web --dump-config
$dump | Select-String '@mwangxiang/dsh-visual-learner|dsh-visual-learner'
```

Expected: one package layer and one `dsh-visual-learner` row.

### T04 — Check peers

```powershell
pnpm --dir "$env:DSH_HOME\profiles\web" peers check
```

Expected: `No peer dependency issues found`.

## 6. Boot and official first run

```powershell
npx --yes @deepseek-ai/dsh@0.1.1-rc.2 --profile web --no-open --port 31888
```

Expected terminal line:

```text
dsh web: http://127.0.0.1:31888
```

Open that URL manually. DSH owns two first-run layers:

1. Developer Preview notice: explicitly select `Continue`.
2. API-key setup: select `Configure later` for this trial.

Record click count, delays, repeats, unclear wording, and whether either layer
looks like plugin UI.

## 7. Installed UI checks

### T05 — Simplified Chinese

Expected on a Chinese browser/system:

- `官方 DSH Web · ABI 探针`;
- `可视化学习插件已接管中心面板`;
- connected Host + Client;
- `v0.0.2-alpha.0`;
- `10 Skills`;
- only the compact plugin-owned `学` rail;
- no `DSH Local Build`, workspace list, native settings entry, or native chat
  composer;
- no untranslated user-facing text, raw error, stale mask, clipping, vertical
  language button, or horizontal overflow.

Capture `01-installed-zh-CN.png`.

### T06 — English and reload

- Switch to English; all probe copy changes without Host reconnect or blank UI.
- `简体中文` remains on one line.
- Reload in English; English, connected status, version, and ten Skills persist.
- Switch to Chinese and reload again; Chinese persists.

Capture `02-installed-en.png` and `03-reloaded.png`.

### T07 — Basic sizes

Observe 1440×900, 1024×768, and 125% browser zoom. Record overflow, clipped
copy, blocked controls, or rail overlap. This is not final responsive design,
but it must remain operable.

## 8. Friction notes

Record:

- minutes from install command to panel;
- how many decisions/clicks were required;
- any need to understand Bundle, Profile, Skill, or Markdown;
- whether the two official onboarding layers cause hesitation;
- whether readiness is obvious at first glance;
- technical wording;
- where an ordinary learner would quit.

The absence of a real next learning action is an expected current gap, not a
surprise. Describe how confusing it feels; that evidence shapes the next
single-focus screen.

## 9. Uninstall and preservation

Stop the server with `Ctrl+C`, then:

```powershell
npx --yes @deepseek-ai/dsh@0.1.1-rc.2 plugin --profile web remove '@mwangxiang/dsh-visual-learner'
$dumpAfter = npx --yes @deepseek-ai/dsh@0.1.1-rc.2 --profile web --dump-config
$sentinelHashAfter = (Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash.ToLower()
```

Expected:

- no package row in the dump;
- sentinel still exists;
- before/after sentinel hashes match.

Boot the official Web Profile again. The custom panel must be absent and the
official sidebar plus conversation hero must return. Capture
`04-uninstalled-official-ui.png`, stop the server, and keep the trial directory
for review.

## 10. Severity and stop rules

- **P0 / stop now:** credential leak, out-of-scope scan/write, wrong DSH_HOME,
  artifact deletion/change, unexplained data loss.
- **P1 / blocks next stage:** install or boot failure, Host/Client disconnected,
  not ten Skills, native UI not replaced, either locale unusable, reload loss,
  uninstall does not restore official UI.
- **P2 / complete the test but fix:** confusing onboarding, wrapping/overflow,
  technical copy, poor human-readable errors, excessive clicks or waits.
- **P3 / polish:** spacing, color, typography, shadow, and motion issues that do
  not block use.

Do not hide official onboarding with DOM/CSS. Do not switch to `latest` after a
network failure. Do not kill unrelated processes for a port conflict. For a
retry, stop DSH, remove the exact package, then add the same verified tarball.

## 11. Pass gate

The Builder Trial passes only when artifact identity, fixed CLI, install,
dump-config, peers, Host boot, Client UI, ten Skills, both locales, reload,
privacy boundaries, uninstall, official UI restoration, sentinel preservation,
logs, screenshots, and the result template all pass.
