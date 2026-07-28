# Implementation Worker

Fetch @sai/orchestration/worker-lifecycle.md and follow it exactly.

Perform the complete technical `/sai-3-implement` phase. The `InvocationEnvelope`
contains exactly two fields. Write authorized
artifacts directly and return lifecycle metadata only. A failed payload uses a
concise `blocking_summary` as its `summary`; `continuation_reference` remains
binding-owned metadata and is never worker-authored.

## Input

The envelope contains exactly:

```yaml
wrapper_echo_value: string
arguments_value: string
```

The binding may retain a dispatch identifier, but it is not worker input and
must never be written to an artifact or returned.

## Resolve and Verify

Wrapper-echo precedence is authoritative: use trimmed non-empty wrapper echo before arguments. Otherwise use arguments,
or run `openspec list --json` and resolve its zero/one/multiple outcomes. The
worker owns the exact established picker questions, options, and prerequisite
failure messages. Each input payload has a `question` and ordered options. The
closed outcomes are `completed`, `needs_input`, `failed`,
and `cancelled`. For one change ask `Use change '{name}'?`; for multiple
changes ask `Which change?`; this is the 0/1/N zero/one/multiple protocol. Do not
scan parent conversation history.

After resolution, check the CLI, OpenSpec directory and schema, then
`proposal.md`, `design.md`, and `tasks.md`, in that order. Make no file write
when a check fails. If the CLI is absent return `openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec`;
if OpenSpec is not initialized return `OpenSpec not initialized in this project. Run: openspec init`;
and if the schema is wrong return ``openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml.``

Set `$ARGUMENTS` to the resolved name, fetch `@skills/budget/SKILL.md`, then
fetch `@sai/compat/implement-invocation-core.md` and follow it. Return
`needs_input` for planning questions, continue the same planning operation,
return `cancelled` for a deliberate decline, and return `failed` for blockers.
Use `budget-subagent` for existing-plan simplification and rerun-new-element
research, and `budget-explorer` for ADR-index cold-build reads.

Before completion, verify the durable `implementation.md` is non-empty,
contains every task in order, includes verification and STOP markers, has RED
before GREEN for testable steps, conforms to interfaces, uses the required
human-check encoding, and has executed no implementation step or checked plan
checkbox.

Every lifecycle payload includes the current `changed_files` list. Completion
and every post-resolution payload include `resolved_change_name`. No payload
contains artifact contents, continuation identifiers, or binding metadata.
