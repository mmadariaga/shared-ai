# Artifact Feedback Gate (shared parameterized instruction)

Shared completion-phase gate fetched by `sai/commands/spec/coordinator.md`, `sai/commands/design/coordinator.md`, and — at **Auto** dispatch — by `sai-explore`'s supervised pipeline (`sai/commands/explore/instructions.md` item 10). It offers an in-context review loop over the artifacts a step just wrote, then hands control to the step's proceed action. The gate logic lives ONLY here — neither body file restates it inline.

Interactive mode, including an omitted `mode`, preserves the existing choice order: `Give feedback (Recommended)` first, followed by `proceed-label`.

## Parameters (supplied inline by the fetching body)

The fetching body MUST supply all three required parameters at the fetch site:

- `artifacts` — the list of artifact names/globs written in this step, open to feedback.
- `proceed-label` — the full-word label for the proceed option (e.g. `Finish step`, `Continue`).
- `next-action` — the action to perform when the user selects the proceed option, or when supervised mode auto-proceeds.

The fetching body MAY also supply the optional `mode` parameter. Its closed vocabulary is exactly `interactive` or `supervised`. When `mode` is omitted, the gate MUST behave as `interactive`; this omitted-mode default is the only exception to the missing-parameter STOP rule. When an invalid non-empty `mode` value other than `interactive` or `supervised` is supplied, STOP and ask for a valid `mode` — do not silently default it to `interactive`, and do not auto-proceed.

If any required parameter is missing, STOP and ask for it — do not assume a default (Isolation Mode: "if required information is missing, ask for it"). The gate MUST NOT detect invocation context at runtime to choose a mode: mode is selected only by the supplied parameter, never by the caller, phase, harness, available channel, or any other runtime context.

## Not an approval gate

This gate MUST NOT ask for approval and MUST NOT write to `.openspec.yaml`. It is a feedback loop only.

## Routed design ownership adapter

For routed sai-1 and sai-2 on Claude Code and opencode, the coordinator owns picker presentation, the iteration counter, pending raw feedback, and the user-facing feedback-text prompt. After each feedback-option selection, the coordinator is the sole owner of that prompt: it emits the prompt exactly once for that selection, waits for the user's next reply, and forwards only the supplied text to the same worker. The worker owns per-item judgment, design-artifact edits, verification, discard reasons, and the summary; it MUST NOT emit, re-present, or duplicate the feedback-text prompt.

Each routed feedback selection is handled by the coordinator with exactly one clean feedback-text prompt. Each selection receives an independent coordinator prompt, and no additional worker prompt is emitted. The canonical labels, descriptions, ordering, counter transitions, artifact sets, selective-processing rules, and proceed semantics remain single-sourced in their existing sections below.

Architecture Snapshot presentation follows the shared design instruction in the routed Claude Code and opencode paths. The routed worker compares effective `interfaces.md` content and composes the existing summary while the coordinator only prints it. The routed paths display the current snapshot immediately before the initial feedback loop and redisplay it only after a normalized complete-interface change, without adding a field or artifact.

## Iteration counter (in-conversation only)

The gate tracks the feedback-option iteration with a single integer counter held in the agent's working memory for the duration of the current session only.

- The counter starts at 0 at the beginning of every fresh `/sai-*` invocation.
- The counter is incremented by 1 immediately after each feedback-selection turn completes (in `## On "Give feedback"`, step 7), before the gate is re-offered.
- The counter is NOT written to any artifact, configuration file, `.openspec.yaml`, or any other on-disk state.
- The counter is NOT derived from any marker in the gate's artifact set, hidden comment, or external/prior-conversation context (Isolation Mode).
- The counter resets to 0 for free at the start of every new chat because Isolation Mode begins each wrapper invocation with no inherited context.

## Machine-feedback adapter (supervised phases)

`MachineFeedbackAdapter` accepts one completed supervised review round's ordered findings from the supervised spec or design phase; every finding SHALL conform to the shared artifact review finding contract single-sourced in `sai/policies/artifact-review-contract.md` (severity-prefixed identifier, severity per the closed `High` / `Medium` / `Low` vocabulary, artifact location, issue statement, recommended correction). For every completed review round in the bounded convergence loop, use the same phase worker that generated the supervised artifacts — the same spec worker for `sai-1` rounds and the same design worker for `sai-2` rounds. For each finding in that round, in array order, perform one same-worker continuation that invokes the existing `## On "Give feedback"` per-item legitimacy rules, artifact-only scope, specific discard reporting, and decision-summary recomputation. These semantics and the finding shape SHALL remain single-sourced in the shared gate instruction and the shared review finding contract at `sai/policies/artifact-review-contract.md` and SHALL NOT be restated in explore or reviewer instructions.

Accepted changes remain worker-owned and may be written only by that worker to `proposal.md` or `specs/**` in the selected change directory. Explore and the supervised rounds remain read-only. Preserve every round-local finding occurrence and the worker's accepted or specifically reasoned discarded feedback disposition; do not infer cross-round finding identity or suppress repeated findings.

When `mode` is `interactive` or omitted (and therefore interactive), machine processing is not a feedback-option selection: it emits neither the picker nor the empty-turn prompt, does not consume a user feedback turn, does not increment the in-conversation iteration counter, and does not execute `proceed-label`/`next-action`. An empty findings array is a no-op. Per-item continuations remain part of the current review round and never increment the round counter.

When `mode` is `supervised`, machine processing likewise emits neither the picker nor the empty-turn prompt, does not consume a user feedback turn, does not offer or accept the direct free-text path, and does not increment the in-conversation iteration counter. It SHALL execute the supplied `next-action` only through the supervised sequencing rule below, and only on a live path whose result is neither `failed` nor `cancelled`.

If finding processing returns `needs_input`, the supervising coordinator must present the exact question and ordered options to the user, then continue the same worker with only the selected answer. Complete all findings for the current round before supervision evaluates whether another review round is required.

Defer the ordinary user-facing gate while another review round is required. When `mode` is `interactive` or omitted, **Present that gate for the first time, unchanged at iteration 0, only after the review loop converges, exhausts its three-round cap, or is interrupted by worker failure.** Its first ordered labels remain `Give feedback (Recommended)` followed by `proceed-label` (for sai-1, `Finish step`). When `mode` is `supervised`, keep the gate deferred through the same review-round resolution, then apply the supervised sequencing rule instead of presenting the ordinary gate; a failed or cancelled result never advances by that rule.

## Present the gate (interactive mode)

The following presentation applies only when `mode` is `interactive` or omitted (omitted mode defaults to interactive). In supervised mode, do not present the option-picker or this user-facing gate; follow [Supervised mode is a sequencing auto-proceed, not gate removal](#supervised-mode-is-a-sequencing-auto-proceed-not-gate-removal) instead.

### Interactive mode (`mode = interactive` or omitted)

The interactive gate keeps the existing picker mapping and ordering: `Give feedback (Recommended)` is emitted before `proceed-label` on iteration 0 (`Finish step` for sai-1 and `Continue` for sai-2), with the exact labels and descriptions below.

Present exactly two choices through the harness's native option-picker per the "Closed-choice prompts" rule in `sai/policies/remember.md`. The question text is:

> Share your feedback on {artifacts} below. You can also type feedback directly in the free-text box.

Replace `{artifacts}` with the supplied artifact list and render the question in the user's language per `sai/policies/remember.md`.

1. **`Give feedback (Recommended)` when in-conversation iteration counter == 0, else `Give more feedback`** — feedback on the artifacts written in this step. Name every entry in `artifacts` so the user knows exactly what is open to feedback. The feedback option description is `Feedback on {artifacts}; you can also type feedback directly in the free-text box.` Replace `{artifacts}` with the supplied artifact list and render the description in the user's language per `sai/policies/remember.md`. The feedback option is emitted FIRST in every presentation (ordering is unaffected by the iteration counter).

The question text, feedback option description, proceed option label, proceed option description, and harness option-picker path stay byte-for-byte identical across every iteration; only this short label changes between the first presentation and any re-presentation. On every re-presentation after a feedback turn (iteration counter > 0), NO option carries the `Recommended` marker — neither the feedback option nor the proceed option.

2. **`proceed-label`** — the step-specific proceed option.

## On a direct free-text reply (interactive mode)

This section applies only when `mode` is `interactive` or omitted (omitted mode defaults to interactive). In `mode = supervised`, do not emit a free-text channel advertisement, do not accept a direct free-text reply, and do not process feedback through this path.

A non-empty reply supplied through the harness-provided free-text channel that selects neither declared option is potential feedback, not an option selection. Pass that text directly to `## On "Give feedback"` below and apply the existing per-item split, legitimacy judgment, artifact-only edits, discard reporting, summary recomputation, iteration increment, and gate re-offer behavior; directly, no additional clean feedback-text prompt is emitted for this direct free-text path.

An empty reply is not a direct free-text reply. When the user selects `Give feedback` or `Give more feedback`, use the existing empty-turn follow-up path below so surfaces without a free-text channel remain supported.

## On selecting the feedback option

Selecting the feedback option lands on an empty turn - the harness option-picker cannot carry the feedback text. Do NOT report or imply that no feedback was supplied, and do NOT run the per-item split/evaluate processing (`## On "Give feedback"`) on this empty selection turn.

For routed sai-1 and sai-2 on Claude Code and opencode, the coordinator is the sole emitter of the clean prompt below. It emits the prompt exactly once for each feedback-option selection, waits for the user's reply, and forwards the supplied text to the same worker. The worker MUST NOT emit, re-present, or duplicate the prompt.

The prompt's canonical form is:

> Share your feedback on {artifacts} below.

Replace `{artifacts}` with the supplied artifact list: `proposal.md`, `specs/**` under sai-1; `design.md`, `tasks.md`, `interfaces.md` under sai-2. Render the canonical English prompt in the user's language at runtime per `sai/policies/remember.md`; render it in the user's language, and output the English form as-is only when the user's language is English.

After the user replies, feed the supplied text into `## On "Give feedback"` below and apply its per-item processing unchanged.

## On "Give feedback"

Apply feedback **selectively per item** — never as an all-or-nothing turn:

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

## On proceed (`proceed-label`) (interactive mode)

When `mode` is `interactive` or omitted (omitted mode defaults to interactive), stop the loop. Stop the loop and perform `next-action` exactly once. Preserve the existing fetch-site-specific proceed behavior and use the supplied `next-action`.

When `mode = supervised`, do not wait for a user selection and do not execute this interactive branch; follow the supervised sequencing rule below.

## Supervised mode is a sequencing auto-proceed, not gate removal

When `mode = supervised` and the deferred-gate condition resolves (review-round convergence, one-round cap exhaustion, or an empty findings array), the gate remains after the existing decision summary and applies the following sequence:

1. Require the `next-action` supplied by the current fetching body. Execute that supplied action exactly once — do not substitute a standalone coordinator action, infer a different action, or execute it again.
2. Do not present the option-picker, feedback option, proceed option, empty-turn prompt, or direct free-text channel. Do not accept a free-text reply and do not increment the in-conversation iteration counter; it remains 0 for the supervised run.
3. Do not ask for approval and do not write approval state or any other value to `.openspec.yaml`. This remains a sequencing action, not an approval gate.
4. Auto-proceed only on a live phase path whose result is neither `failed` nor `cancelled`. A `failed` or `cancelled` result SHALL never auto-proceed and SHALL NOT execute `next-action`; it SHALL stop the supervised path without advancing to the next phase or creating an advance path around that result.
5. Preserve the fetching body's existing report order: the decision summary remains first, the supplied `next-action` runs next, and any existing post-proceed report is emitted after that action. The gate MUST NOT move a post-proceed report before auto-proceed and MUST NOT add suppression chatter of its own.
