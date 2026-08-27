# DSH Work & Learning

> Pilot-native candidate: `0.1.0-alpha.23`
> Frozen partner baseline: `0.1.0-alpha.18`

An installable Host + Client Bundle for Pilot Harness
`v0.1.0-rc.7-pilot.2`. It adds one session-header utility and a native docked
right sidebar while preserving the native sidebar, conversation, composer,
settings, model controls, and Files plugin. The Host plane remains compatible
with the official DeepSeek Harness `0.1.1-rc.2` baseline, but the alpha.23 UI
requires Pilot's `conversation.session.header.utilities` and
`shell.right-sidebar` contracts. Resizing additionally requires the frozen
Pilot companion patch under `integrations/pilot-harness/`.

The product order is fixed:

1. complete real work and generate a usable artifact;
2. distill versions, preferences, checklists, and reusable rules;
3. offer optional learning derived from completed work.

The alpha.15 golden slice creates a real, editable seven-slide `.pptx` plus a Markdown outline from a reporting brief. The user can download the draft, submit one batch of feedback to create a new preserved version, accept the final artifact, and then keep or skip the optional learning suggestion.

Chinese is the primary language and English is fully available. Ordinary users do not need to see Agent sessions, Skill commands, RPC names, or sidecar files.

## Install in an isolated Web Profile

```powershell
$env:DSH_HOME = 'C:\path\to\isolated-dsh-home'
dsh plugin --profile web add C:\path\to\mwangxiang-dsh-visual-learner-0.1.0-alpha.23.tgz
dsh web --no-open --port 3080
```

When another Pilot dock tool such as Files is open, Visual Learner yields that
track instead of rendering two wide tools in one column. Close Files before
opening Work Space if you want to switch tools.

Remove only the Bundle:

```powershell
dsh plugin --profile web remove @mwangxiang/dsh-visual-learner
```

Removal does not delete `work-projects/`, generated deliverables, or distilled assets.

## Current release boundary

This package is private and intended for partner testing only. Public npm publication or redistribution remains blocked until the embedded learning source has a clear license or equivalent release grant.

The current slice is intentionally presentation-first. It proves the product flow and controlled artifact generation; additional artifact types and full real-model capability coverage remain later gates.
