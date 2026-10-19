# Spec Proposal Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @sai/policies/spec-phase-contract.md and keep it in force for the entire run.
Fetch @sai/commands/spec/steps/common.md and keep it in force for the entire run.

## Invocation Envelope

The worker receives exactly one opaque string, `arguments_value`, and reads nothing from parent conversation history.

1. **Supervised flag.** Repeatedly strip only leading lines whose trimmed content is exactly the bare `--supervised` flag. If stripping leaves no request or only whitespace, fail validation before change resolution. Set invocation-scoped `supervised` to `true` if and only if at least one such line was consumed. Later lines and substrings containing `--supervised` are request content and are not parsed as flags. An Explore-supervised envelope then carries `--block-file <absolute path>` and `--block-hash <sha256>` lines. Require both, strip them, and verify the file before any dependent work per `@sai/policies/ready-to-propose-format.md` § Stored block transport. A missing/unreadable file, missing line, or mismatch returns `failed` with no changes; never reconstruct the block from chat. After success, the verified file supplies the request verbatim. Outside a supervised envelope, these lines are request content; the ordinary request is otherwise unchanged. An empty or whitespace-only request fails validation before change resolution.
2. **Creation and refinement are distinct entries.**
   - **Creation** requires the crystallized `Ready to Propose` block, validated before anything else with the dispatchable contract of `@sai/policies/ready-to-propose-format.md` § Dispatchable contract, never by concepts. The request is a block attempt when it carries the `## Ready to Propose` heading or passes the `loose` profile. For a block attempt, fetch `@sai/policies/tool-resolution.md` and `@sai/policies/block-hygiene-judgment.md`, then validate every pasted block before resolving the change or writing anything:
     1. Run `node <tool-path> check --profile dispatchable --block-file <verified path>` for a supervised file request; for an ordinary pasted request, supply the body on stdin instead. `<tool-path>` resolves `ready-to-propose.js` per the tool-resolution policy (when no candidate exists, name the tried paths and stop). A structural violation (`"ok": false`) fails validation before change resolution: write nothing and show every violation with its block index, line number, problem, and detail. A degraded paste (lost bold labels, a missing `---` line) fails here too; the user re-copies the block from the `/sai-explore` output.
     2. When `judgment.pending` lists flagged lines, judge exactly those lines per the judgment policy. Save verdicts in a JSON-array file and run `check --profile dispatchable --block-file <path> --verdicts-file <path>`; it uses the shared composer without transcribing the request. For a manual paste, save its request in a file first. A `violation` verdict fails validation before change resolution: write nothing and show its clause, line number, and evidence.
     3. Proceed only when the verdict reports `"dispatchable": true`. Outside an Explore-supervised envelope no hash comparison applies, so a hand-edited block is validated on its own merits. Then resolve the change name from the block's `Change name` and proceed as creation. Only items under `Implementation Details` count; items under `Out of scope Implementation Details` are non-normative context and never become requirements or scenarios of this change. When `Implementation Details` is `- None`, derive the proposal and specs from `Capabilities in scope`, the request, and `Edge Cases` only.
   - **Refinement** targets an existing change directory that already holds `proposal.md` or `specs/**`, and needs no block: a simple prompt suffices, including for hand-created changes with artifacts.
   - **Otherwise** STOP before change resolution and print exactly: "STOP: creation requires the crystallized Ready to Propose block. Run /sai-explore to mature the idea, then paste the block into a new chat with /sai-1-spec." This covers an empty request, a name-only request, text that is not a block attempt, and a hand-created change directory with no `proposal.md` or `specs/**`.

   This phase resolves names only through the block or the existing directory and never fetches `@sai/policies/change-picker.md`: there is no change-picker fallback and no name-only creation path.

## Change Resolution

Resolve the change per § Invocation Envelope. Every payload after resolution includes `resolved_change_name`; pre-resolution payloads omit it.

## Progress Reporting

Report the canonical `progress_plan` ids from `@sai/policies/spec-phase-contract.md` as progress events, and follow the coordinator-provided step-machine pointer for routing. Progress step ids are reported in canonical plan order, each once and only when newly complete — marks are monotonic, and an earlier id is never reopened or re-reported:

- `prereqs-and-change` — the startup act: change resolution completes before dispatching any subagent, reading beyond resolution, writing an artifact, or beginning research. It reports together with `research` in the startup progress event for `prereqs-and-change` and `research`, per `@sai/orchestration/worker-core.md` § Step-machine task disclosure.
- `research` — the research batch returns `research`, in the same event as `prereqs-and-change`.
- `proposal` — the completed `proposal.md` write returns `proposal`.
- `specs` — the completed `specs/**` write returns `specs`.
- `validation` — artifact validation plus decision-summary derivation returns `validation`.

## Active Step Execution

Instructions arrive just-in-time, one step file at a time, per the step delivery rule in `steps/common.md`: execute only the file named by the most recent `Active step:` pointer. This contract plus `common.md` is the sealed initial surface; `prereqs-and-change` runs from it before the first progress event, and the first delivered pointer targets `research`. Steps never widen the lifecycle, changed-files, result, or failure rules.

## Spec Work

Fetch @sai/policies/issue-origin-preservation.md and apply its planning-output
handoff check, including retaining a valid existing origin during refinement.

During proposal creation, when the validated block contains `**Backlog origin**`, preserve the validator's returned `backlog_origin` (that exact selected issue URL) in the active change's `.openspec.yaml`. Include that metadata path in `changed_files`. This is issue provenance only; spec performs no assignment or other remote mutation. Parent context never replaces the selected child origin.

Own the proposal/spec writes, permitted glossary updates, self-consistency and source-grounding checks, artifact verification, decision-summary derivation, and feedback edits, all inside the canonical `SpecWriteSurface`. Return `needs_input` for planning questions, `cancelled` for a deliberate decline, and `failed` for blockers.

For coordinator-forwarded artifact feedback, process the supplied feedback text under the shared gate rules; the worker MUST NOT emit, re-present, or duplicate the feedback-text prompt. The worker does not receive, present, branch on, or otherwise handle `mode`.

Return lifecycle metadata and the phase contract's `validation_report` extension only; `changed_files` is ordered and duplicate-free.

Artifact review stays outside this phase: the worker dispatches no reviewer of its own.

### Post-resolution failure classification and recovery

Post-resolution `failed` results follow `@sai/orchestration/worker-core.md` § Failure classification. The `summary` states observed evidence: the affected artifact or operation, the failed condition, and the consequence — never logs, tracebacks, command output, or file contents.

- Proposal/spec generation or write failures are `generation-error` unless a more specific closed class applies.
- Validation, consistency, requirement-scenario, or artifact-verification failures are `validation-failed`, naming the failed check and the affected `proposal.md` or `specs/**`.
- A contradiction with the spec-only write surface, including an attempted write to a forbidden artifact, is `blocking-contradiction`.

On `continue_after_recovery`, resume the same worker without re-resolution or replacement dispatch. Make only the authorized correction named by the coordinator's ordered diagnosis — `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification`. Re-run spec verification after the correction: return `completed` only when it passes, otherwise a post-resolution `failed` result with the closed classification, boolean `unrecoverable`, and concrete evidence. Recovery never emits a recovery progress id or progress event and leaves the canonical plan, feedback flow, validation report, and ordinary terminal rules unchanged.
