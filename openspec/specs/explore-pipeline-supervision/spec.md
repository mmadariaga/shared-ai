# explore-pipeline-supervision Specification

## Purpose

Define routed supervision of the isolated sai-1 spec-proposal worker from `sai-explore`.
## Requirements
### Requirement: Reuse supervised lifecycle

On Claude Code and opencode, `sai-explore` SHALL act only as the lifecycle coordinator when `Auto` selects one uncompleted change from the latest crystallized set. For a selected change whose spec phase has not yet converged or ended by cap exhaustion in this chat, it SHALL dispatch the existing `sai-1` spec-proposal worker with that change's emitted `Ready to Propose` block as the isolated request envelope and SHALL include the `--supervised` marker on that envelope per `supervised-pipeline-forwarding`; the worker SHALL retain ownership of prerequisites, research, change resolution, `proposal.md`, `specs/**`, decision summaries, consistency checks, feedback edits, and spec-phase completion, and SHALL suppress its automatic worker-owned review loop because of the marker. For a selected change whose spec phase already reached convergence or cap exhaustion in this chat — its `proposal.md` and `specs/**` were reviewed in-session and the user-facing feedback gate was passed — but whose chained design phase did not complete, a later `Auto` selection SHALL resume at the design phase by re-dispatching the design worker over the existing reviewed spec artifacts with the same `--supervised` marker (and existing `--fast-track` / optional `--overview-lang` composition), and SHALL NOT re-dispatch the sai-1 spec-proposal worker or regenerate `proposal.md` and `specs/**`, so a design-phase retry never discards reviewed, user-approved spec work and never reintroduces the isolated worker-owned reviewer by omitting the marker.

An uncompleted change is a tracked name whose supervised run has not reached supervised completion in this explore chat. Two independent state machines govern the run's ending: the phase's review loop has a budget of at most three rounds per phase per Auto attempt and ends by convergence or cap exhaustion under `supervised-review-rounds`, while the phase worker returns its own terminal result (`completed`, `failed`, or `cancelled`) independently of how the review rounds ended. The review-loop ending governs chaining — a spec phase that converged or exhausted its cap chains design, so the spec worker never terminates a run without design being chained — while supervised completion is decided by the design worker's terminal result alone: a design phase that ended by cap exhaustion still proceeds to the user-facing gate, and the design worker's own `completed` result is what marks the change completed. A `failed` or `cancelled` spec or design worker does not reach supervised completion: the change remains uncompleted and retryable by a later `Auto` selection, which resumes at the phase whose worker did not complete, regardless of the review-loop ending. Reviewer failure, reviewer cancellation, and severity-contract violation do not exist as supervised outcomes in the in-session model; with the worker-owned automatic loop suppressed, those outcomes also do not arise from an automatic worker-owned reviewer on the supervised path.

#### Scenario: routed harness starts a tracked change whose spec phase has not converged
- **WHEN** the user selects `Auto` for an uncompleted latest-turn change in a Claude Code or opencode explore chat
- **THEN** explore dispatches the existing `sai-1` spec-proposal worker for that change
- **AND** the worker receives the emitted crystallized block rather than the surrounding explore conversation
- **AND** the dispatch envelope carries `--supervised` so the worker suppresses its automatic isolated reviewer

#### Scenario: design-phase retry resumes at design without re-running sai-1
- **WHEN** a change whose spec phase already converged or ended by cap exhaustion and passed the user-facing gate had its chained design worker return `failed` or `cancelled`, and the user later selects `Auto` for it
- **THEN** explore re-dispatches the design worker over the existing reviewed spec artifacts
- **AND** it does not re-dispatch the sai-1 spec-proposal worker or regenerate `proposal.md` and `specs/**`

#### Scenario: cap-exhausted spec phase continues into design
- **WHEN** the spec phase ends by cap exhaustion with the worker returning `completed`
- **THEN** the run continues to the chained design phase rather than stopping at the spec phase
- **AND** the change's supervised completion follows the design worker's terminal result
- **AND** the chained design envelope also carries `--supervised`

### Requirement: Supervision preserves worker terminal behavior

Explore SHALL handle `completed`, `failed`, and `cancelled` worker results using the shared coordinator and worker lifecycle contracts. A failed or cancelled spec-proposal worker SHALL stop the active attempt with a concise status while leaving that selected change uncompleted and eligible for a later user-initiated `Auto` selection; explore SHALL NOT repair artifacts directly or silently replace a terminal result with success. If failure or cancellation occurs during machine-feedback processing, the review cycle SHALL end with that worker result per the `supervised-review-rounds` capability: the current artifacts and the already-applied fixes SHALL be preserved, and no review round SHALL be launched over the half-finished state. Because the worker-owned automatic loop is suppressed under supervision, no automatic isolated-reviewer retry absorbs the failure. A later retry SHALL begin a new three-round bound over the preserved artifact state rather than overwrite accepted corrections from the interrupted attempt.

#### Scenario: worker fails before review
- **WHEN** the supervised spec-proposal worker returns `failed`
- **THEN** explore reports the failure concisely and stops the supervised run for that change
- **AND** explore performs no artifact write or repair

#### Scenario: worker fails while applying review feedback

- **WHEN** the spec-proposal worker returns `failed` or `cancelled` while processing a finding after one or more review rounds completed
- **THEN** explore stops the active attempt without direct artifact repair
- **AND** it preserves the current artifacts and the already-applied fixes
- **AND** it does not launch a review round over the half-finished state
- **AND** it does not dispatch an automatic worker-owned reviewer to absorb the failure

#### Scenario: failed change remains retryable
- **WHEN** a selected change's worker fails or is cancelled
- **THEN** that change remains uncompleted and appears in the next `Auto` selection
- **AND** no other tracked change is dispatched by the failed attempt

#### Scenario: interrupted change is retried

- **WHEN** the user later selects `Auto` for the uncompleted change in a new attempt
- **THEN** the new attempt starts a new three-round bound over the preserved artifact state
- **AND** it does not regenerate from the original crystallized block in a way that overwrites accepted corrections from the interrupted attempt
- **AND** the retry dispatch again carries `--supervised`

### Requirement: Independent commands remain independently invocable

The supervised entry path SHALL NOT change the contracts or availability of independently invoked `/sai-1-spec` and `/sai-2-design`. A user who selects `Manual` SHALL observe no supervised dispatch and the independent command behavior unchanged. Independently invoked `/sai-1-spec` and `/sai-2-design` SHALL continue to run their automatic worker-owned review loops because they do not receive the `--supervised` marker from explore.

#### Scenario: user invokes sai-1 directly
- **WHEN** the user invokes `/sai-1-spec` outside pipeline supervision
- **THEN** the command follows its existing invocation and completion contract without requiring explore
- **AND** its automatic worker-owned review loop remains active

#### Scenario: Manual selection injects no supervised marker

- **WHEN** the user selects `Manual` on the crystallization-close pipeline selector
- **THEN** explore dispatches nothing
- **AND** a later independent `/sai-1-spec` or `/sai-2-design` does not inherit a `--supervised` marker from that Manual selection

### Requirement: Supervised completion replaces standalone navigation

When the supervised spec-proposal worker completes after the in-session review rounds and user-facing feedback gate, explore SHALL NOT relay sai-1's standalone mandatory-stop message or instruct the user to review the artifacts, carry a handoff, or open a new chat. When the spec phase reaches convergence or cap exhaustion on a harness where selector-dispatched supervision is available (Claude Code or opencode, which is the same set of harnesses on which the design phase is chained), explore SHALL report the spec-phase outcome as the phase-transition report per the `pipeline-phase-transition` and `pipeline-design-phase-chaining` capabilities rather than terminating the supervised run. On convergence, the report states the number of spec review rounds used and that the last completed round found no `High` findings, and if that round accepted `Medium` or `Low` edits, the report SHALL also state that the resulting artifact state was not re-reviewed and SHALL NOT claim that no `High` findings remain in that edited state. On cap exhaustion, the report is the one-line cap-exhaustion report carrying the last round's finding counts, and the run continues to the chained design phase. The per-phase round bound applied by those reports is the three-round cap of `supervised-review-rounds`. This supervised adapter SHALL NOT change the terminal message of an independently invoked `/sai-1-spec`.

#### Scenario: supervised spec phase converges into design
- **WHEN** the selected change's spec phase converges under selector-dispatched Auto supervision on a harness where that supervision is available (Claude Code or opencode)
- **THEN** explore emits the spec-phase outcome as the phase-transition report and proceeds to the chained design phase
- **AND** it does not relay the standalone sai-1 mandatory-stop line or propose a manual handoff
- **AND** it does not terminate the supervised run at spec convergence

#### Scenario: cap-exhausted spec phase proceeds into design
- **WHEN** the selected change's spec phase ends by three-round cap exhaustion under selector-dispatched Auto supervision
- **THEN** explore emits the one-line cap-exhaustion report carrying the last round's finding counts
- **AND** it proceeds to the chained design phase rather than terminating the run

#### Scenario: direct sai-1 retains its terminal line
- **WHEN** `/sai-1-spec` completes outside explore supervision
- **THEN** its existing mandatory-stop message remains unchanged
