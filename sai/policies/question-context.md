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

## Pinned exemptions

The following prompts are registered exemptions to the full anatomy. Each
keeps its own defining contract as the single source of its exact wording,
options, and invalid-input semantics; this list is the centralized registry,
and no consuming surface may add, remove, or reinterpret an exemption here.

1. **Change-picker prompts** — `Use change '{name}'?` and `Which change?`,
   pinned by `sai/policies/change-picker.md`.
2. **Status-picker prompts** — the change-selection prompts pinned by
   `sai/policies/status-picker.md`.
3. **Artifact-feedback-gate texts** — the gate's fixed picker labels and the
   canonical feedback prompt (`Share your feedback on {artifacts} below.`),
   pinned byte-for-byte by `sai/policies/artifact-feedback-gate.md`.
4. **Crystallization-close selector** — sai-explore's `Plan - Unattended` /
   `Direct Build - Unattended` / `Manual` selector, pinned by
   `sai/commands/explore/instructions.md` item 10.
5. **Plain-text sí/no review invitation** — sai-explore's post-crystallization
   global invitation (item 9), a deliberate narrow exception to the
   native-picker presentation rule in `remember.md`.

The full anatomy SHALL apply to every other user-facing decision prompt.

## Single source

This file is the single source of the anatomy. Every consuming surface SHALL reference it as `@sai/policies/question-context.md` and SHALL NOT restate or redefine the anatomy inline.

</question_context_policy>
