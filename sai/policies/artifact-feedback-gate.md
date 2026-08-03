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

## Routed design ownership adapter

`sai-1-spec` and inline Copilot retain all existing inline behavior. For routed `sai-2-design`, the coordinator owns picker presentation, the iteration counter, and pending raw feedback. The design-planning worker owns per-item judgment, design-artifact edits, verification, discard reasons, and the summary. The canonical labels, descriptions, ordering, counter transitions, artifact sets, and proceed semantics remain single-sourced in their existing sections below.

Architecture Snapshot presentation follows the shared design instruction in both routed and inline paths. The routed worker compares effective `interfaces.md` content and composes the existing summary while the coordinator only prints it; the inline adapter retains equivalent in-conversation comparison and presentation. Both paths display the current snapshot immediately before the initial feedback loop and redisplay it only after a normalized complete-interface change, without adding a field or artifact.

## Iteration counter (in-conversation only)

The gate tracks the feedback-option iteration with a single integer counter held in the agent's working memory for the duration of the current session only.

- The counter starts at 0 at the beginning of every fresh `/sai-*` invocation.
- The counter is incremented by 1 immediately after each feedback-selection turn completes (in `## On "Give feedback"`, step 7), before the gate is re-offered.
- The counter is NOT written to any artifact, configuration file, `.openspec.yaml`, or any other on-disk state.
- The counter is NOT derived from any marker in the gate's artifact set, hidden comment, or external/prior-conversation context (Isolation Mode).
- The counter resets to 0 for free at the start of every new chat because Isolation Mode begins each wrapper invocation with no inherited context.

## Machine-feedback adapter (supervised sai-1 only)

`MachineFeedbackAdapter` accepts one completed review pass's structured `IndependentReviewFinding[]` and its positive `passNumber` from supervised sai-1. For every completed review pass in the bounded convergence loop, use the same sai-1 spec-proposal worker that generated the supervised artifacts. For each finding in that pass, in array order, perform one same-worker continuation that invokes the existing `## On "Give feedback"` per-item legitimacy rules, artifact-only scope, specific discard reporting, and decision-summary recomputation. These semantics remain single-sourced here and are not restated by explore or a reviewer.

Accepted changes remain worker-owned and may be written only by that worker to `proposal.md` or `specs/**` in the selected change directory. Explore and every independent reviewer remain read-only. Preserve every pass-local finding occurrence with its pass number and the worker's accepted or specifically reasoned discarded feedback disposition; do not infer cross-pass finding identity or suppress repeated findings.

Machine processing is not a feedback-option selection: it emits neither the picker nor the empty-turn prompt, does not consume a user feedback turn, does not increment the in-conversation iteration counter, and does not execute `proceed-label`/`next-action`. An empty findings array is a no-op. Per-item continuations remain part of the current review pass and never increment the review-pass count.

If finding processing returns `needs_input`, the supervising coordinator must present the exact question and ordered options to the user, then continue the same worker with only the selected answer. Complete all findings for the current pass before supervision evaluates whether another fresh review pass is required.

Defer the ordinary user-facing gate while another review pass is required. Present that gate for the first time, unchanged at iteration 0, only after the review loop converges, exhausts its three-pass cap, or is interrupted by `review_failed` or `review_cancelled`. Its first ordered labels remain `Give feedback (Recommended)` followed by `proceed-label` (for sai-1, `Finish step`).

## Present the gate

Present exactly two choices through the harness's native option-picker per the "Closed-choice prompts" rule in `sai/policies/remember.md` (on Claude Code, the `AskUserQuestion` tool). Labels are full words, never single- or two-letter abbreviations:

1. **`Give feedback (Recommended)` when in-conversation iteration counter == 0, else `Give more feedback`** — feedback on the artifacts written in this step. Name every entry in `artifacts` so the user knows exactly what is open to feedback. The feedback option is emitted FIRST in every presentation (ordering is unaffected by the iteration counter).

The description text, the proceed option label, the proceed option description, and the harness option-picker path stay byte-for-byte identical across every iteration; only this short label changes between the first presentation and any re-presentation. On every re-presentation after a feedback turn (iteration counter > 0), NO option carries the `Recommended` marker — neither the feedback option nor the proceed option.

2. **`proceed-label`** — the step-specific proceed option.

## On selecting the feedback option

Selecting the feedback option lands on an empty turn — the harness option-picker cannot carry the feedback text. Do NOT report or imply that no feedback was supplied, and do NOT run the per-item split/evaluate processing (`## On "Give feedback"`) on this empty selection turn.

FIRST emit a clean, non-accusatory prompt that names every entry in `artifacts`, then wait for the user's reply. The prompt's canonical form is:

> Share your feedback on {artifacts} below.

where `{artifacts}` is replaced by the step's artifact list (supplied by the fetching body — `proposal.md`, `specs/**` under sai-1; `design.md`, `tasks.md`, `interfaces.md` under sai-2). Following the established explore.md item-3 pattern, this canonical form is authored in English but is NOT output verbatim in English: render it in the user's language at runtime per `sai/policies/remember.md` (for a Spanish-speaking user: `Indícame a continuación tu feedback sobre {artifacts}`). Only when the user's language is English is the English form output as-is.

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
