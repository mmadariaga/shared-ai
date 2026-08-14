# apply-coordinator-verification Specification

## Purpose
TBD - created by archiving change delegate-apply-steps-to-subagent. Update Purpose after archive.

## Requirements
### Requirement: Coordinator re-runs the Step's Verification Checklist itself

Before marking a Step's checkboxes or proposing a commit, the coordinator SHALL re-run the Step's Verification Checklist itself and confirm it passes. The coordinator SHALL NOT mark checkboxes or commit based solely on the worker report. Before dispatching the Step, the coordinator SHALL establish a pre-dispatch working-tree baseline of tracked and untracked paths visible to the coordinator and SHALL determine the Step's plan-level file scope and the dispatch-kind-specific allowed-file set. For a GREEN-direct dispatch, the allowed-file set SHALL be the Step's plan-level files. For a blind RED-worker dispatch, it SHALL contain only the plan-authorized test files and explicitly permitted RED/interface stub files and SHALL exclude production files. For a GREEN-worker dispatch, it SHALL contain only the plan-authorized production files and SHALL exclude test files and declared interfaces. The coordinator SHALL inject that plan-derived allowed-file set into the corresponding dispatch, while the baseline and the coordinator's recovery assessment SHALL remain coordinator-only.

Each dispatch SHALL have the declared scratch path `.tmp/{change-name}/`, computed from the coordinator's own change-name argument and not from a worker report. The scratch path SHALL be excluded from the allowed-file set and from field 8's file set. After every dispatch returns, regardless of whether it returns a clean report, STOP, failure, or no report because of a crash, the coordinator SHALL unconditionally sweep the exact per-change scratch path, removing all of its contents and the directory, before any post-dispatch path comparison. This is pre-authorized, location-based cleanup of the declared worker-owned working path, not a judgement over arbitrary files and not same-worker retry correction. The sweep SHALL run once per dispatch, including each dispatch in a split-routed Step. After each coordinator-owned run of the Step's Verification Checklist, the coordinator SHALL sweep the exact per-change scratch path again before the final path comparison or any subsequent dispatch. When a coordinator sweep removes one or more paths, it SHALL emit one trace line in the form `> Scratch cleanup: removed <paths>`. When only the per-change directory is removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/`; when both the per-change directory and its newly created empty parent are removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/, .tmp/`. An empty sweep SHALL emit no trace line. The trace SHALL identify paths, not scratch contents. If the `.tmp/` parent did not exist in the first pre-dispatch baseline of the apply run and is empty after a per-change directory is removed, the coordinator SHALL remove that parent; a pre-existing or non-empty `.tmp/` parent SHALL remain untouched. A STOP, failure, or crash still follows the existing halt and human-intervention handling, but it SHALL NOT preserve scratch as a separate episode and SHALL NOT require an acknowledgement before another dispatch.

After the final scratch sweep, coordinator evidence SHALL include both the Verification Checklist result and an independent comparison of observed changed paths with the pre-dispatch baseline, the dispatch-kind-specific allowed-file set, and the report's `Files modified` field. Scratch paths removed by the ordered sweeps SHALL not enter that comparison. If either kind of coordinator evidence contradicts the report, the coordinator SHALL classify whether the evidence directly disproves the report and whether the cause and correction are clear, safe, limited to the current Step, and within the existing plan scope. For a file-scope discrepancy, automatic correction is eligible only when the unexpected path was absent from the baseline, was newly created by the current dispatch, and can be safely and reversibly restored under existing authorization; paths present in the baseline, unknown or shared paths, and destructive or unauthorized corrections are not eligible. Correction that only undoes the current dispatch's own scope violation is treated as corrective scope, not feature work. A discrepancy that meets all of those conditions SHALL enter same-worker retry (continuation of the same GREEN worker session with the failing path and evidence, cap 3, per `apply-same-worker-retry`) before any checkbox marking or commit proposal — this correction channel exists for GREEN-worker results only. Scope drift that does not meet those conditions SHALL halt for human intervention; the scratch sweep SHALL NOT broaden that correction eligibility or silently delete out-of-scope work. A same-worker continuation return receives its own scratch sweep before its changed-path comparison, and no fresh recovery worker is introduced.

#### Scenario: Worker reports GREEN pass and coordinator confirms it
- **WHEN** the worker report says the Step's GREEN verification passed, the coordinator's Verification Checklist also passes, and the independent file-scope comparison finds no discrepancy
- **THEN** the coordinator continues the normal post-verification flow and may mark the Step's checkboxes only after any required human verification

#### Scenario: Coordinator identifies a recoverable false report
- **WHEN** the worker report disagrees with the coordinator's Verification Checklist or independent file-scope comparison, and coordinator evidence proves one or more report claims false with clear, safe corrections inside the current Step and plan scope
- **THEN** the coordinator does not mark checkboxes or propose a commit, and continues the same GREEN worker session with the failing path and evidence (cap 3)

#### Scenario: File-scope discrepancy exists while verification passes
- **WHEN** the Verification Checklist passes but the coordinator's post-dispatch comparison shows that the report's `Files modified` claim violates the Step's allowed scope or differs from the pre-dispatch baseline
- **THEN** the coordinator treats the file-scope evidence as a report discrepancy and evaluates it for same-worker retry without requiring a failed Verification Checklist

#### Scenario: Discrepancy is not clearly recoverable
- **WHEN** the coordinator cannot establish the report's cause and a safe in-scope correction, or the correction would be destructive or expand scope
- **THEN** the coordinator does not continue the worker, does not mark checkboxes, does not propose a commit, and surfaces the discrepancy for human intervention

#### Scenario: Non-empty dispatch outcome triggers a scratch sweep and trace
- **WHEN** a dispatch returns a clean report, STOP, failure, or no report because of a crash after using `.tmp/{change-name}/`
- **THEN** the coordinator removes the exact per-change scratch directory and contents, emits the required cleanup trace, and does not create a preserved-scratch acknowledgement episode

#### Scenario: Empty scratch sweep stays silent
- **WHEN** a dispatch and its coordinator Verification Checklist run create no files under `.tmp/{change-name}/` and the exact per-change scratch directory does not exist
- **THEN** the coordinator still performs the unconditional sweep but emits no cleanup trace line

#### Scenario: Scratch created by coordinator verification is swept
- **WHEN** the coordinator's focused Verification Checklist run creates files under `.tmp/{change-name}/`
- **THEN** the coordinator sweeps that directory after the verification run, emits the required cleanup trace, and excludes the removed scratch from the final changed-path comparison

#### Scenario: Scratch is swept before path comparison
- **WHEN** a dispatch or coordinator verification run creates temporary scaffolding under `.tmp/{change-name}/`
- **THEN** the relevant sweep completes before the coordinator compares post-operation paths with the baseline, allowed-file set, or field 8, and the scratch files do not produce a discrepancy

#### Scenario: Scratch is swept independently for split dispatches
- **WHEN** the blind RED worker and GREEN worker dispatches of one Step return and use the declared scratch location
- **THEN** the coordinator performs the unconditional sweep and emits its trace after each dispatch before that dispatch's path comparison, rather than waiting until the Step ends

#### Scenario: Same-worker continuation return triggers its own scratch sweep
- **WHEN** a same-worker continuation returns after using `.tmp/{change-name}/`
- **THEN** the coordinator performs the same unconditional sweep and trace before comparing that continuation outcome's changed paths, without waiting for another dispatch or the Step to end

#### Scenario: Fast-track uses the same unconditional scratch cleanup
- **WHEN** `--fast-track` is active and a dispatch or coordinator Verification Checklist run uses `.tmp/{change-name}/`
- **THEN** the coordinator performs the same unconditional sweep and trace without presenting, deferring, or auto-confirming a preserved-scratch acknowledgement

#### Scenario: Newly created scratch parent is removed safely
- **WHEN** the first pre-dispatch baseline shows no `.tmp/` parent, a dispatch or coordinator verification run creates only `.tmp/{change-name}/` scratch, and the per-change directory is removed
- **THEN** the coordinator removes the now-empty `.tmp/` parent, emits exactly `> Scratch cleanup: removed .tmp/{change-name}/, .tmp/`, and does not leave a scratch namespace behind

#### Scenario: Existing scratch parent is preserved
- **WHEN** the first pre-dispatch baseline already contains `.tmp/` or another file remains under `.tmp/` after a per-change sweep
- **THEN** the coordinator removes only `.tmp/{change-name}/`, does not remove the pre-existing or non-empty `.tmp/` parent, and traces only the paths actually removed

#### Scenario: Scope drift still halts
- **WHEN** a dispatch creates a path outside its injected allowed-file set and outside `.tmp/{change-name}/`
- **THEN** the coordinator's path comparison treats the path as scope drift and halts for human intervention unless the existing same-worker retry eligibility conditions independently hold

### Requirement: Repository-owned scratch fixtures tear down their exact path

A repository test fixture that creates an apply-style per-change scratch directory SHALL tear down that exact directory before the test completes. Fixture teardown SHALL remain local to the test, SHALL NOT alter the behavior under test, and SHALL NOT remove unrelated `.tmp/` content. The opencode agent-census fixture SHALL tear down `.tmp/derive-opencode-agent-census-from-bindings/` after its census assertions.

#### Scenario: Census fixture leaves no per-change scratch
- **WHEN** the focused opencode agent-census fixture test completes
- **THEN** `.tmp/derive-opencode-agent-census-from-bindings/` does not exist and the existing census result remains unchanged

#### Scenario: Census fixture teardown preserves unrelated scratch
- **WHEN** unrelated content exists under `.tmp/` while the opencode agent-census fixture tears down its scratch
- **THEN** teardown removes only `.tmp/derive-opencode-agent-census-from-bindings/` and preserves the unrelated content

### Requirement: Verification re-run must be the quiet confirmation, not the full execution

The coordinator's re-run SHALL be limited to the Step's Verification Checklist (the green confirmation), not a re-execution of the RED->GREEN cycle or the read-before-write reads, so the coordinator's context stays clean.

#### Scenario: Coordinator validates a completed Step
- **WHEN** the coordinator validates a Step a worker already executed
- **THEN** it runs only the Step's Verification Checklist commands, not the RED test runs or file dumps that the worker already absorbed

### Requirement: Same-worker retry is bounded and receives structured diagnosis

For a coordinator-disproven report, the coordinator SHALL perform at most three continuations of the same GREEN worker session per Step/report handling cycle, aggregating every confirmed contradiction from that report into the same continuation payload — the shared bounded same-worker recovery pool declared via `recovery_policy: true` per `apply-same-worker-retry`. The continuation SHALL retain the ordinary dispatch's existing context and SHALL add exactly the recovery content: `Reported` (all contradictory claims from the worker report), `Evidence` (all relevant coordinator observations), `Cause` (the diagnosed execution defects), `Correction` (the exact safe corrections), and `Verification` (the normal Verification Checklist to re-run and its pass condition). The recovery content SHALL preserve the dispatch kind's existing restrictions — the GREEN worker's test-file prohibition, no raw output, no change-artifact reads, and the fixed report contract. The coordinator's pre-dispatch baseline and per-report recovery assessment SHALL remain coordinator-only state and SHALL NOT be included in any dispatch. The plan-derived allowed-file set remains part of the ordinary dispatch context inherited by the continuation. The continuation SHALL remain limited to the current Step and existing plan scope, shall not add an advisor tier, and shall not change the fixed report field set. The RED worker SHALL NOT be a retry target for GREEN-worker results. A discrepancy in a blind-RED or green-exception RED dispatch result SHALL NOT enter same-worker retry (no RED continuation channel is defined by this change): the coordinator SHALL halt for human intervention, regardless of whether the discrepancy meets the eligibility conditions.

#### Scenario: Known file-scope mistake is corrected via continuation
- **WHEN** a worker report claims a file outside the Step was modified, the coordinator's baseline shows that the path was absent before dispatch and the current dispatch created it, and a safe reversible restoration is authorized
- **THEN** the coordinator continues the same GREEN worker session once with the recovery content, and does not start a fresh worker for that discrepancy

#### Scenario: Recovery content is layered onto the continuation
- **WHEN** a same-worker continuation is selected for a GREEN-direct or split-routed Step
- **THEN** the coordinator supplies the existing dispatch context unchanged followed by the recovery content, while retaining the applicable blindness, test-file, no-exploration, and report rules

#### Scenario: Multiple contradictions share one continuation
- **WHEN** one worker report contains multiple confirmed contradictions with clear, safe, in-scope corrections
- **THEN** the coordinator aggregates their reported claims, evidence, causes, corrections, and verification into one continuation payload and performs only one continuation per Step/report handling cycle

#### Scenario: Unknown or shared file-scope change is not recoverable
- **WHEN** an unexpected path was present or modified before the dispatch, cannot be attributed to the current dispatch, is shared with another worker, or would require destructive or unauthorized cleanup
- **THEN** the coordinator does not continue the worker and surfaces the discrepancy for human intervention

#### Scenario: False GREEN failure has a safe correction
- **WHEN** a worker reports GREEN failure but coordinator evidence identifies a clear execution or report correction that stays within the Step
- **THEN** the coordinator may use one same-worker continuation to apply that correction or reconcile the execution result, without treating the discrepancy as a human decision

#### Scenario: Retry remains bounded after scratch cleanup
- **WHEN** a clean-return scratch sweep removes temporary scaffolding before path comparison and a separate out-of-scope path remains
- **THEN** the coordinator evaluates only the remaining path under the existing three-continuation eligibility rules and does not use scratch cleanup to authorize a further continuation

### Requirement: Successful same-worker retry returns to normal verification

After a same-worker continuation returns, the coordinator SHALL re-run the normal Step Verification Checklist itself. The coordinator SHALL treat coordinator verification as authoritative over the corrective worker report. If the checklist passes, the coordinator SHALL resume the existing post-verification order, including learnings, Human Verification when required, checkbox marking, appendices, and commit gating. If the checklist fails, or if the continuation reports an unresolved, unsafe, destructive, or out-of-scope result, the coordinator SHALL stop retrying, SHALL NOT mark the Step's checkboxes or propose a commit, and SHALL surface the issue for human intervention. No fourth continuation is permitted for the same detected discrepancy.

#### Scenario: Continuation passes coordinator verification
- **WHEN** the same-worker continuation completes and the coordinator's rerun of the Step's Verification Checklist passes
- **THEN** the coordinator continues the normal workflow automatically and may advance only after the existing human and commit gates are satisfied

#### Scenario: Continuation verification still fails
- **WHEN** the coordinator's post-continuation Verification Checklist fails
- **THEN** the coordinator halts for human intervention without further continuation, checkbox marking, commit proposal, or advancement to the next Step

#### Scenario: Continuation would be unsafe or out of scope
- **WHEN** the corrective continuation would require destructive action, authorization not already granted, or changes outside the current Step and existing plan
- **THEN** the coordinator halts for human intervention and does not execute that correction or any further continuation
