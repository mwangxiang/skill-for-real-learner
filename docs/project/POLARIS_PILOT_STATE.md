# Polaris × Pilot Harness project state

> Status: active candidate
> Intent epoch: `pilot-native-sidebar-v1`
> Candidate branch: `codex/pilot-native-sidebar`
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
| P0 | Lock Pilot ABI and project intent | hashes plus slot witnesses | passed |
| P1 | Replace header action + overlay with utility + right dock | client contract, controller test, typecheck | passed |
| P2 | Build alpha.21 package | host/client build and package inspection | passed |
| P3 | Mount package in isolated Pilot desktop profile | real UI screenshot, open/close, native conversation preserved | passed |
| P4 | Exercise one real work request and artifact download | RPC/project identity and output witness | pending |

## Candidate / authority boundary

- Files in this branch and any alpha.21 package are candidates. Alpha.19 and
  alpha.20 are rejected runtime candidates: alpha.19 had no peer-yield gate;
  alpha.20 assumed one wrapper per list entry, while Pilot renders list entries
  as siblings in one shared `data-slot` container.
- Green unit tests do not upgrade alpha.21 to a partner release.
- P3 is the first runtime-admission gate because official Harness rc.2 does
  not declare Pilot's `shell.right-sidebar` layout contract.
- The alpha.18 release and its partner feedback package remain immutable.
- A failure is appended here with its command and evidence; it is not erased by
  a later repair.

## Current recovery point

Run the ABI verifier, focused client tests, full test suite, typecheck, and both
build faces. P0-P3 now pass at alpha.21. Resume at P4 with a real supported work
request and downloadable artifact; do not use the keyless replay model for that
business-flow verdict. The clean Pilot reference checkout remains unchanged.
