<question_context_policy>

# Question Context Policy

Canonical policy for user-facing decision prompts in the shared-ai pipeline. Broader public-chat readability and context rules are single-sourced in `@sai/policies/public-chat.md`; this policy specializes those rules for decision prompts. Consumed by reference; never restated at a consuming surface.

## Scope

Governs the content of every user-facing decision prompt authored by the pipeline: worker `needs_input` questions, the design-only notice `message`, and the fixed instruction gates. The public-chat communication rules for these prompts are defined by `@sai/policies/public-chat.md` and are not duplicated here. It does not govern option-picker presentation mechanics, which stay owned by `sai/policies/remember.md`.

## The five-element anatomy

Every user-facing decision prompt SHALL carry all five elements:

1. **What is being decided** — the prompt SHALL name the decision the user is being asked to make.
2. **Why it matters** — the prompt SHALL state why the decision matters and why the user's input is needed.
3. **Plain-language options** — the prompt SHALL state each option in plain words, including what choosing it means.
4. **Essential state context** — the prompt SHALL carry the minimal decision-relevant context (for example the change name, the artifacts or values at stake, and the current state) needed to decide from the prompt alone.
5. **Plain wording** — the prompt SHALL use plain user-facing language; it SHALL NOT rely on bare jargon, unexplained artifact names, or internal references that a context-switched reader cannot resolve.

## Informational-notice subset

An informational message (the design-only notice) SHALL carry: what is being reported, why it matters, the essential state context, and plain wording. The options element SHALL NOT be required, because a notice is informational, not a decision prompt.

## Concise-format rule (picker brevity)

Every closed-choice prompt SHALL split decision context from the picker call:

- **Mandatory split**: everything except options goes to preceding plain text; the question tool holds only the ultra-synthesized summary question plus options.
- **Emission order**: full context renders as ordinary chat immediately before the `needs_input` / question tool call, with no body duplication between surfaces except the summary.
- **Operational limits**: as an operational SHOULD on rendered text without markup, the summary question stays ≤ ~200 chars and each option stays ≤ ~100 chars; excess moves to plain text.
- **Self-sufficient plain text**: preceding plain text gives all necessary context to understand the question and options with no inference from the tool.
- **Universal with no exemptions**: this rule applies to every user-facing decision prompt, including long or pinned prompts, which are rewritten to comply in the same change; no grace period, no exemption registry.
- **Literals intact**: identifiers, paths, kebab change names, and literals stay verbatim with visual wrap allowed; limits never justify truncation, abbreviation, or translation; option order and machine values stay unchanged.
- **No-picker fallback**: without a picker, render the same split in plain text — context, then summary question, then numbered options — with identical semantics.
- No deterministic validator in this change: compliance is verified by manual review; lint is future work, out of scope.

The full anatomy plus this concise-format rule SHALL apply to every user-facing decision prompt.

## Single source

This file is the single source of the anatomy and the concise-format rule. Every consuming surface SHALL reference it as `@sai/policies/question-context.md` and SHALL NOT restate or redefine either inline.

</question_context_policy>
