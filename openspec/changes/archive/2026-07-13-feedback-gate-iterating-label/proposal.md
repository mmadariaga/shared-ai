## Why

On a long review loop the user repeatedly faces the same feedback option label and may not realize the gate is a true loop rather than a one-shot prompt. Mirroring the user's own mental model ("do I have more to say?") on the button itself is a tiny affordance that costs nothing and removes a small source of friction.

## What Changes

- Make the feedback option label in the artifact feedback gate iteration-aware: the first presentation reads "Give feedback", every re-presentation after the user selects the feedback option reads "Give more feedback". The option description text stays unchanged. The internal `## On "Give feedback"` section heading in the gate instruction stays literal (internal prose, not user-visible).
- The iteration counter lives only in-conversation. It MUST NOT be written to any artifact, config, or `.openspec.yaml` (the gate's "Not an approval gate" rule already forbids writes to `.openspec.yaml`; this change extends the same prohibition to all on-disk state).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `artifact-feedback-gate`: refine the option-presentation requirement so the feedback option label is iteration-aware; the counter lives in-conversation only, not in any artifact.

## Impact

- `sai/instructions/artifact-feedback-gate.md` (the shared gate instruction) — edit the option-presentation section to add the iteration-aware label rule. No harness-specific wrapper (`commands/claude/`, `commands/opencode/`, `commands/copilot/`) changes, because they all fetch the shared instruction at runtime. No project source, configuration, or `.openspec.yaml` is touched. The change is fully harness-universal: the same rule applies on Claude Code (`AskUserQuestion`), opencode (`question`), and GitHub Copilot (plain text).
- `openspec/specs/artifact-feedback-gate/spec.md` — modify the `Gate presentation via the harness option-picker` requirement to require the iteration-aware label, and additionally add a new `Iteration counter is in-conversation only` requirement that pins the counter mechanism (in-conversation only, no on-disk state, resets per `/sai-*` invocation).

## Proposal Research Documentation

**Local files**:
- `sai/instructions/artifact-feedback-gate.md` (full file) — current source of the gate logic; the only implementation surface this change touches.
- `openspec/specs/artifact-feedback-gate/spec.md` (full file) — the capability spec being modified.
- `sai/instructions/remember.md` (full file) — defines the "Closed-choice prompts" rule that gates the harness option-picker behavior; the iteration-aware label change is layered on top of this rule without modifying it.

**External URLs**:
- None.

## Additional Notes

- **In-conversation counter, not on-disk state.** Rationale: the gate already owns the loop; a single counter held in the agent's working memory for the duration of the session is the smallest mechanism that works with no new state surface. Persisting it across sessions (e.g. to a yaml) would require new disk state and would conflict with the gate's existing "Not an approval gate" rule that explicitly forbids writes to `.openspec.yaml`. The counter survives only for the lifetime of the current chat; each fresh `/sai-*` invocation starts at 0 and presents "Give feedback" on its first gate.
- **Per-session iteration, not per-change iteration.** A user who reaches the gate across separate `/sai-*` invocations on different days always sees "Give feedback" on each fresh run, never "Give more feedback" carried over from a previous chat. This is the desired behavior: the button is asking the user "do you have more to say right now?", not "did you say more last time?".
- **Description text unchanged.** The user asked for the label only; rewriting the description is unnecessary surface and risks cascading wording churn. The description ("feedback on the artifacts written in this step…") stays byte-for-byte the same across every iteration; only the short label changes.
- **Internal section heading literal.** The gate instruction's own `## On "Give feedback"` section heading is internal section prose — agent reads it, user does not see it. Aligning it to "On \"Give more feedback\"" would be cosmetic noise that breaks the existing internal vocabulary.
- **Alternatives considered and rejected** (for context; not normative):
  - Re-derive iteration from a marker in the gate's own artifact set (e.g. a hidden comment). Rejected: the gate is forbidden from writing outside the step's named artifact set, and a "hidden" comment in `proposal.md` / `design.md` would leak session state into the canonical artifacts.
  - Re-word the description instead of the label (e.g. "Add more feedback on the artifacts written in this step."). Rejected: the user asked for the label; the description change would be a wider rewrite with no clear gain.
  - Make it a new capability. Rejected: this is a refinement of the existing `artifact-feedback-gate` capability, not a new behavior; a new capability would split one coherent surface across two spec files.
- **Harness universality preserved.** The option-picker path stays per `remember.md`'s "Closed-choice prompts" rule — Claude Code `AskUserQuestion`, opencode `question`, Copilot plain text. The label change applies identically across all three. Labels remain full words (no single- or two-letter abbreviations), per the existing `closed-choice-prompts` capability rule.
- **Artifact-only-scope preserved.** The iteration counter MUST NOT cause any write outside the step's named artifacts. The counter is in-conversation only; no prior or external context is consulted (Isolation Mode holds).

