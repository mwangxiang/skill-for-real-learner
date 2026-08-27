# Pilot-native Visual Learner alpha.23 desktop report

## Verdict

R1–R4 pass. Alpha.23 supersedes rejected alpha.21 and alpha.22 as the current
UI/runtime candidate. P4 real-model artifact delivery remains pending.

## Fixed release blockers

1. The panel now uses an explicit three-row grid: header, scroll body, normal-flow navigation. The nav cannot anchor to the Pilot frame.
2. Unavailable Assets/Learning destinations are absent until real project data exists; their empty states route back to Work.
3. Pilot owns right-sidebar geometry through `setRightSidebar`, a 240–560px contract, an accessible separator, pointer drag, and 16/64px keyboard steps.
4. The panel binds to the current non-blank native Session. Entering a blank Session closes and clears it; late list responses cannot cross Session identity.
5. Opening Work Space retries project discovery, removing the alpha.22 Host-readiness race.

## Gates

- Visual Learner: 14 test files / 46 tests, TypeScript, Host build, Client build.
- Pilot ui-layout focused tests: 4 files / 47 tests.
- Pilot full Host/Client/Web build: pass.
- Pilot desktop unit suites: 27 tests pass.
- Pilot stock desktop E2E: 23/23 runtime checks pass after pinning the test renderer locale.
- Visual Learner Electron E2E: three viewport sizes, pointer/keyboard resize, 200% zoom, blank Session, final desktop; no renderer errors.

## Identities

- Plugin branch: `codex/pilot-native-sidebar-alpha23`.
- Pilot base: `d1fa9c15fc00c05ea6931aafd724554ca34d5a6d`.
- Pilot runtime companion local commit: `059c09cd0`.
- Pilot locale-only E2E commit: `36e567c37`.
- Runtime patch SHA-256: `1BD722CBEAD4D23A4A3641B013A43FC13F14D93C4ED28E694625E54938CDB1FB`.

## Boundary

The runtime companion is not pushed to `op7418/pilot-harness`. It is preserved
as a patch in this repository and needs maintainer permission before any
third-party publication. Alpha.23 is not a partner release until P4 proves the
real-model draft/revise/accept/download/restart journey.
