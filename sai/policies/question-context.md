<question_context_policy>

# Question Context Policy

## Scope

The content of every user-facing decision prompt: worker `needs_input` questions, the design-only notice `message`, and the fixed instruction gates. The readability rules of `@sai/policies/public-chat.md` apply to them too; picker mechanics belong to `sai/policies/remember.md`.

## The five-element anatomy

Every decision prompt, context and question together, SHALL carry all five elements:

1. **What is being decided**: the decision the user is being asked to make.
2. **Why it matters**: why the decision matters and why the user's input is needed.
3. **Plain-language options**: each option in plain words, including what choosing it means.
4. **Essential state context**: the minimal decision-relevant context (the change name, the artifacts or values at stake, the current state) needed to decide from the prompt alone.
5. **Plain wording**: plain user-facing language, with every artifact name and internal reference explained for a context-switched reader.

An informational message (the design-only notice) carries elements 1, 2, 4, and 5: what is being reported, why it matters, the essential state context, and plain wording. It offers no options.

## Concise format

Every closed-choice prompt splits its content in two, with no exemptions:

1. **Preceding plain text**: everything except the options, self-sufficient, so the user can understand the question and every option without opening the picker.
2. **The picker**: a summary question of about 200 characters at most, and options of about 100 characters each, measured on the rendered text without markup. Anything longer moves to the preceding text.

Identifiers, paths, change names, and fixed literals stay verbatim: wrap them rather than truncate, abbreviate, or translate them, and keep option order and machine values unchanged. Without a native picker, render the same split in plain text: the context, then the summary question, then numbered options.

</question_context_policy>
