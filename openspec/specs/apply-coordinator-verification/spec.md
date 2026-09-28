# apply-coordinator-verification Specification

## Purpose
TBD - created by archiving change delegate-apply-steps-to-subagent. Update Purpose after archive.

## Requirements

### Requirement: Coordinator re-runs the Step's Verification Checklist itself

Before marking a Step's checkboxes or proposing a commit, the coordinator SHALL re-run the Step's Verification Checklist itself and confirm it passes. The coordinator SHALL NOT mark checkboxes or commit based solely on the worker report. Before dispatching the Step, the coordinator SHALL establish a pre-dispatch working-tree baseline of tracked and untracked paths visible to the coordinator and SHALL determine the Step's plan-level file scope and the dispatch-kind-specific allowed-file set. For a GREEN-direct dispatch, the allowed-file set SHALL be the production-only subset of the Step's plan-level files. For a blind RED-worker dispatch, it SHALL contain only the plan-authorized test files and explicitly permitted RED/interface stub files and SHALL exclude production files. For a GREEN-worker dispatch, it SHALL contain only the plan-authorized production files and SHALL exclude test files and declared interfaces. The coordinator SHALL inject that plan-derived allowed-file set into the corresponding dispatch, while the baseline and the coordinator's recovery assessment SHALL remain coordinator-only.

Each dispatch SHALL have the declared scratch path `.tmp/{change-name}/`, computed from the coordinator's own change-name argument and not from a worker report. After every dispatch returns, regardless of whether it returns a clean report, STOP, failure, or no report because of a crash, the coordinator SHALL unconditionally sweep the exact per-change scratch path, removing all of its contents and the directory, before any post-dispatch path comparison. This is pre-authorized, location-based cleanup of the declared worker-owned working path, not a judgement over arbitrary files and not a same-worker retry correction. The sweep SHALL run once per dispatch, including each dispatch in a split-routed Step. After each coordinator-owned run of the Step's Verification Checklist, the coordinator SHALL sweep the exact per-change scratch path again before the final path comparison or any subsequent dispatch. When a coordinator sweep removes one or more paths, it SHALL emit one trace line in the form `> Scratch cleanup: removed <paths>`. When only the per-change directory is removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/`; when both the per-change directory and its newly created empty parent are removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/, .tmp/`. An empty sweep SHALL emit no trace line. If the `.tmp/` parent did not exist in the first pre-dispatch baseline of the apply run and is empty after a per-change directory is removed, the coordinator SHALL remove that parent; a pre-existing or non-empty `.tmp/` parent SHALL remain untouched. A STOP, failure, or crash still follows the existing halt and human-intervention handling, but it SHALL NOT preserve scratch as a separate episode and SHALL NOT require an acknowledgement before another dispatch.

After the final scratch sweep, coordinator evidence SHALL include both the applicable dispatch verification result and an independent comparison of observed changed paths with the pre-dispatch baseline, the dispatch-kind-specific allowed-file set, and the report's `Files modified` field. For a blind RED dispatch or a RED green-exception dispatch, the applicable verification result SHALL be the coordinator-owned RED Verification Checklist: the authored test has the expected assertion failure for the behavior under test, does not fail from setup/import/compilation, and remains within the RED allowed-file set. This checklist is an expected intermediate confirmation; it SHALL not mark the Step complete or require GREEN to pass. For a GREEN dispatch, the applicable result SHALL be the normal Step Verification Checklist. The coordinator SHALL inspect every run-closing result for clean versus non-clean closure; a completed worker report is non-clean when the applicable verification, path comparison, allowed-file comparison, or report comparison contradicts it. If either kind of coordinator evidence contradicts the report, the coordinator SHALL assign exactly one shared routing diagnosis and SHALL establish a `Cause Locus` relative to the active worker's authorized scope only when concrete evidence proves that boundary before selecting recovery. An out-of-scope claim SHALL name the artifact and concrete point that establish the boundary and SHALL spend zero worker-recovery attempts. If the available evidence cannot locate the cause or establish either boundary, the coordinator SHALL use the shared `coordinator rejection` hand-back with an explicitly unresolved cause, SHALL make no out-of-scope claim or locus assignment, and SHALL spend zero worker-recovery attempts until a human supplies the missing decision.

When an out-of-scope cause is a defect in the current Step's `implementation.md` plan artifact, the coordinator MAY perform at most one bounded plan-artifact repair in the active apply phase-adapter segment. The coordinator SHALL maintain a segment-local repair count; once one repair has been accepted, any later plan-artifact defect SHALL use the unresolved human hand-back route rather than an additional automatic repair. The repair SHALL be limited to the exact current-Step verification assertion or plan-artifact point identified by the evidence; it SHALL preserve the Step headings, checkbox semantics, plan-level file scope, declared worker prohibitions, and the Verification Checklist's effective coverage. For this comparison, the coordinator SHALL derive a `Coverage Signature` as the ordered list of each current-Step checklist entry's command identity, normalized repo-relative paths, scoped test selectors, assertion operator/target, and required pass/fail observation; artifact producer references SHALL be recorded separately. Normalization SHALL convert path separators to `/`, collapse non-semantic whitespace, and preserve command arguments, selectors, operators, and pass/fail polarity. A repair is coverage-equivalent only when the before/after Coverage Signatures have identical length and exact tuple values, while the separately recorded producer reference changes only from the named impossible later-Step point to an existing current-Step point. No command, selector, assertion, or failure observation may be deleted, disabled, broadened, or made less strict. The repair SHALL not edit production files, test files, declared interfaces, or any other artifact, SHALL not add a new Step, redefine scope, or reduce verification coverage, and SHALL not consume a worker recovery attempt. When the repair writes `implementation.md`, the coordinator SHALL add that path once to the invocation-scoped changed-files union as a coordinator-owned plan-artifact repair, SHALL include it in the final coordinator file report and authorized commit add-list, and SHALL exclude it from worker report field 8 and worker-scope drift evidence for the dispatch that preceded the repair. After the repair, the coordinator SHALL re-establish the current Step's projection and independently rerun the affected Verification Checklist before marking or advancing. If the plan-artifact defect or the before/after Coverage Signature equivalence is not clear and safely verifiable under these limits, the coordinator SHALL hand back to a human without editing it.

An in-scope cause with a clear, safe, reversible correction SHALL enter the shared same-worker recovery route before any checkbox marking or commit proposal. Scope drift that does not meet the in-scope conditions SHALL not be silently deleted or converted into worker work. A same-worker continuation return receives its own scratch sweep before its changed-path comparison, and no fresh recovery worker is introduced by this requirement.

The descriptive Coverage Signature above SHALL be materialized as an ordered list of records with exactly these fields: `ordinal`, `command_tokens`, `repo_relative_paths`, `selector`, `assertion_operator`, `assertion_target`, and `pass_observation`. `command_tokens` SHALL preserve executable and argument token order; `repo_relative_paths` SHALL use `/`, remove a leading `./`, and reject `..` traversal; `selector` SHALL be the exact normalized test selector or `<none>`; `assertion_operator` and `assertion_target` SHALL preserve the comparison operator and normalized subject; and `pass_observation` SHALL be the exact expected pass/fail polarity and observation. Artifact producer references SHALL be a separate ordered list of exactly `{ordinal, artifact, point}` records. Normalization SHALL collapse only non-semantic whitespace and path separators and SHALL not remove command arguments, selectors, operators, targets, or polarity. Coverage equivalence requires identical signature length and exact field values at every ordinal, identical producer-reference-list length, and exactly one producer-reference record changing from the named impossible later-Step point to an existing current-Step point.

#### Scenario: Worker reports GREEN pass and coordinator confirms it

- **WHEN** the worker report says the Step's GREEN verification passed, the coordinator's Verification Checklist also passes, and the independent file-scope comparison finds no discrepancy
- **THEN** the coordinator classifies the closure as clean
- **AND** continues the normal post-verification flow and may mark the Step's checkboxes only after any required human verification

#### Scenario: Coordinator identifies a recoverable false report

- **WHEN** the worker report disagrees with the coordinator's Verification Checklist or independent file-scope comparison, and coordinator evidence proves one or more report claims false with clear, safe corrections inside the current Step and plan scope
- **THEN** the coordinator does not mark checkboxes or propose a commit, and continues the same GREEN worker session with the failing path and evidence (cap 3)

#### Scenario: E14 coordinator finds a non-clean completed report

- **WHEN** a worker returns `completed` but the coordinator's checklist, baseline, allowed-file, or report comparison contradicts it
- **THEN** the coordinator classifies the closure as non-clean and assigns exactly one routing diagnosis
- **AND** assigns a Cause Locus only when concrete evidence proves the boundary; otherwise it records an unresolved cause with no locus
- **AND** does not mark checkboxes or propose a commit before the selected route completes

#### Scenario: Coordinator identifies a recoverable in-scope false report

- **WHEN** the worker report disagrees with the coordinator's Verification Checklist or independent file-scope comparison, and coordinator evidence proves one or more report claims false with clear, safe corrections inside the current Step and worker scope
- **THEN** the coordinator selects `Cause Locus: in-scope`
- **AND** continues the same authorized worker session with the failing path and evidence under the shared cap of 3

#### Scenario: Out-of-scope verification command names a later Step

- **WHEN** the current Step's verification command in `implementation.md` asserts an artifact or inventory that a later Step creates
- **THEN** the coordinator names `implementation.md` and the exact current-Step assertion as the out-of-scope cause point
- **AND** spends zero worker-recovery attempts
- **AND** may perform only the bounded plan-artifact repair without editing production or test files or reducing verification coverage

#### Scenario: File-scope discrepancy exists while verification passes

- **WHEN** the Verification Checklist passes but the coordinator's post-dispatch comparison shows that the report's `Files modified` claim violates the Step's allowed scope or differs from the pre-dispatch baseline
- **THEN** the coordinator treats the file-scope evidence as a non-clean closure
- **AND** evaluates its cause locus before selecting same-worker recovery or an out-of-scope hand-back

#### Scenario: Mixed GREEN-direct plan scope excludes prohibited files

- **WHEN** a GREEN-direct Step's plan-level scope contains production files together with test files or declared interfaces
- **THEN** the coordinator SHALL inject only the production subset as the GREEN allowed-file set
- **AND** the GREEN worker SHALL not receive permission to create or modify the test or interface paths

#### Scenario: Discrepancy is not clearly recoverable

- **WHEN** the coordinator cannot establish the report's cause and a safe in-scope correction, or the correction would be destructive, unauthorized, or outside the current Step and existing plan
- **THEN** the coordinator assigns the shared `coordinator rejection` diagnosis with an explicitly unresolved cause rather than claiming `Cause Locus: out-of-scope`
- **AND** spends zero recovery attempts, marks no checkboxes, proposes no commit, and surfaces the discrepancy for human intervention

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
- **THEN** the coordinator's path comparison treats the path as an out-of-scope cause, names the path and its concrete artifact boundary, and spends zero recovery attempts
- **AND** it halts for human intervention unless an explicitly authorized owner route, such as the bounded current-Step plan-artifact repair, independently applies

### Requirement: Repository-owned scratch fixtures tear down their exact path

A repository test fixture that creates an apply-style per-change scratch directory SHALL tear down that exact directory before the test completes. Fixture teardown SHALL remain local to the test, SHALL NOT alter the behavior under test, and SHALL NOT remove unrelated `.tmp/` content. The opencode agent-census fixture SHALL tear down `.tmp/derive-opencode-agent-census-from-bindings/` after its census assertions.

#### Scenario: Census fixture leaves no per-change scratch
- **WHEN** the focused opencode agent-census fixture test completes
- **THEN** `.tmp/derive-opencode-agent-census-from-bindings/` does not exist and the existing census result remains unchanged

#### Scenario: Census fixture teardown preserves unrelated scratch
- **WHEN** unrelated content exists under `.tmp/` while the opencode agent-census fixture tears down its scratch
- **THEN** teardown removes only `.tmp/derive-opencode-agent-census-from-bindings/` and preserves the unrelated content

### Requirement: Verification re-run must be the quiet confirmation, not the full execution

The coordinator's re-run SHALL be limited to the dispatch-appropriate confirmation: the RED Verification Checklist for a RED dispatch, or the Step's Verification Checklist (the green confirmation) for a GREEN dispatch. It SHALL not re-execute the RED->GREEN cycle or the read-before-write reads, so the coordinator's context stays clean. A plan-artifact repair MAY change the exact current-Step assertion being confirmed, but it SHALL not turn the coordinator re-run into worker implementation or test-authoring work and SHALL not reduce the applicable checklist's effective coverage.

#### Scenario: Coordinator validates a completed Step

- **WHEN** the coordinator validates a Step a worker already executed
- **THEN** it runs only the Step's Verification Checklist commands, not the RED test runs or file dumps that the worker already absorbed

#### Scenario: Coordinator validates a valid RED intermediate result

- **WHEN** a split-flow RED worker returns a completed report with RED result `valid`
- **THEN** the coordinator independently runs the RED Verification Checklist to confirm the expected assertion failure and allowed-file boundary
- **AND** it treats that confirmation as the gate to GREEN dispatch, not as final Step completion or a GREEN verification replay

#### Scenario: Plan repair does not replay the worker

- **WHEN** the coordinator repairs a current-Step verification assertion in `implementation.md`
- **THEN** it re-runs the affected checklist as an independent confirmation
- **AND** it does not perform the worker's implementation or test-authoring work itself

### Requirement: Same-worker retry is bounded and receives structured diagnosis

For a coordinator-disproved report or an eligible worker failure, the coordinator SHALL perform at most three continuations in the active apply phase-adapter segment, with one continuation per distinct coordinator diagnosis identity, aggregating every confirmed contradiction from that result into the same continuation payload — the shared bounded same-worker recovery ledger declared via `recovery_policy: true` per `apply-same-worker-retry`. All Steps and report-handling cycles in that segment share this ledger; a new Step SHALL not reset it. A duplicate diagnosis SHALL stop before dispatch and before ledger exhaustion. The continuation SHALL retain the ordinary dispatch's existing context and SHALL add exactly the shared routing diagnosis, `Cause Locus`, and the ordered recovery content: `Reported` (all contradictory claims from the worker report), `Evidence` (all relevant coordinator observations), `Cause` (the diagnosed execution defects), `Correction` (the exact safe corrections), and `Verification` (the normal Verification Checklist to re-run and its pass condition). A coordinator rejection of a RED result SHALL continue the same RED worker when the cause is clear, safe, current-Step, and inside the RED worker's authorized test/stub scope; a GREEN result SHALL continue only the same GREEN worker. An out-of-scope cause SHALL not enter this continuation route and SHALL spend zero attempts; a bounded coordinator-owned `implementation.md` plan-artifact repair follows the separate repair exception above.

The recovery content SHALL preserve the dispatch kind's existing restrictions — the blind RED worker receives no GREEN implementation body, the GREEN worker's test-file prohibition remains absolute, no raw output enters the prompt, no worker reads change artifacts, and the fixed report contract remains unchanged. The coordinator's pre-dispatch baseline and per-report recovery assessment SHALL remain coordinator-only state and SHALL NOT be included in any worker dispatch. The plan-derived allowed-file set remains part of the ordinary dispatch context inherited by the continuation. The continuation SHALL remain limited to the current Step and existing plan scope, SHALL not add an advisor tier, and SHALL not change the fixed report field set. Every recovery continuation return receives its own scratch sweep before changed-path comparison, and no fresh recovery worker is introduced.

#### Scenario: Known file-scope mistake is corrected via continuation

- **WHEN** a worker report claims a file outside the Step was modified, the coordinator's baseline shows that the path was absent before dispatch and the current dispatch created it, and a safe reversible restoration is authorized
- **THEN** the coordinator continues the same GREEN worker session once with the recovery content, and does not start a fresh worker for that discrepancy

#### Scenario: RED recovery continuation remains blind

- **WHEN** a RED worker result is non-clean but coordinator evidence identifies a clear, safe correction inside its plan-authorized test or RED-stub scope
- **THEN** the coordinator continues the same RED worker with the diagnosis and evidence
- **AND** the continuation contains no GREEN implementation body and cannot authorize production edits

#### Scenario: Recovery content is layered onto the continuation

- **WHEN** a same-worker continuation is selected for a GREEN-direct, split-routed GREEN, or split-routed RED Step
- **THEN** the coordinator supplies the existing dispatch context unchanged followed by the routing diagnosis, cause locus, and recovery content
- **AND** it retains the applicable blindness, test-file, no-exploration, and report rules

#### Scenario: Multiple contradictions share one continuation

- **WHEN** one worker report contains multiple confirmed contradictions with clear, safe, in-scope corrections
- **THEN** the coordinator aggregates their reported claims, evidence, causes, corrections, and verification into one continuation payload
- **AND** performs only one continuation per Step/report handling cycle

#### Scenario: Unknown or shared file-scope change is not recoverable

- **WHEN** an unexpected path was present before the dispatch, is shared with another worker, or would require destructive or unauthorized cleanup, and the baseline or ownership evidence names the concrete boundary
- **THEN** the coordinator names the artifact and concrete point establishing the out-of-scope cause
- **AND** does not continue the worker, spends zero attempts, and surfaces the discrepancy for human intervention

#### Scenario: Unknown file ownership remains unresolved

- **WHEN** an unexpected path cannot be attributed to the current dispatch and the available evidence cannot prove either an in-scope or out-of-scope boundary
- **THEN** the coordinator uses `coordinator rejection` with an explicitly unresolved cause and no Cause Locus claim
- **AND** spends zero attempts, does not continue the worker, and asks for human intervention rather than asserting an out-of-scope cause

#### Scenario: False GREEN failure has a safe correction

- **WHEN** a GREEN worker reports GREEN failure but coordinator evidence identifies a clear execution or report correction that stays within the Step and GREEN's authorized non-test scope
- **THEN** the coordinator may use one same-worker continuation to apply that correction or reconcile the execution result
- **AND** it does not treat the out-of-scope plan-artifact repair exception as permission to edit production or tests itself

#### Scenario: Unpassable RED or GREEN is not retried as a blocking contradiction

- **WHEN** the worker reports an unpassable STOP with `failure_class: blocking-contradiction` and `unrecoverable: true`
- **THEN** the coordinator spends zero recovery attempts
- **AND** surfaces the concrete evidence for human judgment without changing the worker's prohibited surface

#### Scenario: Apply STOP with no worker veto uses coordinator locus

- **WHEN** an unpassable RED or GREEN STOP carries `failure_class: blocking-contradiction`, `unrecoverable: false`, and coordinator evidence proves a clear safe in-scope correction
- **THEN** the coordinator SHALL use the shared Cause Locus and diagnosis-key rules to decide eligibility
- **AND** it MAY continue the same authorized worker once without editing prohibited files or treating the worker class as an automatic veto

#### Scenario: Retry remains bounded after scratch cleanup

- **WHEN** a clean-return scratch sweep removes temporary scaffolding before path comparison and a separate out-of-scope path remains
- **THEN** the coordinator evaluates only the remaining path under the cause-locus rules and does not use scratch cleanup to authorize a continuation

### Requirement: Successful same-worker retry returns to normal verification

After a same-worker continuation returns, the coordinator SHALL re-run the dispatch-appropriate independent checklist itself — the RED Verification Checklist for a RED continuation, or the normal Step Verification Checklist for a GREEN continuation — and repeat the independent baseline, allowed-file, and report comparison. The coordinator SHALL treat coordinator verification as authoritative over the corrective worker report. If the GREEN checklist passes and the comparison is clean, the coordinator SHALL resume the existing post-verification order, including learnings, Human Verification when required, checkbox marking, appendices, and commit gating. If the RED checklist confirms a valid RED, the coordinator SHALL dispatch GREEN under the split routing rule and SHALL not mark the Step complete. If the applicable checklist fails, the coordinator SHALL create a new closure-diagnosis record; while that record establishes a clear, safe, current-Step, in-scope eligible cause, `unrecoverable: false`, and remaining segment budget, the coordinator SHALL continue the same worker again. If the record is unresolved, unsafe, destructive, out-of-scope, vetoed, blocking, transport-lost, or budget-exhausted, the coordinator SHALL stop retrying, SHALL NOT mark the Step's checkboxes or propose a commit, and SHALL surface the issue for human intervention. No fourth continuation is permitted in the active segment. A coordinator-owned plan-artifact repair SHALL be verified by the same independent checklist and SHALL not be treated as worker success until that verification passes.

#### Scenario: Continuation passes coordinator verification

- **WHEN** the same-worker continuation completes and the coordinator's rerun of the Step's Verification Checklist and independent path comparison pass
- **THEN** the coordinator classifies the closure as clean and continues the normal workflow automatically
- **AND** may advance only after the existing human and commit gates are satisfied

#### Scenario: Continuation verification still fails

- **WHEN** the coordinator's post-continuation applicable checklist fails or the path comparison remains contradictory and the new closure diagnosis is unresolved, unsafe, destructive, out-of-scope, vetoed, blocking, transport-lost, or budget-exhausted
- **THEN** the coordinator halts for human intervention without further continuation, checkbox marking, commit proposal, or advancement to the next Step

#### Scenario: Still-eligible continuation receives the next bounded attempt

- **WHEN** the post-continuation applicable checklist fails but coordinator evidence establishes another clear, safe, current-Step, in-scope eligible cause and segment budget remains
- **THEN** the coordinator continues the same worker again under the shared diagnosis route
- **AND** it does not reset or expand the segment-wide three-slot diagnosis ledger

#### Scenario: Plan-artifact repair preserves scope and coverage

- **WHEN** a coordinator repairs the current Step's `implementation.md` verification assertion and the next independent checklist run passes
- **THEN** the coordinator records the repair as an owner-authorized plan-artifact correction
- **AND** it confirms through the mechanical before/after comparison that checklist commands, selectors, assertions, and required observations were not removed, disabled, broadened, or reduced before normal gates

#### Scenario: Coverage Signature permits only the named producer substitution

- **WHEN** a plan-artifact repair replaces an impossible later-Step producer reference in one current-Step assertion
- **THEN** the before and after Coverage Signatures have identical ordered tuples and cardinality
- **AND** only the separately recorded producer reference changes to an existing current-Step point; any other difference requires human intervention

#### Scenario: Coordinator plan repair enters final accounting

- **WHEN** the coordinator performs the permitted `implementation.md` plan-artifact repair
- **THEN** `implementation.md` enters the invocation changed-files union exactly once as a coordinator-owned repair and appears in final file reporting and the authorized commit add-list
- **AND** it does not appear as a worker-modified path or authorize a production/test scope change

#### Scenario: A second plan-artifact repair requires human intervention

- **WHEN** the active apply segment already accepted one bounded `implementation.md` plan-artifact repair and a later Step exposes another plan-artifact defect
- **THEN** the coordinator refuses a second automatic plan-artifact repair
- **AND** uses the unresolved human hand-back without editing the plan or spending a worker-recovery attempt

#### Scenario: Continuation would be unsafe or out of scope

- **WHEN** the corrective continuation would require destructive action, authorization not already granted, or changes outside the current Step and existing worker or plan-artifact boundary
- **THEN** the coordinator halts for human intervention and does not execute that correction or any further continuation

### Requirement: Known-False Report Recovery branches by locus

Apply's Known-False Report Recovery SHALL branch on the coordinator-owned `Cause Locus` before selecting a correction, with the locus decided by ownership and never by the kind of artifact the cause sits in. For an eligible in-scope diagnosis, the coordinator SHALL use the shared distinct-diagnosis ledger and continue only the same authorized RED or GREEN worker with the ordered `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` content. For an `owner-in-run` diagnosis, including a cause located in a test file whose resumable owner is the same-Step RED worker, the coordinator SHALL resume that owner and SHALL never route the correction to GREEN. For an out-of-scope diagnosis, the coordinator SHALL spend zero worker-recovery attempts and SHALL not send a correction through `continue_after_recovery`. It MAY perform a bounded coordinator-owned repair only when the evidence identifies the exact current-Step verification assertion in `implementation.md` as the cause, spending exactly one attempt from the Step's three-attempt coordinator budget held by `recovery-ledger@1`; otherwise it SHALL hand back with the named artifact and concrete point.

The owner repair SHALL write only the exact current-Step `implementation.md` plan-artifact assertion, preserve the Step structure, scope, prohibitions, and Coverage Signature, and SHALL never edit production files, test files, declared interfaces, verification scripts/checklists, or any other artifact. The repair operation SHALL not execute a verification command; the coordinator's independent Verification Checklist run remains a separate, mandatory, authoritative confirmation after the repair and does not become part of the repair's write scope. The repair SHALL not spend a worker-recovery attempt, and a repair requested once the Step's coordinator budget is exhausted SHALL use the unresolved human hand-back.

#### Scenario: In-scope Known-False report uses one distinct recovery attempt

- **WHEN** coordinator verification disproves a RED or GREEN report and concrete evidence places a clear, safe correction inside that worker's authorized current-Step scope
- **THEN** the coordinator SHALL assign `Cause Locus: in-scope` and a new diagnosis identity
- **AND** it SHALL continue the same worker once through the shared recovery route without coordinator file repair

#### Scenario: Out-of-scope Known-False report avoids worker recovery

- **WHEN** coordinator evidence names an artifact and concrete point over which no worker in the Step's in-run roster holds an authorized correction boundary
- **THEN** the coordinator SHALL assign `Cause Locus: out-of-scope`, spend zero worker-recovery attempts, and avoid `continue_after_recovery`
- **AND** it SHALL use only the named owner route or human hand-back

#### Scenario: Plan repair does not run verification

- **WHEN** the exact cause is the current Step's impossible `implementation.md` verification assertion
- **THEN** the coordinator MAY apply the bounded plan-artifact repair, spending one attempt from the Step's coordinator budget, without running a verification command as part of that write
- **AND** it SHALL then perform the independent coordinator Verification Checklist separately, preserving effective coverage before any checkbox or commit gate

#### Scenario: Completed STOP is diagnosed before repair or retry

- **WHEN** an apply worker returns `completed` with `STOP reached? = yes`
- **THEN** the coordinator SHALL treat it as a non-clean closure and select one routing diagnosis before any repair or continuation
- **AND** an unpassable STOP with `unrecoverable: true`, an out-of-scope or unresolved Cause Locus, or no safe correction SHALL remain a failed/blocking-contradiction human stop; a false-veto in-scope cause SHALL follow the shared eligibility rule before any human gate

#### Scenario: A repair beyond the exhausted coordinator budget hands back to a human

- **WHEN** a plan-artifact defect is identified in a Step whose three coordinator attempts are already spent
- **THEN** the coordinator SHALL treat it as unresolved, spend zero attempts, and stop for human intervention rather than performing another repair

#### Scenario: A test-located cause routes to its owner rather than out-of-scope

- **WHEN** coordinator evidence places the cause in a test file whose same-Step RED owner is still resumable
- **THEN** the coordinator SHALL assign `Cause Locus: owner-in-run` and resume that owner instead of classifying the cause out-of-scope

### Requirement: The coordinator-led unblock ladder traverses autonomously

The apply coordinator SHALL traverse the unblock ladder without asking the user which rung to take, and no individual incident SHALL open a user prompt of its own. The coordinator SHALL route rather than write: it SHALL instruct and delegate first and SHALL self-edit only when no in-run worker holds the authorized correction boundary, preserving the rule that self-edit is forbidden while a worker-safe correction exists. A GREEN `blocking-contradiction` that proves a test-infra point SHALL be assigned `owner-in-run` and SHALL resume the same-Step RED owner with exactly `continue_after_recovery`, with no hand-back and no user prompt preceding the retry. Commit and coordinator-verification gates SHALL remain unchanged: coordinator verification stays authoritative, the pre-commit visibility listing and proposed message still print unconditionally before each commit, safe-operations confirmations remain required, and assertions SHALL never be relaxed to pass.

#### Scenario: A test-infra contradiction retries the RED owner without a prompt

- **WHEN** a GREEN `blocking-contradiction` proves a test-infra point and the same-Step RED owner is still resumable
- **THEN** the coordinator SHALL resume that RED owner with `continue_after_recovery` without asking the user and without a hand-back

### Requirement: The coordinator budget is three attempts per Step held in the state store

On entry to each Step the coordinator SHALL grant the Step's budgets with the Step-guarded `{kind: step-entry, step: "Step N"}` signal to `recovery-ledger@1`, which clears the three-slot worker ledger and the coordinator budget together only when this run has not entered that Step before, answering `step_entry: first`. A Step re-entered after a correction or a route retry SHALL answer `step_entry: re-entry`, SHALL keep the worker slots and coordinator attempts already spent in it, and SHALL never draw a second budget; a signal carrying no concrete Step identifier SHALL answer `step_entry: unidentified` and SHALL grant nothing. The coordinator SHALL NOT use the bare `reset <id> recovery-ledger@1` between Steps, because that unguarded reset belongs to the composition-segment boundary and would hand a re-entered Step a fresh cap. The coordinator budget SHALL be three coordinator attempts per Step and SHALL be held in the state store by `recovery-ledger@1` rather than in prose: the coordinator SHALL consult the machine with a `{kind: coordinator-attempt, key: [artifact path, concrete point, authorized correction boundary]}` signal before each coordinator attempt and SHALL announce the returned ordinal in conversation text. The key SHALL be required: an attempt whose diagnosis has no concrete key SHALL spend zero and return `rejected: unresolved cause`, and a key already attempted at coordinator level in that Step SHALL spend zero and return `rejected: duplicate diagnosis`, upon which the coordinator SHALL hand back the existing diagnosis instead of opening a second attempt. Delegating a corrective dispatch SHALL spend one coordinator attempt exactly as a coordinator self-edit does, so a Step whose coordinator budget is exhausted SHALL stop the current Step attempt even when worker slots remain and SHALL present the exhausted-Step choice rather than route the correction through leftover worker slots. This single budget SHALL replace the earlier at-most-one-per-segment caps for the plan-artifact repair and for the last-resort infra fix. The only fresh-budget exception SHALL be the explicitly authorized `authorized-step-retry` event for the active exhausted Step, which SHALL archive the exhausted cycle before clearing both ledgers and counters together.

#### Scenario: Delegation spends a coordinator attempt

- **WHEN** the coordinator delegates a corrective dispatch inside a Step
- **THEN** it SHALL spend one coordinator attempt from that Step's budget exactly as a self-edit would

#### Scenario: A re-entered Step keeps its spent budgets

- **WHEN** the coordinator re-enters a Step it already entered in this run and signals `step-entry` for it
- **THEN** the machine SHALL answer `step_entry: re-entry` and the Step SHALL continue with the worker slots and coordinator attempts it had already spent

#### Scenario: A duplicate coordinator diagnosis opens no second attempt

- **WHEN** the coordinator signals a coordinator attempt whose key it already attempted in that Step
- **THEN** the attempt SHALL spend zero and return `rejected: duplicate diagnosis`, and the coordinator SHALL hand back the existing diagnosis

#### Scenario: A coordinator attempt without a concrete key spends nothing

- **WHEN** the coordinator signals a coordinator attempt whose diagnosis has no concrete key
- **THEN** the attempt SHALL spend zero and return `rejected: unresolved cause`

#### Scenario: An exhausted coordinator budget stops the Step despite free worker slots

- **WHEN** a Step's three coordinator attempts are spent while worker ledger slots remain unused
- **THEN** the Step SHALL stop and present the exhausted-Step choice rather than route the correction through the leftover worker slots

#### Scenario: An authorized retry archives the exhausted coordinator cycle

- **WHEN** the user explicitly authorizes a fresh attempt for the active Step after coordinator-budget exhaustion and the Step contract remains viable
- **THEN** the machine SHALL archive the exhausted coordinator cycle, clear both active budgets together, and permit one fresh whole-Step invocation

### Requirement: The coordinator never writes a test file

Under no rung of the unblock ladder SHALL the apply coordinator write a test file. When the Step's in-run roster holds no RED owner and the cause sits in a test, the coordinator SHALL dispatch a fresh RED for that corrective work instead of writing the test. When the test's RED owner exists but is exhausted or vetoed, the coordinator SHALL escalate to a human even when coordinator attempts remain. A bounded last-resort infra fix SHALL write only test setup, adapter, or seed scaffolding and SHALL never write an assertion body, an expected value, production semantics, or a test file.

#### Scenario: A GREEN-only Step dispatches a fresh RED for a test cause

- **WHEN** a Step whose roster holds no RED owner reports a cause located in a test file
- **THEN** the coordinator SHALL dispatch a fresh RED for that corrective work rather than writing the test itself

#### Scenario: An exhausted test owner escalates instead of a coordinator write

- **WHEN** the RED owner of a test-located cause is exhausted or vetoed while coordinator attempts remain
- **THEN** the coordinator SHALL escalate to a human rather than editing the test file

### Requirement: Budget exhaustion and the enumerated stopping reasons close a Step

Exhausting either budget inside a Step — the three worker slots or the three coordinator attempts — SHALL stop the current Step attempt and escalate to the exhausted-Step choice, naming the Step, the diagnosis, and the attempts spent on each budget. Those tallies SHALL be taken from the store response rather than from memory of the conversation: every `recovery-ledger@1` outcome carries `budgets` as `{worker: {spent, limit}, coordinator: {spent, limit}}`, and an exhaustion additionally carries `exhausted` as `worker` or `coordinator`, naming which budget ran out. The response SHALL also provide retained prior cycle history when an authorized retry has occurred. Having budget left SHALL never authorize a correction the enumerated list forbids, and a destructive or shared-system action SHALL stay gated by `safe-operations` with or without remaining budget. Apart from exhaustion, the only reasons that SHALL stop the ladder for a human are weakening or deleting an assertion, redefining the agreed contract (`implementation.md` or the change's specs), a destructive or shared-system action gated by safe-operations, a worker `unrecoverable: true` veto, and a pre-existing failure outside the change's radius. No other incident SHALL interrupt an unattended run.

#### Scenario: Coordinator budget exhaustion escalates with both tallies named

- **WHEN** a Step requires a further coordinator attempt after its three coordinator attempts are spent
- **THEN** the coordinator SHALL stop that Step and present the exhausted-Step choice while naming the Step, the diagnosis, and the attempts spent on each budget

#### Scenario: An incident outside the enumerated reasons does not interrupt the run

- **WHEN** an incident inside a Step is none of exhaustion, assertion weakening, contract redefinition, a safe-operations-gated action, an `unrecoverable: true` veto, or a pre-existing failure outside the change's radius
- **THEN** the coordinator SHALL continue the ladder autonomously rather than stopping for a human

#### Scenario: The escalation tallies come from the store response

- **WHEN** the coordinator names the attempts spent on each budget while escalating an exhausted Step
- **THEN** it SHALL read them from the ledger outcome's `budgets` and `exhausted` values rather than from conversation memory

#### Scenario: Remaining budget never authorizes a forbidden correction

- **WHEN** a correction would weaken or delete an assertion, or redefine `implementation.md` or the change's specs, while coordinator attempts remain
- **THEN** the Step SHALL stop for a human rather than spend a remaining attempt on it

#### Scenario: A destructive action stays gated with budget remaining

- **WHEN** an unblock rung would take a destructive or shared-system action while budget remains
- **THEN** the action SHALL stay gated by `safe-operations` exactly as it is when no budget remains

#### Scenario: A fresh budget requires explicit authorization

- **WHEN** a Step budget is exhausted and the user has not selected `authorize-step-retry` or unequivocally named that exact Step for a fresh attempt
- **THEN** the coordinator SHALL not clear the budgets, mark the Step, commit, or advance it

#### Scenario: Fast-track does not authorize a fresh budget

- **WHEN** an exhausted Step occurs under `--fast-track`
- **THEN** the coordinator SHALL present the same exhausted-Step choice and SHALL not auto-select or grant the retry

### Requirement: Autonomous corrections leave a reported trace

The coordinator SHALL record one line per autonomous correction naming the Step, the rung, the normalized `diagnosis_key`, the budget and ordinal spent, and the outcome, and SHALL report the collected lines at run close so an unattended run remains auditable. Each line SHALL be exactly `> Autonomous correction: Step <N> | <rung> | key <path> :: <point> :: <boundary> | <budget> <ordinal> of 3 | <outcome>`, where `<rung>` is one of `red-owner-retry`, `delegated-dispatch`, `plan-artifact-repair`, or `infra-fix`, `<budget>` is `worker` or `coordinator`, `<ordinal>` is the ordinal the machine returned and is `0` for an attempt that spent nothing, and `<outcome>` is `corrected`, `unchanged`, or the returned `rejected` value. Coverage SHALL be every rung the coordinator takes without asking the user, including a zero-cost outcome (`duplicate diagnosis`, `unresolved cause`, `exhaustion`); an autonomous correction with no line is a reporting defect. The collected lines SHALL be reported at run close whether the run ends by completing, by escalating, or by stopping, and `> Autonomous corrections: none` SHALL be printed when the list is empty. The trace SHALL be conversation text only and SHALL never mark, extend, rename, or add a progress-plan step.

#### Scenario: The trace is reported at run close without touching the plan

- **WHEN** autonomous corrections were applied during an unattended run
- **THEN** the coordinator SHALL report the collected trace lines at run close as conversation text without altering the progress plan

#### Scenario: A zero-cost outcome still leaves a line

- **WHEN** an autonomous rung ends in `duplicate diagnosis`, `unresolved cause`, or `exhaustion` and spends nothing
- **THEN** the coordinator SHALL still record a trace line for it, carrying ordinal `0` and the returned `rejected` value as the outcome

#### Scenario: An empty trace is still reported

- **WHEN** a run closes with no autonomous correction recorded
- **THEN** the coordinator SHALL print `> Autonomous corrections: none` at run close

#### Scenario: A successful run still reports its trace

- **WHEN** an unattended run that applied autonomous corrections ends by completing rather than by escalating
- **THEN** the coordinator SHALL still report the collected trace lines at run close

### Requirement: Exhausted-Step choice authorizes exactly one fresh whole-Step attempt

The apply coordinator SHALL treat `authorize-step-retry` as a one-time grant for the entire blocked Step, not for one diagnosis or one worker return. The grant SHALL renew the worker and coordinator budgets together, retain the earlier cycle history, preserve the current worktree and unchanged plan, and leave all verification, ownership, commit, and safe-operations rules in force. The coordinator SHALL not treat the grant as commit authorization.

#### Scenario: Whole-Step grant covers both budgets

- **WHEN** the user authorizes a fresh attempt after either the worker or coordinator budget is exhausted
- **THEN** the coordinator SHALL start the whole blocked Step with three worker attempts and three coordinator attempts and SHALL retain the earlier cycle history

#### Scenario: Retry grant does not bypass gates

- **WHEN** a fresh authorized Step invocation begins
- **THEN** it SHALL reselect routing, open a fresh no-commit-guard window, verify the Step, and run the ordinary commit and advancement gates
