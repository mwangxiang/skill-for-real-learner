# DSH Work & Learning

> Internal test build: `0.1.0-alpha.18`

An installable Host + Client Bundle for the official DeepSeek Harness Web Profile `0.1.1-rc.2`. It adds one session-header action and a right-side non-modal drawer while preserving the native sidebar, conversation, composer, settings, and model controls.

The product order is fixed:

1. complete real work and generate a usable artifact;
2. distill versions, preferences, checklists, and reusable rules;
3. offer optional learning derived from completed work.

The alpha.15 golden slice creates a real, editable seven-slide `.pptx` plus a Markdown outline from a reporting brief. The user can download the draft, submit one batch of feedback to create a new preserved version, accept the final artifact, and then keep or skip the optional learning suggestion.

Chinese is the primary language and English is fully available. Ordinary users do not need to see Agent sessions, Skill commands, RPC names, or sidecar files.

## Install in an isolated Web Profile

```powershell
$env:DSH_HOME = 'C:\path\to\isolated-dsh-home'
dsh plugin --profile web add C:\path\to\mwangxiang-dsh-visual-learner-0.1.0-alpha.18.tgz
dsh web --no-open --port 3080
```

Remove only the Bundle:

```powershell
dsh plugin --profile web remove @mwangxiang/dsh-visual-learner
```

Removal does not delete `work-projects/`, generated deliverables, or distilled assets.

## Current release boundary

This package is private and intended for partner testing only. Public npm publication or redistribution remains blocked until the embedded learning source has a clear license or equivalent release grant.

The current slice is intentionally presentation-first. It proves the product flow and controlled artifact generation; additional artifact types and full real-model capability coverage remain later gates.
