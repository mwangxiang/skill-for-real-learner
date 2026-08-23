# Embedded Skills Single-Bundle Probe

> Date: 2026-08-24<br>
> DSH: `0.1.1-rc.2` / `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`<br>
> Package: `@mwangxiang/dsh-visual-learner@0.0.2-alpha.0`<br>

## Outcome

The same prebuilt Bundle now carries the ten locked Skills in addition to its
Host and Client halves. The Host mounts the official
`@deepseek-ai/dsh-skill-filesystem` provider against the package-local
`embedded-skills/` directory and fails startup unless the exact ten-name roster
is discovered.

The isolated official Web Profile passed:

- TypeScript typecheck;
- deterministic Skill embedding;
- Host and Client builds;
- `.tgz` pack and inventory;
- install and zero peer issues;
- real Host startup;
- exact `10 Skills` discovery;
- Host loopback RPC;
- official `conversation` and `sidebar` replacement;
- `zh-CN` and `en` rendering plus reload persistence;
- uninstall row removal and user-artifact preservation.

## Artifact

| Field | Value |
|---|---|
| File | `mwangxiang-dsh-visual-learner-0.0.2-alpha.0.tgz` |
| Size | `59,059` bytes |
| SHA-256 | `c09548e01bb39080169a6173467fd754195370161380ae0b29d7869e38d1f023` |
| Installed at end | No; isolated profile returned to official-only state |

The tarball includes the Host, lazy-CJS Client, patch, license, README, and the
complete generated `embedded-skills/` tree. It does not include source-only
tests or the repository's external Matt mirror.

## Build contract

```powershell
pnpm install --frozen-lockfile
pnpm run test:pure-skills
node scripts/sync-teach-core.mjs --source <locked-matt-teach-dir> --check
pnpm run typecheck
pnpm run build
pnpm run pack:probe
```

`packages/dsh-visual-learner/scripts/embed-skills.mjs` removes and recreates
only the generated package-local `embedded-skills/` directory, then copies the
repository's locked `skills/` tree. Generated files are ignored by Git but
explicitly included by the package manifest.

At Host startup:

1. the package computes its installed `embedded-skills/` path from
   `import.meta.url`;
2. the official filesystem Skill provider mounts it as a custom root;
3. the registry lists the winning Skills;
4. startup fails unless the sorted roster equals the ten locked names;
5. only then does the loopback status endpoint return `skillCount: 10`.

## Visual evidence

![Simplified Chinese with ten Skills ready](screenshots/abi-probe-zh-cn.png)

![English with ten Skills ready](screenshots/abi-probe-en.png)

## Uninstall preservation

The same external sentinel used by the ABI probe remained unchanged:

```text
94c836969771342e1ed3da60706cff342ca70248438a6eee99321dacd7042400
```

After uninstall, `--dump-config` contained no package row. The package never
enumerated or modified the sentinel directory.

## Failures and corrections

1. The first `0.0.2` typecheck lacked Node types and imported the Skill
   filesystem namespace as a default export. Both were corrected before any
   runtime test.
2. That failed command used PowerShell semicolons, so an obsolete stale-lib
   tarball was still packed after the typecheck failure. It was never installed
   or counted. All subsequent gates use explicit `$LASTEXITCODE` checks or one
   fail-fast package script.
3. The final package ran the complete locked install → Skill smoke → source
   check → typecheck → build → pack sequence before its checksum was recorded.

## Remaining gate

The Bundle can now supply the method, Host, and Client in one install. It has
not yet driven a live model through `teach-me → teach-core → filesystem resource
read → performance evidence → review`. That gate requires a DSH Credential or
a purpose-built keyless replay fixture for the full learning turn.
