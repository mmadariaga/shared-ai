# Item 3: Language gate for artifact reviews

When a turn's primary deliverable is a review of an existing OpenSpec artifact and the user's dominant natural language is not English, ask a single 2-option language question before producing any review content. For artifact-review turns, this gate refines the `sai/policies/remember.md` default of answering in the user's input language.

**Trigger.** The gate fires **only** when reviewing one of the following artifacts is the turn's **primary deliverable**: `proposal.md`, `design.md`, `tasks.md`, `specs/**/*.md`, `implementation.md`, `review.md`, `security.md`, `performance.md`, or `accessibility.md` under `openspec/changes/{name}/`, `openspec/specs/`, or `openspec/changes/archive/`. The artifact may be referenced by literal path, bare filename, or change-name plus artifact mention. Free-form debate of the original idea, and turns that only cite an artifact as supporting evidence, do **not** trigger the gate.

**Examples** (detection guidance, not a rigid verb list):
- **Fires on**: "review the design", "qué te parece el proposal", "mira los specs de oauth2-auth".
- **Does not fire on**: "the design is too complex", "I'd change the proposal because…", "the design says X — what about Y?" (cited as evidence in a debate).

**English skip**: If the turn's dominant natural language is English, produce the review directly in English with no question.

**Fast-track skip**: If the fast-track signal is active, produce the review directly in English with no question.

**Non-English gate**: If the turn's dominant natural language is not English, ask exactly one question with two options. Translate the entire question prompt and the non-English option label into the user's current language; only the literal word `English` stays verbatim. The English option is the default: emit it first, labelled `English (Recommended)`. Produce **no** review content until the user answers. Translate this English template rather than printing it verbatim:
```
You're about to review an OpenSpec artifact. Which language should the review be in?
- English (Recommended)
- <endonym of the user's current language, written in that language>
```

**Persistence**: The gate fires once per **review of a given artifact or set of artifacts**. Track the artifact(s) referenced in the most recent review turn (by filename or path). A new turn that references a *different* artifact or set → re-ask the gate. A follow-up turn about the *same* artifact(s) → reuse the previously chosen language, no re-ask. A new `/sai-explore` invocation starts with no tracked target → re-fires on its first non-English review turn. The choice and the tracked target live in the conversation only, never in a file or config.

**Decline / non-committal / unclear language**: If the user declines or answers non-committally, fall back to the `sai/policies/remember.md` policy (chat output in the user's input language). If the dominant natural language of the turn cannot be determined with reasonable confidence, skip the question and fall back to `remember.md`.

**`Ready to Propose` invariant**: This gate sets only the review's language. The `Ready to Propose` block's content and prose language belong solely to the crystallization language gate (item 8), and every artifact file keeps its format and content.

**Tracked-change precedence (additive)**: When the review names a change in the chat-scoped tracked crystallized set (item 9), produce the review exactly as this gate describes — same trigger, same language gate, same Persistence rule, same read-only behavior — and THEN append item 9's plain-text global sí/no review invitation. The invitation is **additive, never a reroute**: answering `no` to it is a hard stop on the entire review section, so putting the question in place of the review would deny the user the review they asked for. `no` after the appended invitation ends the review section and leaves the review untouched; `yes` enters item 9's per-change loop over the tracked crystallized set. A change outside the tracked crystallized set gets the review with no invitation. When the same turn also fires the `review-loop` token, item 9's **Mixed trigger** rule governs instead: the review is served first, then the loop is entered directly and no invitation is emitted.
