# apply-coordinator-verification Specification

## Purpose
TBD - created by archiving change delegate-apply-steps-to-subagent. Update Purpose after archive.

## Requirements
### Requirement: Coordinator re-runs the Step's Verification Checklist itself

Before marking a Step's checkboxes or proposing a commit, the coordinator SHALL re-run the Step's Verification Checklist itself and confirm it passes. The coordinator SHALL NOT mark checkboxes or commit based solely on the Subagent Report. Before dispatching the Step, the coordinator SHALL establish a pre-dispatch working-tree baseline of tracked and untracked paths visible to the coordinator and SHALL determine the Step's plan-level file scope and the dispatch-kind-specific allowed-file set. For a single dispatch, the allowed-file set SHALL be the Step's plan-level files. For a blind test-writer dispatch, it SHALL contain only the plan-authorized test files and explicitly permitted RED/interface stub files and SHALL exclude production files. For an implementation dispatch, it SHALL contain only the plan-authorized production files and SHALL exclude test files and declared interfaces. The coordinator SHALL inject that plan-derived allowed-file set into the corresponding dispatch prompt, while the baseline and the coordinator's recovery assessment SHALL remain coordinator-only.

Each dispatch SHALL have the declared scratch path `.tmp/{change-name}/`, computed from the coordinator's own change-name argument and not from a Subagent Report. The scratch path SHALL be excluded from the allowed-file set and from field 8's file set. After every dispatch returns, regardless of whether it returns a clean report, STOP, failure, or no report because of a crash, the coordinator SHALL unconditionally sweep the exact per-change scratch path, removing all of its contents and the directory, before any post-dispatch path comparison. The sweep SHALL run once per dispatch, including each dispatch in a split-routed Step. After each coordinator-owned run of the Step's Verification Checklist, the coordinator SHALL sweep the exact per-change scratch path again before the final path comparison or any subsequent dispatch. When a coordinator sweep removes one or more paths, it SHALL emit one trace line in the form `> Scratch cleanup: removed <paths>`. When only the per-change directory is removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/`; when both the per-change directory and its newly created empty parent are removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/, .tmp/`. An empty sweep SHALL emit no trace line. The trace SHALL identify paths, not scratch contents. If the `.tmp/` parent did not exist in the first pre-dispatch baseline of the apply run and is empty after a per-change directory is removed, the coordinator SHALL remove that parent; a pre-existing or non-empty `.tmp/` parent SHALL remain untouched. A STOP, failure, or crash still follows the existing halt and human-intervention handling, but it SHALL NOT preserve scratch as a separate episode and SHALL NOT require an acknowledgement before another dispatch.

After the ordered sweep, coordinator evidence SHALL include both the Verification Checklist result and an independent comparison of observed changed paths with the pre-dispatch baseline, the dispatch-kind-specific allowed-file set, and the report's `Files modified` field. Scratch paths removed by the ordered sweep SHALL not enter that comparison. Repository-owned scratch fixtures tear down their exact path before this comparison; for example, the census fixture `.tmp/derive-opencode-agent-census-from-bindings/` is temporary scratch, not a feature output. If either kind of coordinator evidence contradicts the report, the coordinator SHALL classify whether the evidence directly disproves the report and whether the cause and correction are clear, safe, limited to the current Step, and within the existing plan scope. For a file-scope discrepancy, automatic cleanup is eligible only when the unexpected path was absent from the baseline, was newly created by the current dispatch, and can be safely and reversibly restored under existing authorization; paths present in the baseline, unknown or shared paths, and destructive or unauthorized corrections are not eligible. Cleanup that only undoes the current dispatch's own scope violation is treated as corrective scope, not feature work. A discrepancy that meets all of those conditions SHALL enter Known-False Report Recovery before any checkbox marking or commit proposal. Scope drift that does not meet those conditions SHALL halt for human intervention; scratch cleanup MUST NOT broaden Known-False Report Recovery eligibility or silently delete out-of-scope work. A Recovery Dispatch return receives its own scratch sweep before its changed-path comparison, and no second recovery is introduced.

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

#### Scenario: Every dispatch outcome receives an unconditional scratch sweep
- **WHEN** a dispatch returns a clean report, STOP, failure, or no report because of a crash after using `.tmp/{change-name}/`
- **THEN** the coordinator sweeps exactly that per-change scratch path before comparing post-dispatch paths, and the outcome follows its existing halt or verification handling without a separate scratch episode or acknowledgement

#### Scenario: Scratch is swept independently for split dispatches
- **WHEN** both the blind test-writer and implementation dispatch return for one Step and each uses the declared scratch location
- **THEN** the coordinator performs the sweep once after the first dispatch and once after the second dispatch, before each dispatch-specific path comparison

#### Scenario: Coordinator verification sweep precedes final comparison
- **WHEN** the coordinator-owned Verification Checklist completes
- **THEN** the coordinator sweeps the exact per-change scratch path again before final path comparison or any subsequent dispatch

#### Scenario: Scratch cleanup emits only pinned path traces
- **WHEN** a coordinator sweep removes the per-change directory, with or without its newly created empty parent
- **THEN** it emits exactly `> Scratch cleanup: removed .tmp/{change-name}/` or `> Scratch cleanup: removed .tmp/{change-name}/, .tmp/`, while an empty sweep emits no trace and no scratch contents

#### Scenario: Newly created scratch parent is removed safely
- **WHEN** the first pre-dispatch baseline shows no `.tmp/` parent, a clean dispatch creates only `.tmp/{change-name}/` scratch, and the per-change directory is removed
- **THEN** the coordinator removes the newly created empty `.tmp/` parent and does not leave a scratch namespace behind

#### Scenario: Existing scratch parent is preserved
- **WHEN** the first pre-dispatch baseline already contains `.tmp/` or another file remains under `.tmp/` after the per-change sweep
- **THEN** the coordinator removes only `.tmp/{change-name}/` and leaves the pre-existing or non-empty `.tmp/` parent untouched

#### Scenario: Repository-owned scratch fixtures tear down their exact path
- **WHEN** a repository-owned census fixture creates `.tmp/derive-opencode-agent-census-from-bindings/`
- **THEN** the fixture and coordinator tear down that exact path, and it is excluded from feature outputs and changed-path comparison

#### Scenario: Unrelated scratch remains outside the declared per-change path
- **WHEN** an unrelated scratch path exists outside `.tmp/{change-name}/`
- **THEN** the coordinator does not remove it as part of the declared sweep and applies the existing scope-drift and recovery rules

#### Scenario: Scope drift still halts
- **WHEN** a dispatch creates a path outside its injected allowed-file set and outside `.tmp/{change-name}/`
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
