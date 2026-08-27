# Polaris × Pilot Harness project state

> Status: alpha.21 rejected; alpha.22 active candidate
> Intent epoch: `pilot-native-sidebar-v2`
> Candidate branch: `codex/pilot-native-sidebar-alpha22`
> Authority branch: `codex/dsh-visual-plugin` at `a3f8f6a`
> Frozen partner release: `0.1.0-alpha.18`

## Current intent contract

Move the existing work-first visual learner from its fixed overlay into Pilot
Harness's native extension surfaces. Preserve native conversation, existing
Host RPC, project storage, artifact generation, and the optional learning
handoff. The first accepted leaf must not redesign business truth.

## Frozen inputs

| Input | Identity | Role |
|---|---|---|
| Visual Learner | `a3f8f6a` / alpha.18 | Last released authority; do not rewrite while partner feedback is pending |
| Pilot Harness | `d1fa9c15f` / `v0.1.0-rc.7-pilot.2` | Native desktop ABI candidate host |
| DeepSeek Harness | `b150a551b8` / `0.1.1-rc.2` | Official Host and package baseline |
| Polaris trace | `49b7614` export head, 101 commits ahead of remote | Development governance evidence, not executable source |

The exact Pilot ABI file hashes live in `SOURCE_LOCK.json` and are checked by
`node scripts/verify-pilot-abi.mjs`.

## Dependency-closed leaves

| Leaf | Allowed change | Gate | State |
|---|---|---|---|
| R0 | Freeze desktop failure and supersede alpha.21 | 1920×1080 Electron screenshot plus source audit | passed |
| R1 | Contain header/body/navigation inside the dock | descendant bounds stay inside panel at every tab | pending |
| R2 | Add Pilot-owned right-sidebar resizing | mouse + keyboard drag, 240–560 px, concession tests | pending |
| R3 | Bind panel state to the current strict session | blank/current/session-switch matrix | pending |
| R4 | Admit alpha.22 in real Electron desktop | 1280×720, 1600×900, 1920×1080, 200% zoom | pending |
| P4 | Exercise one real work request and artifact download | RPC/project identity and output witness | blocked by R1–R4 |

## Candidate / authority boundary

- Files in this branch and any alpha.22 package are candidates. Alpha.19,
  alpha.20, and alpha.21 are rejected runtime candidates. Alpha.21 passed a
  narrow browser probe but failed the real desktop screen: its absolute footer
  escaped the static panel, the host had no right-sidebar resize contract, and
  root-scoped panel state survived a switch to a blank session.
- Green unit tests do not upgrade alpha.22 to a partner release.
- P3 is the first runtime-admission gate because official Harness rc.2 does
  not declare Pilot's `shell.right-sidebar` layout contract.
- The alpha.18 release and its partner feedback package remain immutable.
- A failure is appended here with its command and evidence; it is not erased by
  a later repair.

## Current recovery point

Read `evidence/pilot-desktop-audit-20260827/AUDIT.md`, then resume at R1. The
Pilot integration candidate lives on local branch
`codex/visual-learner-right-sidebar-resize`; do not push it to the third-party
remote. P4 remains blocked until R1–R4 pass in the Electron desktop.
