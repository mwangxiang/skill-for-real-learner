# Pilot-native Visual Learner alpha.21 test report

## Superseded verdict

**Rejected on 2026-08-27 after the first real 1920×1080 Electron desktop
inspection.** The earlier P0–P3 pass statement below is preserved as the
historical candidate verdict, not current authority. See
`evidence/pilot-desktop-audit-20260827/AUDIT.md`.

Alpha.21's absolute bottom navigation escaped its static panel and covered the
whole window; Pilot exposed no right-sidebar resize handle; panel/session state
also survived into a blank native session. These are release-blocking failures.

## Frozen identities

- Pilot Harness: `d1fa9c15fc00c05ea6931aafd724554ca34d5a6d`
  (`v0.1.0-rc.7-pilot.2`). Remote `main` and the local reference matched.
- Official Harness Host baseline: `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`
  (`0.1.1-rc.2`).
- Visual Learner authority before this branch: `a3f8f6a`, alpha.18.
- Polaris method evidence: exported HEAD `49b7614`, 101 commits ahead of its
  public remote. It supplied governance practice, not executable source.

## Machine gates

- Pilot ABI lock: four source hashes and both slots plus both layout actions
  matched.
- Plugin tests: 14 files, 41 tests passed.
- TypeScript, Host build, Client build, package inspection, and `git diff
  --check` passed.
- Pilot full Host + Client + Web build passed after moving npm/Electron cache
  and temp writes away from the full C drive.
- The installed isolated profile reported exactly
  `@mwangxiang/dsh-visual-learner@0.1.0-alpha.21`.
- A keyless replay provider created a real persisted Pilot session and exposed
  the strict session-header slots without sending data to an external model.

## Runtime admission

At a 1280×720 viewport:

- Work Space rendered at x=960, y=0, width=320, height=720.
- Its CSS position was `static`, under `data-slot="shell.right-sidebar"`.
- No Work Space element existed under `shell.overlay`.
- The native composer remained visible at width 638.4 px.
- The details column yielded while Work Space was open.

## Rejected candidates

Alpha.19 proved the basic native mount but allowed Worktree and Work Space to
render together in one 320 px track. Alpha.20 tried to yield to a peer but
modeled the Slot DOM incorrectly. Pilot renders list entries as sibling
elements inside one shared `data-slot` container, not one wrapper per entry.

Alpha.21 observes that shared container. When Work Space is open and Files
opens, Work Space unmounts and resets its pressed state without calling
`closeRightSidebar`, so Files retains the track. If Files is already open,
clicking Work Space cannot create a second wide panel.

## Evidence

- `evidence/pilot-native-sidebar/alpha21-runtime-evidence.json`
- `evidence/pilot-native-sidebar/alpha21-pilot-dock-open.png`
- `evidence/pilot-native-sidebar/alpha19-pilot-dock-open.png`

## Next leaf

P4 must use a real configured model and one supported work request to prove the
existing Host RPC, project identity, generated presentation, revision, final
acceptance, and chunked artifact download all survive the Pilot surface. That
verdict must not be inferred from the keyless UI replay.
