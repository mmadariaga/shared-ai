# MODIFIED-delta completeness guard

## Why

The sai-workflow schema requires every `## MODIFIED Requirements` entry to
include "full updated content", but nothing in the delta format distinguishes a
complete body from an incremental one, and the archive sync applies literal
replacement of the requirement without checking that its existing scenarios
survive. A well-intentioned incremental MODIFIED delta therefore destroys
content silently: during the Build (unattended) route, an archived MODIFIED
requirement dropped four existing scenarios from
`openspec/specs/explore-implementation-details/spec.md` (commit de03963f); the
loss was detected only by diffing against the base SHA and repaired in d8ff1dfc.
`openspec validate` gave green on the lossy delta — the CLI does not cover this,
so the completeness check must live in the SAI-owned cards that review and sync
specs.

## What Changes

1. **`sai/commands/archive/worker.md`**: add a MODIFIED-delta completeness check
   that compares each MODIFIED requirement's scenario set against the existing
   main-spec requirement at `openspec/specs/{capability}/spec.md`. A MODIFIED
   that drops an existing scenario is a net-loss candidate: reported in the
   combined delta-sync summary, never auto-proceeded under fast-track, and
   blocking the sync. The post-sync verification re-runs the check and stops
   before the archive move when any scenario was lost. The Build execution
   continuation's sync step also re-verifies scenario survival.

2. **`sai/commands/explore/steps/pipeline-auto-fast.md`**: the Build step-4
   spec review runs the same MODIFIED-delta completeness check read-only over
   the returned draft content, routing a dropped scenario as a High finding
   through the existing findings continuation.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- auto-fast-archive-execution
- explore-pipeline-supervision

## Impact

- `sai/commands/archive/worker.md` 18 insertions 2 deletions
- `sai/commands/explore/steps/pipeline-auto-fast.md` 1 insertion

Out of scope: the schema instruction text and `openspec validate` are
unchanged; the check is enforced by the SAI cards that review and sync specs.