# Non-destructive learning overlay — `0.0.3-alpha.0`

## Purpose

Replace the `0.0.2-alpha.0` ABI probe, which incorrectly occupied the native
`conversation` and `sidebar` slots, with a usable learning entry that leaves
the official DSH Web UI intact.

## Package

- Package: `@mwangxiang/dsh-visual-learner@0.0.3-alpha.0`
- Artifact: `release/mwangxiang-dsh-visual-learner-0.0.3-alpha.0.tgz`
- SHA-256: `5d51109d0b582015cb43742adad5739885c7270ec390dde48a4b14c208c1d8e1`
- Official baseline: DeepSeek Harness `0.1.1-rc.2` (`b150a55`)

## Product contract

The plugin never registers into `root`, `sidebar`, `conversation`, or
`conversation.session`. It adds only:

1. a `学习 / Learn` action in `conversation.session.header.actions`;
2. a dismissible `shell.overlay` learning panel.

The panel uses the current DSH session's `session.prompt()` API. It therefore
reuses the selected DSH model, credential, workspace, permission mode, streamed
conversation, tool trace, and session log. It has no API-key input or direct
model HTTP client.

## Automated verification

`pnpm test:overlay` ran against a real local official Web Profile on
`http://127.0.0.1:3080` and passed without sending a model request.

Verified:

- the native sidebar is visible before the overlay opens;
- the native composer is visible before the overlay opens;
- the session-header launcher is present;
- Chinese and English panel copy both render;
- closing the overlay leaves the native composer visible;
- no browser page errors occurred.

Evidence:

- `screenshots/learning-overlay-zh-cn.png`
- `screenshots/learning-overlay-en.png`
- `screenshots/learning-overlay-closed.png`

## Remaining acceptance gate

The live model-request path is intentionally not automated because it consumes
the profile owner's API credits. With the profile owner present, enter a
non-sensitive goal, select **让 AI 设计第一小步**, and verify that the same
native conversation receives the streamed response. Then submit a short piece
of evidence from the overlay and verify that the next native response contains
feedback and one next task.

## Historical note

The ABI reports and screenshots under `docs/testing/` remain historical
evidence for `0.0.1-alpha.0` and `0.0.2-alpha.0`; they are not the release
contract for this overlay build.
