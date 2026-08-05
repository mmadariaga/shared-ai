# apply-coordinator-verification Specification

## Purpose
TBD - created by archiving change delegate-apply-steps-to-subagent. Update Purpose after archive.

## Requirements
### Requirement: Coordinator re-runs the Step's Verification Checklist itself

Before marking a Step's checkboxes or proposing a commit, the coordinator SHALL re-run the Step's Verification Checklist itself and confirm it passes. The coordinator SHALL NOT mark checkboxes or commit based solely on the Subagent Report. Before dispatching the Step, the coordinator SHALL establish a pre-dispatch working-tree baseline of tracked and untracked paths visible to the coordinator and SHALL determine the Step's plan-level file scope and the dispatch-kind-specific allowed-file set. For a single dispatch, the allowed-file set SHALL be the Step's plan-level files. For a blind test-writer dispatch, it SHALL contain only the plan-authorized test files and explicitly permitted RED/interface stub files and SHALL exclude production files. For an implementation dispatch, it SHALL contain only the plan-authorized production files and SHALL exclude test files and declared interfaces. The coordinator SHALL inject that plan-derived allowed-file set into the corresponding dispatch prompt, while the baseline and the coordinator's recovery assessment SHALL remain coordinator-only.

Each dispatch SHALL have the declared scratch path `.tmp/{change-name}/`, computed from the coordinator's own change-name argument and not from a Subagent Report. The scratch path SHALL be excluded from the allowed-file set and from field 8's file set. On a clean dispatch return only, before any post-dispatch path comparison, the coordinator SHALL unconditionally sweep the exact per-change scratch path, removing all of its contents and the directory. This is pre-authorized, location-based cleanup of the declared worker scratch path, not a judgement over arbitrary files and not Known-False Report Recovery. The sweep SHALL run once per dispatch, including each dispatch in a split-routed Step. If the `.tmp/` parent did not exist in the first pre-dispatch baseline of the apply run and is empty after the per-change directory is removed, the coordinator SHALL remove that parent; a pre-existing or non-empty `.tmp/` parent SHALL remain untouched. If the dispatch returns STOP, failure, or no report because of a crash, the coordinator SHALL not sweep and SHALL preserve the scratch path for human inspection. A preserved-scratch episode starts when a non-clean outcome leaves `.tmp/{change-name}/` for inspection, or when a resumed run finds that path left by an earlier non-clean outcome, and ends only when a clean-return sweep removes that per-change directory. Before a subsequent dispatch for the same change may begin during that episode, the coordinator SHALL obtain one explicit human confirmation that the episode's preserved evidence has been inspected or is no longer needed. This acknowledgement gate is separate from Human Verification and commit authorization; `--fast-track` SHALL neither defer it to the Final sweep nor auto-confirm it. If another dispatch in the same episode returns non-clean, the coordinator SHALL preserve the path and SHALL NOT ask for a second acknowledgement for that episode.

After a clean-return sweep, coordinator evidence SHALL include both the Verification Checklist result and an independent comparison of observed changed paths with the pre-dispatch baseline, the dispatch-kind-specific allowed-file set, and the report's `Files modified` field. Scratch paths removed by the ordered sweep SHALL not enter that comparison. If either kind of coordinator evidence contradicts the report, the coordinator SHALL classify whether the evidence directly disproves the report and whether the cause and correction are clear, safe, limited to the current Step, and within the existing plan scope. For a file-scope discrepancy, automatic cleanup is eligible only when the unexpected path was absent from the baseline, was newly created by the current dispatch, and can be safely and reversibly restored under existing authorization; paths present in the baseline, unknown or shared paths, and destructive or unauthorized corrections are not eligible. Cleanup that only undoes the current dispatch's own scope violation is treated as corrective scope, not feature work. A discrepancy that meets all of those conditions SHALL enter Known-False Report Recovery before any checkbox marking or commit proposal. Scope drift that does not meet those conditions SHALL halt for human intervention; the scratch sweep SHALL NOT broaden that recovery eligibility or silently delete out-of-scope work.

#### Scenario: Subagent reports GREEN pass and coordinator confirms it
- **WHEN** the Subagent Report says the Step's GREEN verification passed, the coordinator's Verification Checklist also passes, and the independent file-scope comparison finds no discrepancy
- **THEN** the coordinator continues the normal post-verification flow and may mark the Step's checkboxes only after any required human verification

#### Scenario: Coordinator identifies a recoverable false report
- **WHEN** the Subagent Report disagrees with the coordinator's Verification Checklist or independent file-scope comparison, and coordinator evidence proves one or more report claims false with clear, safe corrections inside the current Step and plan scope
- **THEN** the coordinator does not mark checkboxes or propose a commit, and starts one Known-False Report Recovery attempt

#### Scenario: File-scope discrepancy exists while verification passes
- **WHEN** the Verification Checklist passes but the coordinator's post-dispatch comparison shows that the report's `Files modified` claim violates the Step's allowed scope or differs from the pre-dispatch baseline
- **THEN** the coordinator treats the file-scope evidence as a report discrepancy and evaluates it for Known-False Report Recovery without requiring a failed Verification Checklist

#### Scenario: Discrepancy is not clearly recoverable
- **WHEN** the coordinator cannot establish the report's cause and a safe in-scope correction, or the correction would be destructive or expand scope
- **THEN** the coordinator does not dispatch recovery, does not mark checkboxes, does not propose a commit, and surfaces the discrepancy for human intervention

#### Scenario: Clean return sweeps scratch before comparison
- **WHEN** a dispatch returns a complete successful report after creating files under `.tmp/{change-name}/`
- **THEN** the coordinator sweeps exactly that per-change scratch path before comparing post-dispatch paths with the baseline, allowed-file set, or field 8, and the scratch files do not produce a discrepancy

#### Scenario: Scratch is swept independently for split dispatches
- **WHEN** both the blind test-writer and implementation dispatch return cleanly for one Step and each uses the declared scratch location
- **THEN** the coordinator performs the backstop sweep after each dispatch and before each dispatch-specific path comparison, rather than waiting until the Step ends

#### Scenario: Non-clean return preserves scratch
- **WHEN** a dispatch reaches STOP, reports failure, or crashes before returning a clean report after using `.tmp/{change-name}/`
- **THEN** the coordinator preserves the scratch path, surfaces the non-clean outcome for human intervention, and requires one human acknowledgement that the episode's evidence was inspected or consumed before another dispatch for the same change begins

#### Scenario: Fast-track does not auto-confirm preserved scratch
- **WHEN** `--fast-track` is active and a non-clean dispatch leaves `.tmp/{change-name}/` preserved
- **THEN** the coordinator still waits for explicit human acknowledgement before dispatching the same change again, rather than deferring the gate to the Final sweep or auto-confirming it

#### Scenario: Repeated non-clean returns do not re-ask within one episode
- **WHEN** a human has acknowledged a preserved-scratch episode, the next dispatch in that episode also returns non-clean, and no clean-return sweep has removed `.tmp/{change-name}/`
- **THEN** the coordinator preserves the scratch path and applies the existing non-clean halt handling without requesting a second acknowledgement for the same episode

#### Scenario: Newly created scratch parent is removed safely
- **WHEN** the first pre-dispatch baseline shows no `.tmp/` parent, a clean dispatch creates only `.tmp/{change-name}/` scratch, and the per-change directory is removed
- **THEN** the coordinator removes the now-empty `.tmp/` parent and does not leave a scratch namespace behind

#### Scenario: Existing scratch parent is preserved
- **WHEN** the first pre-dispatch baseline already contains `.tmp/` or another file remains under `.tmp/` after the per-change sweep
- **THEN** the coordinator removes only `.tmp/{change-name}/` and leaves the pre-existing or non-empty `.tmp/` parent untouched

#### Scenario: Scope drift still halts
- **WHEN** a clean dispatch creates a path outside its injected allowed-file set and outside `.tmp/{change-name}/`
- **THEN** the coordinator's path comparison treats the path as scope drift and halts for human intervention unless the existing Known-False Report Recovery eligibility conditions independently hold

### Requirement: Verification re-run must be the quiet confirmation, not the full execution

The coordinator's re-run SHALL be limited to the Step's Verification Checklist (the green confirmation), not a re-execution of the RED->GREEN cycle or the read-before-write reads, so the coordinator's context stays clean.

#### Scenario: Coordinator validates a completed Step
- **WHEN** the coordinator validates a Step the subagent already executed
- **THEN** it runs only the Step's Verification Checklist commands, not the RED test runs or file dumps that the subagent already absorbed

### Requirement: Recovery Dispatch is bounded and receives structured diagnosis

For a Known-False Report Recovery, the coordinator SHALL perform at most one Recovery Dispatch per Step/report handling cycle, aggregating every confirmed contradiction from that report into the same attempt and recovery block. The Recovery Dispatch SHALL retain the ordinary dispatch's existing three prompt parts as its first three sections and SHALL add exactly one fourth section: a dedicated recovery block with these headings in this order: `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification`. `Reported` SHALL state all contradictory claims from the Subagent Report; `Evidence` SHALL state all relevant coordinator observations; `Cause` SHALL state the diagnosed execution defects; `Correction` SHALL state the exact safe corrections; and `Verification` SHALL state the normal Verification Checklist to re-run and its pass condition. The fourth section SHALL preserve all existing dispatch restrictions, including blindness rules, test-file restrictions, no raw output, no change-artifact reads, and the fixed Subagent Report contract; it SHALL NOT reveal implementation details forbidden to a blind test-writer. The coordinator's pre-dispatch baseline and per-report recovery assessment SHALL remain coordinator-only state and SHALL NOT be included in any dispatch prompt. The plan-derived allowed-file set remains part of the ordinary dispatch prompt inherited by the Recovery Dispatch. The Recovery Dispatch SHALL remain limited to the current Step and existing plan scope, shall not add an advisor tier, and shall not change the fixed Subagent Report field set.

#### Scenario: Known file-scope mistake is corrected once
- **WHEN** a Subagent Report claims a file outside the Step was modified, the coordinator's baseline shows that the path was absent before dispatch and the current dispatch created it, and a safe reversible restoration is authorized
- **THEN** the coordinator dispatches one corrective subagent with the five-field recovery block, and does not dispatch a second recovery for that discrepancy

#### Scenario: Recovery block is layered onto an existing dispatch
- **WHEN** a Recovery Dispatch is selected for a single-dispatch or split-routed Step
- **THEN** the coordinator supplies the existing dispatch prompt parts unchanged followed by the dedicated recovery block, while retaining the applicable blindness, test-file, no-exploration, and report rules

#### Scenario: Multiple contradictions share one recovery attempt
- **WHEN** one Subagent Report contains multiple confirmed contradictions with clear, safe, in-scope corrections
- **THEN** the coordinator aggregates their reported claims, evidence, causes, corrections, and verification into one recovery block and performs only one Recovery Dispatch for that Step/report handling cycle

#### Scenario: Unknown or shared file-scope change is not recoverable
- **WHEN** an unexpected path was present or modified before the dispatch, cannot be attributed to the current dispatch, is shared with another worker, or would require destructive or unauthorized cleanup
- **THEN** the coordinator does not dispatch recovery and surfaces the discrepancy for human intervention

#### Scenario: False GREEN failure has a safe correction
- **WHEN** a subagent reports GREEN failure but coordinator evidence identifies a clear execution or report correction that stays within the Step
- **THEN** the coordinator may use one Recovery Dispatch to apply that correction or reconcile the execution result, without treating the discrepancy as a human decision

#### Scenario: Recovery remains bounded after scratch cleanup
- **WHEN** a clean-return scratch sweep removes temporary scaffolding before path comparison and a separate out-of-scope path remains
- **THEN** the coordinator evaluates only the remaining path under the existing single-recovery eligibility rules and does not use scratch cleanup to authorize a second recovery

### Requirement: Successful recovery returns to normal verification

After a Recovery Dispatch returns, the coordinator SHALL re-run the normal Step Verification Checklist itself. The coordinator SHALL treat coordinator verification as authoritative over the corrective Subagent Report. If the checklist passes, the coordinator SHALL resume the existing post-verification order, including learnings, Human Verification when required, checkbox marking, appendices, and commit gating. If the checklist fails, or if the Recovery Dispatch reports an unresolved, unsafe, destructive, or out-of-scope result, the coordinator SHALL stop recovery, SHALL NOT mark the Step's checkboxes or propose a commit, and SHALL surface the issue for human intervention. No second Recovery Dispatch is permitted for the same detected discrepancy.

#### Scenario: Recovery passes coordinator verification
- **WHEN** the single Recovery Dispatch completes and the coordinator's rerun of the Step's Verification Checklist passes
- **THEN** the coordinator continues the normal workflow automatically and may advance only after the existing human and commit gates are satisfied

#### Scenario: Recovery verification still fails
- **WHEN** the coordinator's post-recovery Verification Checklist fails
- **THEN** the coordinator halts for human intervention without retrying recovery, marking checkboxes, proposing a commit, or advancing to the next Step

#### Scenario: Recovery would be unsafe or out of scope
- **WHEN** the corrective dispatch would require destructive action, authorization not already granted, or changes outside the current Step and existing plan
- **THEN** the coordinator halts for human intervention and does not execute that correction or any further recovery attempt
