# Artifact Feedback Gate (shared parameterized instruction)

Shared completion-phase gate fetched by `sai/commands/sai-1-spec.md` and `sai/commands/sai-2-design.md`. It offers an in-context review loop over the artifacts a step just wrote, then hands control to the step's proceed action. The gate logic lives ONLY here — neither body file restates it inline.

## Parameters (supplied inline by the fetching body)

The fetching body MUST supply all three at the fetch site:

- `artifacts` — the list of artifact names/globs written in this step, open to feedback.
- `proceed-label` — the full-word label for the proceed option (e.g. `Finish step`, `Continue`).
- `next-action` — the action to perform when the user selects the proceed option.

If any parameter is missing, STOP and ask for it — do not assume a default (Isolation Mode: "if required information is missing, ask for it").

## Not an approval gate

This gate MUST NOT ask for approval and MUST NOT write to `.openspec.yaml`. It is a feedback loop only.

## Iteration counter (in-conversation only)

The gate tracks the feedback-option iteration with a single integer counter held in the agent's working memory for the duration of the current session only.

- The counter starts at 0 at the beginning of every fresh `/sai-*` invocation.
- The counter is incremented by 1 immediately after each feedback-selection turn completes (in `## On "Give feedback"`, step 7), before the gate is re-offered.
- The counter is NOT written to any artifact, configuration file, `.openspec.yaml`, or any other on-disk state.
- The counter is NOT derived from any marker in the gate's artifact set, hidden comment, or external/prior-conversation context (Isolation Mode).
- The counter resets to 0 for free at the start of every new chat because Isolation Mode begins each wrapper invocation with no inherited context.

## Present the gate

Present exactly two choices through the harness's native option-picker per the "Closed-choice prompts" rule in `sai/instructions/remember.md` (on Claude Code, the `AskUserQuestion` tool). Labels are full words, never single- or two-letter abbreviations:

1. **`Give feedback (Recommended)` when in-conversation iteration counter == 0, else `Give more feedback`** — feedback on the artifacts written in this step. Name every entry in `artifacts` so the user knows exactly what is open to feedback. The feedback option is emitted FIRST in every presentation (ordering is unaffected by the iteration counter).

The description text, the proceed option label, the proceed option description, and the harness option-picker path stay byte-for-byte identical across every iteration; only this short label changes between the first presentation and any re-presentation. On every re-presentation after a feedback turn (iteration counter > 0), NO option carries the `Recommended` marker — neither the feedback option nor the proceed option.

2. **`proceed-label`** — the step-specific proceed option.

## On selecting the feedback option

Selecting the feedback option lands on an empty turn — the harness option-picker cannot carry the feedback text. Do NOT report or imply that no feedback was supplied, and do NOT run the per-item split/evaluate processing (`## On "Give feedback"`) on this empty selection turn.

FIRST emit a clean, non-accusatory prompt that names every entry in `artifacts`, then wait for the user's reply. The prompt's canonical form is:

> Share your feedback on {artifacts} below.

where `{artifacts}` is replaced by the step's artifact list (supplied by the fetching body — `proposal.md`, `specs/**` under sai-1; `design.md`, `tasks.md`, `interfaces.md` under sai-2). Following the established explore.md item-3 pattern, this canonical form is authored in English but is NOT output verbatim in English: render it in the user's language at runtime per `sai/instructions/remember.md` (for a Spanish-speaking user: `Indícame a continuación tu feedback sobre {artifacts}`). Only when the user's language is English is the English form output as-is.

After the user replies, feed the supplied text into `## On "Give feedback"` below and apply its per-item processing unchanged.

## On "Give feedback"

Apply feedback **selectively per item, never as an all-or-nothing turn**:

1. Split the user's feedback into individual items.
2. Evaluate each item independently. An item is **illegitimate** when it:
   - contradicts the change's Why/scope or the artifact's purpose;
   - would violate an established constraint (`artifact-only-scope`, Isolation Mode, atomic-commit planning, etc.);
   - is factually contradicted by the just-written artifacts or the codebase;
   - is out of phase for the step (e.g. a design decision requested during the spec-only sai-1 phase);
   - is internally contradictory, or would remove a testable requirement without replacement.
3. Apply every **legitimate** item by editing the relevant `artifacts` in place. Edits MUST stay within the step's artifact-only scope — only the files named in `artifacts`; never project source, configuration, or any file outside that set.
4. Report every **discarded** item individually: state the item and the specific reason it was not applied, before reprinting the summary. Discards are **soft** — if the user reimposes a discarded item on a later iteration, treat it as ordinary feedback and apply it.
5. Reprint the step's decision summary, recomputed from the updated artifacts, **exactly as the surrounding step's `## Completion` section defines it** — do not embed or invent a summary format here. Every summary line SHALL trace only to the updated artifacts; no prior-conversation or external context (Isolation Mode).
6. Re-offer the same two-option gate.
7. Increment the in-conversation iteration counter by 1 immediately after this feedback turn completes, before re-offering the gate.

Repeat this loop until the user selects the proceed option.

## On proceed (`proceed-label`)

Stop the loop and perform `next-action` exactly once.
