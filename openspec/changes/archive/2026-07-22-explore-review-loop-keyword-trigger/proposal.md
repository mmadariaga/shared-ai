## Why

`sai-explore` item 3 (artifact-review language gate) and item 9 (post-crystallization review loop) fire on identical natural language — "revisa los artefactos de sai-1" matches item 3's own documented example "mira los specs de oauth2-auth" — and no precedence rule exists between them, so a review request reliably resolves to a one-shot review and the loop is never reached. The loop's only entry today is semantic detection, which is exactly what is failing.

## What Changes

- Add a literal trigger token `review-loop` to the post-crystallization review loop's standing invitation. Firing it enters the per-change picker directly, bypassing the plain-text global sí/no question. The token fires on **intent** — bare token or dominant turn intent — never on mere substring containment, mirroring the Emission gate's "explicitly asks to crystallize" test.
- Declare the token live for the whole session (before, after, or absent any crystallization), and require a one-line acknowledgment instead of silence when the tracked crystallized set is empty.
- Declare mixed-trigger precedence: a turn that both requests an item-3 review of a tracked change and fires the token gets the review first, then direct loop entry.
- Retain the plain-text global sí/no question on the **semantic** trigger path only (accepting the standing invitation in natural language, or asking to review the crystallized changes' downstream artifacts).
- Add an **additive precedence rule** to item 3: when an artifact-review turn names a change that is in the chat-scoped tracked crystallized set, item 3 produces its review exactly as today and then emits the plain-text review invitation after it.
- Add `review-loop` to the item-8 crystallization language gate's English-invariant scaffolding list, so the token is never localized.
- Require the keep-window-open recommendation that closes every crystallization turn (items 5 and 6) to name the literal token `review-loop`, mirroring how the Emission gate advertises `crystallize`.

No breaking changes: both existing entry behaviors (semantic trigger → global question → loop; item 3 one-shot review) are preserved.

## Capabilities

### New Capabilities

None — this change is a delta against two existing capabilities (per ADR 0058).

### Modified Capabilities

- `explore-post-crystallization-review-loop`: the standing invitation gains `review-loop` as a literal trigger that enters the per-change loop directly, bypassing the global sí/no question; the plain-text question is retained for the semantic trigger path only. Item 3 gains an additive precedence rule — a review request naming a tracked crystallized change yields the requested review followed by the invitation.
- `explore-crystallization-block`: the keep-window-open recommendation that closes the crystallization turn must name the literal token `review-loop`.

## Impact

- `sai/instructions/explore.md` — items 3, 5, 6, 8, and 9 (the sole edit target; `explore-crystallization-block` already constrains the change surface to this file). Item 3 is edited because the additive precedence rule lives there; its trigger conditions, language gate, Persistence rule, and `Ready to Propose` invariant are otherwise unchanged.
- No other `sai-*` command's behavior changes. No wrapper under `commands/{claude,opencode,copilot}/`, no `AGENTS.md`, no skill, schema, or harness configuration is affected.
- The review loop stays strictly read-only; the already-emitted `Ready to Propose` block is never altered.
- `--fast-track` semantics are unchanged: it still governs only review-content language and still cannot suppress the global question on the semantic path.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/explore.md` (items 3, 4, 5, 6, 7, 8, 9 and the Emission gate)
- `openspec/specs/explore-post-crystallization-review-loop/spec.md`
- `openspec/specs/explore-crystallization-block/spec.md`
- `sai/instructions/remember.md` (Closed-choice prompts rule)
- `sai/instructions/spec.propose.md`
- `sai/commands/sai-1-spec.md`

**External URLs**: None.

## Additional Notes

- The Emission gate (`explore.md`, "Emission gate (on-demand crystallization)") is the reference implementation of this pattern: a readiness signal names a literal token (`crystallize`) and the token acts without further confirmation. `review-loop` mirrors it.
- The token is `review-loop` and not `review` or `revisar` because those are exactly the ambiguous words item 3 already claims; a hyphenated compound cannot occur incidentally in prose and reads as a token rather than as a sentence.
- The precedence rule is **additive**, not a reroute. Rerouting a review request into item 9's global question means a `no` answer — a hard stop on the whole review section — leaves the user without the review they explicitly asked for. Serving the review first and then offering the loop has no such regression.
- Alternatives rejected: (a) token only, with no precedence rule — unambiguous and smaller, but forgetting the word restores today's behavior exactly; (b) precedence rule only, with no token — nothing new to memorize, but the loop's entry stays dependent on the semantic detection that is failing; (c) rerouting item 3 into item 9 when the change is tracked — rejected for the hard-stop regression above.
- Trade-offs accepted: two entry paths into the loop (token and semantic) instead of one, which is more surface to specify and keep consistent; and one more literal token for the user to remember, mitigated by printing it in the line that closes every crystallization turn.
- Re-framing: the failure was reframed from "the agent does not detect the trigger" to "two gates claim the same natural language and the spec declares no precedence", which moves the fix from better detection to explicit disambiguation.
- The per-change three-option picker (`Review sai-1's artifacts`, `Review sai-2's artifacts`, `Skip`) remains a harness native option-picker; the plain-text exception to `remember.md`'s Closed-choice prompts rule stays scoped to the global invitation.
