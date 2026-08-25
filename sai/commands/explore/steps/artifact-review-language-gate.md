# Item 3: Language gate for artifact reviews (sai-explore only)

When this turn requests a review of an existing OpenSpec artifact, and the user's dominant natural language is not English, ask a single 2-option language question before producing any review content. This gate applies only within `sai-explore`; no other `sai-*` command is affected. It qualifies `sai/policies/remember.md:4` ("Agent responses to user: Same language as user input by default") for artifact-review turns only; `remember.md` itself is unchanged.

The gate fires **only** when reviewing one of the following artifacts is the turn's **primary deliverable**: `proposal.md`, `design.md`, `tasks.md`, `specs/**/*.md`, `implementation.md`, `review.md`, `security.md`, `performance.md`, or `accessibility.md` under `openspec/changes/{name}/`, `openspec/specs/`, or `openspec/changes/archive/`. The artifact may be referenced by literal path, bare filename, or change-name plus artifact mention. Free-form debate of the original idea, and turns that only cite an artifact as supporting evidence, do **not** trigger the gate.

**Examples** (in-conversation detection guidance — not a rigid verb list):
- **Fires on**: "review the design", "qué te parece el proposal", "mira los specs de oauth2-auth".
- **Does not fire on**: "the design is too complex", "I'd change the proposal because…", "the design says X — what about Y?" (cited as evidence in a debate).

**English skip**: If the turn's dominant natural language is English, produce the review directly in English with no question.

**Fast-track skip**: If the fast-track signal is active, produce the review directly in English with no question.

**Non-English gate**: If the turn's dominant natural language is not English, ask exactly one question with two options. The **entire question prompt and the non-English option label SHALL be translated into the user's current language**; only the literal word `English` (the English-option label) is preserved verbatim. The English option is the default: it SHALL be emitted first and carry the `Recommended` marker appended alongside the literal word `English` (e.g. `English (Recommended)`), preserving the verbatim-`English` guarantee. Produce **no** review content until the user answers. The English placeholder template below is NOT output verbatim:
```
You're about to review an OpenSpec artifact. Which language should the review be in?
- English (Recommended)
- <endonym of the user's current language, written in that language>
```

**Persistence**: The gate fires once per **review of a given artifact or set of artifacts**. Track the artifact(s) referenced in the most recent review turn (by filename or path). A new turn that references a *different* artifact or set → re-ask the gate. A follow-up turn about the *same* artifact(s) → reuse the previously chosen language, no re-ask. A new `/sai-explore` invocation starts with no tracked target → re-fires on its first non-English review turn. The choice and the tracked target are held in-conversation only; they are never written to a file or config.

**Decline / non-committal / unclear language**: If the user declines or answers non-committally, fall back to the `sai/policies/remember.md` policy (chat output in the user's input language). If the dominant natural language of the turn cannot be determined with reasonable confidence, do **not** ask the gate question; fall back to `remember.md`.

**`Ready to Propose` invariant**: The review language gate never alters the `Ready to Propose` block — neither its content nor its language. The block's prose language is governed solely by the crystallization language gate (item 8), not by this review gate. No artifact file's format or content is altered by the review gate.

**Tracked-change precedence (additive)**: When this artifact-review turn names a change that is in the chat-scoped tracked crystallized set (item 9), produce the requested review exactly as this gate produces it today — same trigger conditions, same language gate, same Persistence rule, same read-only behavior — and THEN emit item 9's plain-text global sí/no review invitation after that review. The rule is **additive, never a reroute**: do NOT convert the review request into the global question in place of the review, because answering `no` to that question is a hard stop on the entire review section and would deny the user the review they explicitly asked for. Answering `no` after the appended invitation ends the review section and leaves the already-produced review untouched; answering `yes` enters item 9's per-change loop over the tracked crystallized set. When the named change is NOT in the tracked crystallized set, this gate behaves exactly as before and no invitation is appended. When the same turn also fires the `review-loop` token, item 9's **Mixed trigger** rule governs instead: the review is served first, then the loop is entered directly and no invitation is emitted.
