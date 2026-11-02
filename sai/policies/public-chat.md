<public_chat_policy>

# Public Chat Policy

## Scope

Explanatory text a user reads in the conversation: coordinator and utility-command text, and the `question`, `message`, and `summary` fields a worker returns for a coordinator to present. The author of the text applies this policy, including when authoring worker fields; the presenting coordinator forwards those fields unchanged. Reasoning, worker session text, payloads, code, paths, panel labels, and persistent artifacts are outside it.

## Message prefix

In Claude Code and opencode, the author starts every user-facing explanatory message with exactly `➡️` followed by one space, regardless of language. This covers progress updates, questions, and summaries, not only messages that require a reply.

Use one leading marker per message, not per paragraph or forwarded passage. The author adds it at the source, including in user-facing `question`, `message`, and `summary` string values; the presenting agent forwards that text unchanged without adding a second marker.

The prefix marks the message, not its internal content. Keep it out of code, documents, structured data outside those user-facing string values, picker options, and internal agent communications. Existing exact-text exceptions prevail: when a contract prohibits prefixes or requires an exact first line, preserve that message as required without prepending the marker. Keep the byte-for-byte protections in Protocol preservation below.

## Write for a context-switched reader

The reader has just switched back to this chat and remembers none of it. Every explanatory message:

1. **Carries its context**: names the command, change, artifact, state, or requested action whenever the reader's next step depends on it.
2. **Says it plainly**: in controlled plain language, with specialized terms defined first (both below).
3. **States its purpose**: what happened, what is being reported, and what the user needs to do, each told apart.

Stay proportionate: enough context for a reader joining midstream, without repeating large technical payloads or unrelated history.

## Terminology

When a message introduces any specialized, internal, or potentially ambiguous term, put a visible **Terminology** section before the main explanation. Give each such term one short definition in plain language before its first meaningful use in that explanation. This includes terms such as gate numbers, lifecycle statuses, artifact names, and routing names. Use each defined term consistently, never a synonym for it. A message with no specialized, internal, or potentially ambiguous terms may omit the Terminology section.

This section explains prose; it does not rename, rewrite, or replace required technical text. If a required literal must appear before the section, preserve it exactly and define the relevant term before relying on it in the main explanation.

## Controlled plain language

Write explanatory prose in the style of ASD-STE100 (Simplified Technical English), taken as a profile rather than formal compliance: familiar, precise words; short, direct sentences with one main idea each; active voice with a clear actor and action; concrete next steps; abbreviations only when necessary; and each word keeping one meaning within a message.

Write the explanation in the user's language. Adapt these clarity rules to that language rather than imposing English vocabulary or literal ASD-STE100 rules; keep required technical literals unchanged.

## Protocol preservation

This policy adapts explanatory prose only. Keep byte-for-byte:

- fixed messages and literals, STOP messages, required notices, and text the user asked to keep verbatim;
- technical formats, machine-readable content, lifecycle statuses, payload fields, identifiers, and tokens;
- picker options, option values and their order, panel labels, and other harness-owned labels;
- code, paths, technical payloads, and persistent artifacts.

When a message mixes prose with a required fragment, adapt only the prose around it. Where exact protocol wording and this policy conflict, the protocol wording wins.

This policy governs wording only. Each command's own contract sets its write scope, including Explore's read-only rule.

</public_chat_policy>
