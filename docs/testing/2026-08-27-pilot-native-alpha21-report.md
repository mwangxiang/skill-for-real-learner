# Pilot-native Visual Learner alpha.21 test report

## Verdict

P0-P3 pass. The existing alpha.18 work/asset/learning flow now renders as a
Pilot-native `shell.right-sidebar` tool with its entry in
`conversation.session.header.utilities`. Native conversation, composer,
trajectory, model controls, details, and Files remain owned by Pilot.

Alpha.21 is still a candidate rather than a partner release because P4 has not
run a real supported work request through artifact download.

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
