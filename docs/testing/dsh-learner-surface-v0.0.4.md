# Learner Surface visual prototype — `0.0.4-alpha.0`

## Purpose

Prove that a panel-first learner interface can replace the raw DSH conversation
and sidebar in an isolated official Web Profile. This is visual and interaction
validation only; it does not claim that the complete learning lifecycle works.

## Package

- Package: `@mwangxiang/dsh-visual-learner@0.0.4-alpha.0`
- Official baseline: DeepSeek Harness `0.1.1-rc.2` (`b150a55`)
- Preview profile: `E:\DSH-Visual-Learner-Surface-Preview-20260825\dsh-home`
- Preview URL: `http://127.0.0.1:31890`

## Surface under test

The Client intentionally occupies the official `sidebar` and `conversation`
slots in the isolated preview Profile. It renders:

- **Today**: a real-problem entry, current-learning panel, and evidence input;
- **Review**: an empty/due-review state;
- **Reflect**: an activity heatmap area and recent-learning-records area.

It hides raw DSH navigation, Skill names, Session identifiers, model controls,
file paths, and the native conversation composer from the learner surface.

## Automated verification

`pnpm test:surface` passed against the isolated preview Profile.

Verified without an AI request:

- learner surface renders;
- native DSH composer is absent;
- a goal can be entered;
- attempting to start without an independent workspace reports the correct
  guard instead of calling the model;
- Review and Reflect pages render their empty states;
- the heatmap area renders;
- main-panel and sidebar locales switch together between `zh-CN` and `en`;
- no browser page errors occurred.

Evidence:

- `screenshots/learner-surface-today.png`
- `screenshots/learner-surface-review.png`
- `screenshots/learner-surface-progress.png`

## Deliberate limits

This build is not ready for learners or distribution. It still lacks:

1. first-run ownership of independent workspace selection;
2. durable artifact projection into the three pages;
3. actual learning-record heatmap aggregation;
4. review scheduling and due-date persistence;
5. full rendering and response handling for DSH questions/approvals;
6. a live `teach-me → independent performance → study-review` acceptance run;
7. recovery and uninstall tests for the full learner surface.

The production Learner Surface needs those capabilities before it can replace
the raw DSH UI outside an isolated test Profile.
