# Artifact Feedback Gate (shared parameterized instruction)

Shared completion-phase gate fetched by `sai/commands/spec/coordinator.md`, `sai/commands/design/coordinator.md`, and — at **Plan (unattended)** dispatch — by `sai-explore`'s supervised pipeline (`sai/commands/explore/steps/pipeline-plan-unattended.md`). It runs a review loop over the artifacts a step just wrote, then hands control to the step's proceed action. The gate logic lives only here; fetching cards supply parameters and do not restate it.

This is a feedback loop, not an approval gate: it never asks for approval and never writes `.openspec.yaml`. In interactive mode it offers `Give feedback (Recommended)` before the proceed option; in supervised mode it auto-proceeds without presenting anything.

## Parameters (supplied inline by the fetching body)

The fetching body supplies three required parameters at the fetch site:

- `artifacts` — the artifact names/globs written in this step, open to feedback (`proposal.md`, `specs/**` for sai-1; `design.md`, `tasks.md`, `interfaces.md` for sai-2).
- `proceed-label` — the full-word label of the proceed option (`Finish step` for sai-1, `Continue` for sai-2).
- `next-action` — the action performed when the user selects the proceed option, or when supervised mode auto-proceeds.

The optional `mode` parameter has the closed vocabulary `interactive` or `supervised`. An omitted `mode` means `interactive`; every later mention of interactive mode includes it. The gate never detects or infers its mode from the caller, phase, harness, available channel, or any other runtime context; the mode comes only from this parameter.

If a required parameter is missing, or an invalid non-empty `mode` value is supplied, STOP and ask for it (Isolation Mode: "if required information is missing, ask for it"); never default it or auto-proceed.

## Ownership on routed sai-1 and sai-2

On Claude Code and opencode, the coordinator owns picker presentation, the iteration counter, pending raw feedback, and the user-facing feedback-text prompt. Each routed feedback selection gets exactly one clean feedback-text prompt from the coordinator: each selection receives an independent coordinator prompt, and no additional worker prompt is emitted. The worker owns per-item judgment, artifact edits, verification, discard reasons, and the summary; it MUST NOT emit, re-present, or duplicate the feedback-text prompt.

## Iteration counter (in-conversation only)

One integer counter, held in working memory for the current invocation, starts at 0 and drives the feedback option's label. It is incremented once after each completed feedback turn, before the gate is re-offered. It lives only in the conversation: it is never written to disk and never derived from artifact markers or prior-conversation context, so each new chat starts at 0.

## Machine-feedback adapter (supervised phases)

`MachineFeedbackAdapter` carries one completed supervised review round's ordered findings to the same phase worker that generated the supervised artifacts — the same spec worker for `sai-1` rounds and the same design worker for `sai-2` rounds. Every finding conforms to the shared artifact review finding contract in `sai/policies/artifact-review-contract.md` (severity-prefixed identifier, severity per the closed `High` / `Medium` / `Low` vocabulary, artifact location, issue statement, recommended correction).

For each completed review round in the bounded convergence loop, perform exactly one same-worker continuation that carries that round's complete ordered findings list to that worker. Within that single turn, the worker applies the `## On "Give feedback"` rules sequentially for every item in array order — per-item legitimacy rules, artifact-only scope, and specific discard reporting — performs exactly one verification at the close of the turn (`openspec validate`), emits one block reporting every individual disposition (`applied`, or `discarded` with its specific reason), and completes the decision-summary recomputation exactly once from the artifacts as they exist on disk.

Accepted changes remain worker-owned and may be written only by that worker to the files in `artifacts` (`proposal.md` or `specs/**` for sai-1; `design.md`, `tasks.md`, or `interfaces.md` for sai-2) in the selected change directory. Explore and the supervised rounds stay read-only. Preserve every round-local finding occurrence and its disposition; do not infer cross-round finding identity or suppress repeated findings. An empty findings array is a no-op.

Machine processing is not a feedback-option selection in either mode: it emits neither the picker nor the empty-turn prompt, does not consume a user feedback turn, does not increment the in-conversation iteration counter, and does not execute `proceed-label`/`next-action`. Its single continuation belongs to the current review round and never increments the round counter. In supervised mode it also offers no direct free-text path.

If finding processing returns `needs_input`, the supervising coordinator presents the exact question and ordered options to the user and continues the same worker with only the selected answer. Complete all findings for the current round before supervision evaluates whether another review round is required.

Defer the ordinary user-facing gate while another review round is required; the supervised bound is at most three rounds per phase per Plan (unattended) attempt, reset for each new attempt.

- **interactive** — Present that gate for the first time, unchanged at iteration 0, only after the review loop converges, exhausts its three-round cap, or is interrupted by worker failure. Its first ordered labels remain `Give feedback (Recommended)` followed by `proceed-label`.
- **supervised** — keep the gate deferred through the same resolution, then apply [Supervised mode is a sequencing auto-proceed, not gate removal](#supervised-mode-is-a-sequencing-auto-proceed-not-gate-removal) instead; a failed or cancelled result never advances by that rule.

## Present the gate (interactive mode)

In supervised mode none of this section runs: no review-loop note, question, option-picker, or free-text advertisement.

Present exactly two choices through the harness's native option-picker per the "Closed-choice prompts" rule in `sai/policies/remember.md`. Per the concise-format rule in `@sai/policies/question-context.md`, the picker carries only the short question; the decision context goes in ordinary chat immediately before it, in this order:

1. The context — what is being decided, why it matters, every entry in `artifacts` by name, and that feedback can also be typed directly in the free-text channel.
2. One non-option informational note: the user can run the literal command `sai-explore` with the literal `review-loop` token to obtain an artifact review and paste the findings here. The note is not a third picker option, feedback input, approval, or progress event.
3. The question: `Share feedback on {artifacts}?`

The options, in this order:

1. **`Give feedback (Recommended)` at iteration 0, else `Give more feedback`** — description `Feedback on {artifacts}.`
2. **`proceed-label`** — the step-specific proceed option.

Replace `{artifacts}` with the supplied list. Render the context, note, question, and description in the user's language per `sai/policies/remember.md`; keep the command `sai-explore` and the token `review-loop` verbatim in English. The question, descriptions, proceed label, and picker path stay byte-for-byte identical across iterations; only the feedback option's short label changes, and on every re-presentation (iteration counter > 0) no option carries the `Recommended` marker.

## On a direct free-text reply (interactive mode)

A non-empty reply supplied through the harness-provided free-text channel that selects neither declared option is potential feedback, not an option selection. Pass it directly to `## On "Give feedback"` below; this direct path emits no additional clean feedback-text prompt. An empty reply is not a direct free-text reply.

## On selecting the feedback option

Selecting `Give feedback` or `Give more feedback` lands on an empty turn: the picker cannot carry the feedback text, and surfaces without a free-text channel rely on this path. On that turn, neither report that no feedback was supplied nor run `## On "Give feedback"`. Instead the coordinator emits this prompt exactly once for the selection:

> Share your feedback on {artifacts} below.

Replace `{artifacts}` with the supplied list and render it in the user's language per `sai/policies/remember.md`. Wait for the user's reply and forward only that text to the same worker, which feeds it into `## On "Give feedback"`.

## On "Give feedback"

Apply feedback **selectively per item** — never as an all-or-nothing turn:

1. Split the user's feedback into individual items.
2. Evaluate each item independently. An item is **illegitimate** when it:
   - contradicts the change's Why/scope or the artifact's purpose;
   - would violate an established constraint (`artifact-only-scope`, Isolation Mode, atomic-commit planning, etc.);
   - is factually contradicted by the just-written artifacts or the codebase;
   - is out of phase for the step (e.g. a design decision requested during the spec-only sai-1 phase);
   - is internally contradictory, or would remove a testable requirement without replacement.
3. Apply every **legitimate** item by editing the relevant `artifacts` in place. Edits stay within the step's artifact-only scope: only the files named in `artifacts`.
4. Report every **discarded** item individually: state the item and the specific reason it was not applied, before reprinting the summary. Discards are **soft** — if the user reimposes a discarded item on a later iteration, treat it as ordinary feedback and apply it.
5. Reprint the step's decision summary, recomputed from the updated artifacts, **exactly as the surrounding step's `## Completion` section defines it**. Every summary line traces only to the updated artifacts, never to prior-conversation or external context (Isolation Mode).
6. Increment the in-conversation iteration counter by 1.
7. Re-offer the same two-option gate.

Repeat this loop until the user selects the proceed option.

## On proceed (`proceed-label`) (interactive mode)

Stop the loop and perform `next-action` exactly once, using the action the fetching body supplied.

## Supervised mode is a sequencing auto-proceed, not gate removal

When `mode = supervised` and the deferred-gate condition resolves (review-round convergence, three-round cap exhaustion, or an empty findings array), the gate stays in place after the existing decision summary and runs this sequence:

1. Auto-proceed only on a live phase path whose result is neither `failed` nor `cancelled`. A `failed` or `cancelled` result SHALL never auto-proceed and SHALL NOT execute `next-action`; it stops the supervised path without advancing to the next phase or creating an advance path around that result.
2. Execute the `next-action` supplied by the current fetching body exactly once — never a substitute standalone coordinator action, an inferred action, or a second execution.
3. The decision summary comes first; any existing post-proceed report is emitted after `next-action`, keeping the fetching body's report order. Add no suppression chatter of your own.

Supervised mode presents nothing to the user and waits for no selection; the iteration counter stays 0 for the supervised run, and no approval state or other value is written to `.openspec.yaml`.
