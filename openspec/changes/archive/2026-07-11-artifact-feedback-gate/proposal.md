## Why

Today `sai-1-spec` halts abruptly after its decision summary and `sai-2-design` jumps straight to the implementation-continuation question; there is no natural, in-context point to iterate on the just-written artifacts before advancing. An interactive feedback gate adds that review loop without breaking step isolation.

## What Changes

- Add an interactive **feedback gate** at the end of both `sai-1-spec` and `sai-2-design`, immediately after the existing decision summary.
- The gate offers two choices via the harness option-picker: (1) **give feedback** on the artifacts written in that step — which edits them in place, reprints the decision summary, and re-offers the gate in a loop; (2) **proceed** — labeled `Finish step` in sai-1 (fires the existing MANDATORY STOP) and `Continue` in sai-2 (advances to the existing (a)/(b) implementation question).
- Feedback is applied **selectively per item, not blindly**: the gate evaluates each item, applies only the legitimate ones, and reports each discarded item with its reason (out of scope/phase, constraint violation, factually wrong, self-contradictory). Discards are **soft** — the user may reimpose a discarded item on the next iteration.
- Introduce a shared, parameterized instruction `sai/instructions/artifact-feedback-gate.md` holding the gate logic, parameterized by artifact list, proceed-label, and next-action.
- Both `sai/commands/sai-1-spec.md` and `sai/commands/sai-2-design.md` body files fetch the new shared instruction at their completion phase.
- The sai-1 MANDATORY STOP now fires only after the user selects the proceed option in the gate (previously it fired immediately after writing artifacts).

## Capabilities

### New Capabilities
- `artifact-feedback-gate`: the gate's behavior — option-picker presentation, per-step artifact listing, the review→resummarize→re-offer loop, the two proceed branches, gate placement in both steps, isolation preservation, artifact-only-scope adherence during the loop, and the shared parameterized instruction fetched by both body files.

### Modified Capabilities
- `sai-1-spec-stop`: the termination now fires only after the user selects `Finish step` in the feedback gate, rather than immediately after the artifacts are written.
- `command-wrappers`: the "sole spec instruction source" rule for `sai-1-spec` is carved out so the sai-1 body file may additionally fetch the completion-phase gate instruction without violating the rule. (sai-2 has no equivalent sole-source rule, so no carve-out is needed there.)

## Impact

- `sai/instructions/artifact-feedback-gate.md` (new shared instruction).
- `sai/commands/sai-1-spec.md` — Completion section: gate inserted before the MANDATORY STOP.
- `sai/commands/sai-2-design.md` — Completion section: gate inserted between the decision summary and the existing (a)/(b) question.
- No change to the thin harness wrappers (`commands/claude/sai-*.md`, `commands/opencode/sai-*.md`) — the fetch lives in the body files.
- No production code; SAI instruction/prompt surface only.

## Proposal Research Documentation

**Local files**:
- `sai/commands/sai-1-spec.md` — current Completion + MANDATORY STOP.
- `sai/commands/sai-2-design.md` — current Completion + (a)/(b) implementation question.
- `sai/instructions/remember.md` — Closed-choice prompts rule (per-harness option-picker mapping).
- `sai/instructions/spec.propose.md` — Artifact-Only Scope.
- `openspec/specs/sai-1-spec-stop/spec.md` — current termination requirement.
- `openspec/specs/closed-choice-prompts/spec.md` — option-picker requirement and centralization in `remember.md`.
- `openspec/specs/artifact-only-scope/spec.md` — allowed-file scope for the spec phase.
- `openspec/specs/thin-wrappers/spec.md` — thin harness-wrapper shape (unchanged by this change).
- `openspec/specs/command-wrappers/spec.md` — body-file fetch contract and sole-spec-instruction-source rule.
- `openspec/specs/uniform-handoff/spec.md` — handoff-placement conventions.

**External URLs**: none.

## Additional Notes

- The gate presentation must go through `AskUserQuestion` on Claude Code per the `closed-choice-prompts` capability, using full-word labels; the underlying rule is centralized in `sai/instructions/remember.md`.
- The feedback loop must respect `artifact-only-scope`: in sai-1 it may edit only `proposal.md` / `specs/**`; in sai-2 only `design.md` / `tasks.md` / `interfaces.md`.
- Isolation Mode is preserved: the loop is same-session interaction driven by the just-written artifacts, never prior or external context.
- The existing decision-summary blocks are not modified; the gate is appended after them.
- The sai-1 stop message is left unchanged by this change; the delta only defers whichever message the body currently prints behind the `Finish step` selection (it does not restate or reword it).
- In sai-2 the gate precedes, and does not replace, the existing (a)/(b) implementation question. Since the gate can edit `interfaces.md` but branch (b)'s existing confirm re-reads only `design.md`/`tasks.md`, the change requires branch (b)'s pre-continuation re-read to additionally cover `interfaces.md` so a gate edit is not carried into implementation from a stale read.
- There is observed drift between `sai-1-spec-stop` / `uniform-handoff` (which quote a "Specs ready…" message) and the actual `sai/commands/sai-1-spec.md` body (which prints "Spec proposal done…"). This change does not attempt to reconcile that drift; it only gates whichever stop message the body currently prints behind the proceed choice.
