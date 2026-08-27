# Pilot desktop alpha.21 screen audit

## Audit scope

- Surface: Pilot Harness Electron desktop, Visual Learner right sidebar.
- State: blank/new native session, Visual Learner `学习` page open, 1920×1080 desktop window.
- User goal: inspect whether the Pilot-native plugin is complete, resizable, correctly contained, and free of overlap or duplicated navigation.
- Evidence: `01-desktop-learning-tab-broken.png`, SHA-256 `1E43B78A62FB0013BE073C1C55ECE52FB1D36C31921C176F82E695976304FFCF`.

## Step 1 — Open Work Space and select Learning

Health: **failed / release-blocking**.

### Confirmed strengths

- The right sidebar is visibly mounted inside the Electron desktop shell.
- The central conversation and left workspace navigation remain present.
- Chinese copy is readable and the close/language controls are visible.

### UX risks

1. **P0 — Bottom navigation escapes the sidebar.** `RootNavigation` is an absolutely positioned child, but alpha.21 changed `.dsh-learning-panel` to `position: static`. Its containing block becomes the Pilot frame, so `工作 / 资产 / 学习` stretches across the entire window and covers the bottom edge of the left, center, and right columns.
2. **P0 — The right sidebar cannot be resized.** Pilot's layout store has no `setRightSidebar` action and `DragHandle` only supports `sidebar` and `details`. The source comment explicitly describes `RIGHT_SIDEBAR_DEFAULT` as waiting for a future resize affordance. Alpha.21 removed its own resizer based on the false assumption that Pilot already owned this behavior.
3. **P0 — Panel state outlives the selected session.** The root-scoped controller receives a session only through the strict-session header action. Switching to a blank `新会话` does not clear the native session, close the panel, or reset its page. The screenshot therefore shows a Learning panel in a state where no real work can be started.
4. **P1 — Empty Learning is a dead end.** It explains that real work must happen first, but offers no direct `去工作` action. The persistent three-tab navigation exposes empty product areas before they have data, so content feels missing rather than intentionally gated.
5. **P1 — The demo environment compounds the failure.** The native composer says the model is unavailable. That is an isolated-profile configuration issue rather than a Visual Learner rendering bug, but it makes the first-run desktop experience non-actionable and should never be used as release evidence.
6. **P1 — Visual and semantic order diverge.** The navigation remains semantically inside the right panel but is visually painted across the whole app. Keyboard and screen-reader users would encounter a different ownership model from sighted users.

## Root cause in the previous gate

- Browser smoke used 1280×720 and captured the Work page, not the Electron 1920×1080 Learning empty state.
- The client contract asserted `position: static` and absence of the old fixed overlay, but never asserted that every descendant remained within the panel bounds.
- Runtime evidence checked only the panel rectangle, native composer, and Files conflict. It did not test resize, bottom navigation geometry, blank↔strict session transitions, all three tabs, or full desktop reflow.
- Therefore alpha.21 was incorrectly marked admitted. It must be treated as a rejected UI candidate until these gates are added and passed.

## Required repair order

1. Restore containment with a normal-flow three-row panel (`header / scroll body / nav`), not an absolutely positioned footer.
2. Add a real Pilot right-sidebar width contract: `setRightSidebar`, pointer/keyboard drag handle, 240–560px clamp, and concession tests. This requires a Pilot host patch or an upstream-compatible companion change; child CSS alone is insufficient.
3. Bind open/page/project state to the active strict session. Close or show a deliberate unavailable state on blank sessions; never retain stale project context.
4. Replace dead-end empty tabs with one contextual empty state and a primary `去工作` action; hide or disable unavailable destinations with a reason.
5. Re-run a desktop matrix: 1280×720, 1600×900, 1920×1080; Work/Assets/Learning; blank/current session; Files↔Work Space; mouse and keyboard resize; 200% zoom.

## Evidence limits

- This audit is grounded in one accepted desktop screenshot plus the current source contracts.
- Pointer drag, keyboard resize, focus order, zoom, and screen-reader output could not be validated because the current implementation has no right-sidebar resize affordance and Windows screenshot capture for this custom Electron frame is unavailable.
- No claim of WCAG compliance is made.
