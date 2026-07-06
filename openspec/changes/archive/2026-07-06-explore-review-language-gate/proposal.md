## Why

`sai/instructions/remember.md:4` makes the agent's chat mirror the user's input language by default. That default is fine for most of the pipeline, but when the user returns to their original `sai-explore` chat to review an OpenSpec artifact produced by `/sai-1-spec` or `/sai-2-design`, the review lands in the user's chat language even though they typically prefer English (matching the rest of the pipeline). The user wants a conscious, per-review-target choice at that moment — not an implicit default.

## What Changes

- Add a **language gate** to `sai-explore` only: when an explore turn is a request to review an existing OpenSpec artifact **and** the user's input language is not English, the agent asks a single 2-option question (`English` | `<current language>`) and waits for the answer before producing any review content.
- Skip the question entirely when the user is already writing in English.
- Persist the chosen review language for the rest of that review of a given artifact or set of artifacts; the gate fires once per review target (re-asking when the user starts a review of a *different* artifact or set in the same chat, reusing the prior choice on follow-up turns about the same artifact).
- Fall back to the existing `remember.md` language policy (chat = user's language) if the user declines or answers non-committally ("whatever").
- Leave the rest of explore mode unchanged: free-form debate of the original idea, exploratory discussion that is not an artifact review, and the `Ready to Propose` block (which stays in English).
- Chat output only — no artifact file format or content is changed by this capability.

## Capabilities

### New Capabilities
- `explore-review-language-gate`: in `sai-explore`, detect when a turn requests a review of an existing OpenSpec artifact; when the user's input language is not English, ask one 2-option question (`English` | `<current language>`, question text translated into the user's language, the literal word `English` kept verbatim) and wait for the answer before emitting review content. Skip the gate for English input. The gate fires once per review of a given artifact or set of artifacts: a follow-up turn about the same artifact(s) reuses the previously chosen language, and a new review of a different artifact or set re-asks the question; a declined or non-committal answer falls back to the `remember.md` policy. (Persistence semantics refined during `/sai-2-design` — see Additional Notes.)

### Modified Capabilities
<!-- none -->

## Impact

- **Instruction files** (edited downstream by implement/apply, not in this spec phase): `sai/instructions/explore.md` (the `sai-explore`-specific behavior file) is the natural home for the gate; it must reference/qualify the `remember.md` language default without changing that default for other commands.
- **Scope boundary**: `sai/instructions/remember.md` language policy is unchanged and still governs the fallback; other `sai-*` commands are untouched.
- **No production code, no artifact schema change.** Behavior is purely conversational (a gating question in chat).

## Proposal Research Documentation

**Local files**: `sai/commands/sai-explore.md`, `sai/instructions/explore.md`, `sai/instructions/remember.md`, `sai/commands/sai-1-spec.md`, `sai/instructions/spec.propose.md`, `.claude/skills/openspec-explore/SKILL.md`

**External URLs**: none

## Additional Notes

- **What counts as a "review"**: a turn that requests a review of an existing artifact under `openspec/changes/{name}/` (`proposal.md`, `design.md`, `tasks.md`, `specs/**/*.md`, `implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`) or under `openspec/specs/`, `openspec/changes/archive/`, etc. The user may refer to the artifact however is natural (literal path, bare filename, or change-name plus artifact mention); the spec fixes the *contract* for what fires the gate, and leaves the *detection heuristic* to `sai-2-design` / `explore.md`. Free-form debate of the original idea is explicitly **not** a review and does not trigger the gate.
- **Question presentation**: the two option labels are translated into the user's current language, except the `English` option label, which stays the literal word `English` to avoid ambiguity.
- **Input language**: the *dominant* natural language of the turn decides the gate; incidental code-switching / embedded technical terms do not flip it, and an unclear dominant language falls back to the `remember.md` default (no question).
- **"Session" = the review of a given artifact or set of artifacts** (refined during `/sai-2-design`, per the user-authorized D8 amendment). The chosen review language persists for follow-up turns about the same artifact(s); when the user starts a review of a *different* artifact or set, the agent re-asks the gate question. `sai-explore` runs in Isolation Mode per invocation, so a new invocation starts with no tracked target. Persistence is behavioral (held in-conversation), not a stored/config value — no file or state is written.
- **Deferred to design/implement**: a verification-examples strategy (e.g. an `examples/` directory of trigger cases) is out of scope for this spec phase; it belongs to `tasks.md` in `sai-2-design` / `sai-3-implement`.
- Not in scope: changing the `remember.md` default, changing any other `sai-*` command, or altering any artifact's format/content. The `Ready to Propose` block remains English regardless of the gate outcome.
- **Persistence refinement (design phase):** the original wording above ("persists for the rest of that review session", "fires once per review session, not once per turn") was refined during `/sai-2-design`. "Review session" now means **a review of a given artifact or set of artifacts** — the gate re-fires when the user starts a review of a *different* artifact or set than the one(s) most recently reviewed, and reuses the prior choice on follow-up turns about the same artifact(s). See the amended requirement "Gate re-fires when the review target changes" in `specs/explore-review-language-gate/spec.md`. This refinement was user-authorized during the design phase to match the user's actual usage pattern (a fresh choice per review target, with token-cost English as the implicit default).
