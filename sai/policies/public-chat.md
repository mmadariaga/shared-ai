<public_chat_policy>

# Public Chat Policy

Canonical policy for explanatory text visible in the user's conversation. Consumed by reference; never restated at a consuming surface.

## Scope

This policy governs visible explanatory chat text authored by any SAI surface, including coordinator text, utility-command text, and worker-authored `question`, `message`, and `summary` fields that a coordinator presents to the user. A worker does not chat with the user directly; its returned payload is the channel through which its user-facing text is presented.

The policy applies to the text a context-switched reader can see in the conversation. It does not govern internal reasoning, technical payloads, machine-readable content, panel labels, code, or persistent artifacts.

## Communication rules

Every covered explanatory message SHALL:

1. **Use plain wording** — prefer simple, direct language and short sentences. Do not make the reader decode internal jargon when a common term will do.
2. **Context carry-over** — include the nearby context needed to understand the message without relying on earlier conversation. Name the current command, change, artifact, state, or requested action when it is relevant to the reader's decision or next step.
3. **Explain non-obvious references** — briefly explain an internal term, reference, or gate the first time it matters, using a short parenthetical where that is clearest. Do not assume that a reader knows internal gate numbers, lifecycle statuses, artifact names, or routing terms.
4. **Make the purpose clear** — distinguish what happened, what is being reported, and what the user needs to do, without adding context that changes the contract.

The explanation SHALL be concise and proportionate: add enough context for a reader joining midstream, but do not repeat large technical payloads or unrelated history.

## Cross-surface coverage

- **Coordinators** apply these rules to explanatory notices, summaries, gate introductions, and other text they author for the user.
- **Utility commands** apply these rules to their user-facing explanatory text even when the visible response is produced by a utility command body or another component.
- **Workers** apply these rules to the user-facing `question`, `message`, and `summary` fields they author in returned payloads. Worker reasoning and session text are not public chat. Coordinators present these fields verbatim and SHALL NOT rephrase, enrich, or restructure them.

Compliance is required at the surface that authors the visible explanatory text. A command is covered when another component generates its visible text; the generating author follows this policy, and the presenting surface preserves the result.

## Protocol preservation

This policy changes explanatory wording only. It SHALL NOT alter:

- fixed messages, fixed literals, STOP messages, required notices, or text the user explicitly asks to keep verbatim;
- technical formats, machine-readable content, lifecycle statuses, payload structures or fields, identifiers, or tokens;
- picker options, option values, ordering, panel labels, or other harness-owned presentation labels;
- code, technical payloads, or persistent artifacts.

When a message mixes explanatory prose with a required fragment, adapt only the explanatory prose and keep the required fragment unchanged. Exact protocol wording and this policy's communication guidance are resolved in favor of the exact protocol wording where they conflict.

## Single source and loading

This file is the single source for public-chat readability and context rules. The shared `sai/orchestration/command-runner.md` and `sai/orchestration/worker-core.md` contracts load it so coordinator, utility-command, and worker-authored chat text receive the same rules across Claude Code and opencode. Consuming command cards and worker-specific contracts SHALL reference the shared loading rather than copy these rules.

</public_chat_policy>
