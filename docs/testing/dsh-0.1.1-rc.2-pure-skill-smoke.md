# Official DSH 0.1.1-rc.2 Pure Skill Smoke

> Date: 2026-08-24  
> Platform: Windows x64, PowerShell, Node `v24.13.0`  
> DSH source: `dsh-v0.1.1-rc.2` / `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`  
> Learner source: `f3b5ac3dd64b0b0959cae663956ba583d29b6a96`

## Result

| Gate | Result | Evidence |
|---|---|---|
| Official Skill filesystem and tool unit tests | PASS with two Windows symlink cases skipped | 19 passed / 2 skipped; 31 passed |
| Discover the real learner Skill set | PASS | 10/10 names, one-level custom root |
| Resolve invocation policy | PASS | 8 user-only; 2 model+user |
| Load full Skill bodies | PASS | 10 definitions load through `ctx.skills.get()` |
| Resolve and read Skill resources | PASS at provider/filesystem boundary | five representative referenced files exist and contain text |
| User-explicit `/name` Web flow | PASS, keyless official replay | 2 E2E files / 3 tests passed |
| Live provider model independently chooses and reads a Skill resource | NOT RUN | no DSH credential was present on this machine |

The initial pure Skill result did not waive the `teach-core` drift gate. The
follow-up deterministic sync has since brought all six files into conformance;
`SOURCE_LOCK.json` now records `status: verified` and
`packaging_allowed: true`. See `teach-core-source-sync.md`.

## Commands and outcomes

### Locked install and build

```powershell
pnpm install --frozen-lockfile
pnpm run build
```

- Install: exit `0`; lockfile and 1,215-entry supply-chain policy check passed.
- Build: exit `0`; Host packages, Client packages, and Web `dist` were built.
- Expected Windows warnings: Linux Landlock packages unsupported; two demo bin
  links absent before build; Vite chunk-size and plugin-timing advisories.

### Official unit tests

```powershell
pnpm exec vitest run `
  packages/skill/skill-filesystem/tests/skill-filesystem.spec.ts `
  packages/skill/tool-skill/tests/tool-skill.spec.ts
```

Initial combined result: 50 passed, 2 failed. Both failures were `EPERM` from
Windows denying `symlink()` in the two tests whose names contain `symlink`;
no Skill behavior assertion failed.

The clean non-symlink baseline:

```powershell
pnpm exec vitest run packages/skill/tool-skill/tests/tool-skill.spec.ts
pnpm exec vitest run `
  packages/skill/skill-filesystem/tests/skill-filesystem.spec.ts `
  -t '^(?!.*symlink).*'
```

- `tool-skill`: 31 passed.
- `skill-filesystem`: 19 passed, 2 skipped.

These tests include the canonical catalog, full body loading, directory
resource hints, model policy checks, leading and mid-sentence `/name` user
invocation, boundary rejection, and repeated-gesture deduplication.

### Real learner discovery and resource probe

The durable test is `tests/dsh-pure-skills.smoke.spec.ts`. During the baseline
run, the same test body was temporarily placed under the official repository's
allowed `scripts/**/*.spec.ts` include and removed immediately after the run.

```powershell
$env:LEARNER_REPO='<fork checkout>'
pnpm exec vitest run scripts/dsh-real-learner.smoke.spec.ts
```

Result: one file / one test passed. It proved:

- exact discovery of all ten Skills;
- non-empty descriptions and `custom` source;
- eight user-only and two model+user policies;
- full body loading;
- directory `resourceBase` values;
- readable references for `learn-modeling`, `learn-one-concept`, `teach-me`,
  `study-review`, and the cross-Skill `to-sop → teach-core` format.

The Fork now has a private root workspace manifest with exact published DSH
test dependencies. The durable command is:

```powershell
pnpm install --frozen-lockfile
pnpm run test:pure-skills
```

Current result after `teach-core` sync: one file / three tests passed.

### Official keyless Web E2E

The first run stopped before assertions because `apps/web/dist` did not exist.
After the required build, the second run exposed a missing Playwright Chromium
runtime. It was installed with the package-local command:

```powershell
pnpm --filter @deepseek-ai/dsh-web-frontend exec playwright install chromium
```

Then:

```powershell
pnpm exec vitest run --config vitest.web.config.ts `
  apps/web/tests/skill-invocation-policy.e2e.ts `
  apps/web/tests/skill-user-invoke.e2e.ts
```

Result: two files / three tests passed. The real Host and headless Web Client
proved that user-invocable Skills appear in the slash source and that a
model-hidden Skill invoked as `/name args` reaches the turn as canonical
`<skill_content>` while the user arguments remain ordinary user text.

`skill-tool-row.e2e.ts` was not counted: on Windows its committed JSONL fixture
replacement inserted an unescaped backslash path and failed JSON parsing before
the UI assertion. The lower-level canonical Skill output and actual learner
resource tests passed, so this is recorded as an official Windows fixture gap,
not silently patched in the implementation baseline.

## Remaining runtime gate

Run one live-provider Builder Trial after a credential is configured through
DSH Credentials. The trace must show:

1. explicit `teach-me` invocation;
2. nested loading of `teach-core`;
3. the correct `resourceBase`;
4. a normal filesystem tool reading the referenced resource;
5. all writes confined to the selected disposable learning workspace;
6. no credential text in Markdown, logs, screenshots, or Git.
