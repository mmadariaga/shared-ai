**Complexity**: medium

## Why

The preserved-scratch acknowledgement gate interrupts `/sai-4-apply` for agent-owned working files whose diagnostic value has not been demonstrated, and it repeatedly fires when coordinator verification recreates benign installer fixtures. The apply contract should treat `.tmp/{change-name}/` as disposable working space, clean it deterministically after every relevant operation, and leave a trace instead of blocking on acknowledgement.

## What Changes

- Make the `/sai-4-apply` coordinator sweep `.tmp/{change-name}/` after every dispatch outcome and after each coordinator-owned Verification Checklist run, including scratch created by verification itself.
- Emit a trace line for every coordinator sweep that removes one or more paths, including the per-change path and any newly created empty `.tmp/` parent removed under the existing baseline condition.
- Remove the preserved-scratch episode, acknowledgement, fast-track exception, and repeated-episode concepts from the apply contract and active specifications.
- Retain the exact cleanup boundary, the newly-created-and-empty `.tmp/` parent removal exception, scratch exclusion from comparisons and reports, scope-drift handling, recovery eligibility, Human Verification, and commit authorization.
- Remove the worker requirement to preserve scratch on STOP or failure, and authorize workers to remove scratch on clean return without requiring them to do so; coordinator cleanup owns the path after every dispatch outcome.
- Add teardown for the census fixture scratch directory in `test/install-opencode.test.js` so the test suite does not leave `.tmp/derive-opencode-agent-census-from-bindings/` behind.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `apply-coordinator-verification`: Make scratch cleanup unconditional, traceable, and inclusive of coordinator verification reruns; remove preserved-scratch acknowledgement scenarios, rebase recovery-boundary wording on coordinator sweeps, and retain parent cleanup and comparison boundaries.
- `sai-fast-track-flag`: Remove the dedicated requirement that preserved-scratch acknowledgement remains in force under fast-track.
- `apply-step-delegation`: Stop requiring workers to preserve scratch on STOP or failure and make clean-return removal optional because the coordinator sweeps it after every dispatch outcome.

## Impact

- `sai/instructions/apply.md`
- `openspec/specs/apply-coordinator-verification/spec.md`
- `openspec/specs/sai-fast-track-flag/spec.md`
- `openspec/specs/apply-step-delegation/spec.md`
- `test/apply-coordinator-verification.test.js`
- `test/install-opencode.test.js`

No new dependency, API, harness surface, or archived artifact is introduced. Cleanup remains confined to `.tmp/{change-name}/`, with `.tmp/` removable only when it was absent from the first pre-dispatch baseline and empty after the per-change directory is removed. Non-scratch paths remain subject to existing baseline, scope, recovery, reporting, and commit rules.

## Proposal Research Documentation

**Local files**: `sai/instructions/apply.md` (scratch lifecycle, verification ordering, fast-track rule, worker dispatch rules); `openspec/specs/apply-coordinator-verification/spec.md`; `openspec/specs/sai-fast-track-flag/spec.md`; `openspec/specs/apply-step-delegation/spec.md`; `test/apply-coordinator-verification.test.js`; `test/install-opencode.test.js`; `GLOSSARY.md`; `openspec/changes/archive/2026-08-05-apply-worker-scope-and-scratch-discipline/specs/apply-coordinator-verification/spec.md`; `openspec/changes/archive/2026-08-05-apply-worker-scope-and-scratch-discipline/specs/apply-step-delegation/spec.md`; `openspec/changes/archive/2026-07-29-recover-known-false-subagent-reports/specs/apply-coordinator-verification/spec.md`; `openspec/changes/archive/2026-07-20-sai-apply-fast-track-auto-stay-branch/specs/sai-fast-track-flag/spec.md`.

**External URLs**: None.

## Additional Notes

- The cleanup trace is the user-visible replacement for the acknowledgement prompt; it identifies actual removed paths without exposing scratch contents. Empty sweeps remain silent because no cleanup occurred.
- A non-clean dispatch may still stop the apply workflow for its existing failure or STOP handling, but it no longer preserves scratch as a separate acknowledgement episode.
- The installer census fixture teardown is test hygiene required by this change, not a new runtime scratch namespace or a change to census behavior.
