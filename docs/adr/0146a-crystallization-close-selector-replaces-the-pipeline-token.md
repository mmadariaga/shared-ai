# ADR 0146a: A two-option crystallization-close selector replaces the literal `start-pipeline` token

## Status

Accepted

## Context

Supervised `sai-1` + `sai-2` execution from `sai-explore` was reachable only through the literal token `start-pipeline`, recognized by the same bare-token/dominant-intent matcher as `review-loop`. The crystallization turn closed in prose that merely named the token, and the contract explicitly forbade offering it through a picker (`sai/commands/explore/instructions.md` item 10). The delegated-execution path was therefore discoverable only to users who already knew the token existed, even though the moment the user has just produced a `Ready to Propose` block is exactly the moment the choice is live.

Two prior decisions pull the other way and had to be re-opened rather than worked around: item 9 removed the auto-fired post-block review picker (ddr:0053, 0058), and item 10 pinned "never presented through a picker" for the pipeline token.

## Decision

Retire the `start-pipeline` token and make a two-option native picker — **Auto** / **Manual** — the sole entry to supervised execution.

- The selector is emitted as the closing step of every crystallization emission (items 5, 6, and 7), after the final `Ready to Propose` block and after the keep-window-open recommendation. That recommendation is kept and still names `review-loop`; it names no pipeline token.
- **Auto** delegates supervised `sai-1` + `sai-2` execution to the current session, reusing the item-10 supervision machinery unchanged. Selecting it is the explicit user act that authorizes item 1's delegated-write exception; it is consent to selection and dispatch only.
- **Manual** exits the pipeline path, dispatches nothing, and changes no state. It is **not** terminal: the selector is re-emitted on request with no cap. A free-text answer mapping to neither option is treated as Manual.
- The selector's dispatch source narrows from the chat-scoped `tracked_changes` to `last_crystallization_set` — the names emitted by the **most recent** crystallization turn. `tracked_changes` stays as the review loop's source. Earlier crystallizations are assumed applied or discarded and remain reachable only by running `/sai-1-spec` by hand.
- `--fast-track` auto-selects nothing. The selector is the one gate to delegated writes that fast-track never skips.
- The selector is presented through the native picker per `sai/policies/remember.md` L10–15 (`AskUserQuestion` on Claude Code, `question` on opencode); two options fit inside Claude Code's declared capacity of 4, so L13's plain-text fallback is accepted as written and no pagination or question splitting is invented.
- Item 9's post-block picker prohibition is replaced by a delimiting sentence: the Auto/Manual selector is a choice over delegated execution only, is not the removed review picker, and the review loop stays picker-free at crystallization.

## Alternatives Considered

- **Keep the token live and add the selector as a second entry path** — rejected as redundant surface: two entry paths to one machine, when the selector covers the moment the token was meant for.
- **Have `--fast-track` auto-select Auto** — rejected because it would turn a "skip the language questions" flag into "start workers that write files" without an explicit act.
- **Empty the `explore-pipeline-token` capability in place** — rejected: the capability name would no longer describe its contents, so the capability is retired in favour of `explore-pipeline-selector`.

## Consequences

- The delegated-execution path becomes discoverable at the moment it is relevant, without weakening the rule that delegated writes require an explicit user act.
- Two deliberate prior decisions are reversed explicitly rather than silently: item 9's removal of the post-block picker (ddr:0053, 0058) and item 10's "never presented through a picker". Both sites are rewritten, so the prompt does not contradict itself.
- The `Ready to Propose` block still says *Open a new chat and run `/sai-1-spec`* while **Auto** executes in the current chat. This tension already existed with `start-pipeline` and is deliberately left unaddressed here.
- No token form is recognized any more, so a user who typed `start-pipeline` out of habit gets no dispatch; the selector re-emission path is the recovery.

## Provenance

Derived decision recorded in the `explore-crystallization-pipeline-selector` crystallization block, decisions 1–5 and implementation details I1–I13.
