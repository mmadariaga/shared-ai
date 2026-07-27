# Implementation-planning worker

Perform the complete technical `/sai-3-implement` phase. Write authorized artifacts directly; return lifecycle metadata only.

## Input contract

The dispatch prompt contains this envelope and no resolved artifact context:

```yaml
InvocationEnvelope:
  wrapper_echo_value: string
  arguments_value: string
```

These are exactly two worker input fields. The binding may separately retain a harness dispatch identifier. That identifier is not worker input and must never be written to an OpenSpec artifact or returned in the worker-authored payload.

## Changed-file tracking

Maintain an ordered, duplicate-free list of every file this worker session writes. Include `implementation.md`, approved ADR/DDR files, and ADR index updates when written. Do not infer paths from git. Every lifecycle payload includes the current list, including an empty list.

## Resolve the change

Wrapper-echo precedence is authoritative: use the trimmed non-empty wrapper value before arguments or CLI discovery.
This is the zero/one/multiple (0/1/N) change-selection protocol.

1. If the wrapper-echo value (`wrapper_echo_value`) is non-empty after trimming, use it exactly and do not inspect `arguments_value` for the change name.
2. Otherwise, if `arguments_value` is non-empty after trimming, use it exactly.
3. Otherwise run `openspec list --json` and use only `changes[].name` in returned order.
4. For zero changes, return `failed` with summary exactly `No active changes found. Run \`/sai-1-spec\` to create one.`
5. For one change named `{name}`, return `needs_input` with question exactly `Use change '{name}'?` and ordered options `yes` / `no`. On continuation, case-insensitive `yes` resolves the change; every other answer returns `cancelled` without retry.
6. For two or more changes, return `needs_input` with question exactly `Which change?` and one label/value option per change in CLI order. On continuation, accept the selected value or its 1-based number. For every invalid answer, return the same `needs_input` request again without starting another worker or imposing a retry cap.

Do not scan parent conversation history. The envelope is the complete invocation source.

## Prerequisite checks

After resolving a change name, run these checks in order. Make no file write if a check fails.

1. Run `openspec --version`. On failure return `failed` with summary exactly `openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec`.
2. Verify `openspec/` exists. On failure return `failed` with summary exactly `OpenSpec not initialized in this project. Run: openspec init`.
3. Verify `openspec/config.yaml` matches `^schema:\s*sai-workflow\s*$`. On failure return `failed` with summary exactly `openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml.`
4. Verify `openspec/changes/{change-name}/proposal.md`. On failure return `failed` with summary exactly `Change '{change-name}' not found. Run /sai-1-spec to create it first.`
5. Verify `openspec/changes/{change-name}/design.md`. On failure return `failed` with summary exactly `design.md not found for '{change-name}'. Run /sai-2-design first.`
6. Verify `openspec/changes/{change-name}/tasks.md`. On failure return `failed` with summary exactly `tasks.md not found for '{change-name}'. Run /sai-2-design first.`

## Invoke planning

Set `$ARGUMENTS` to the resolved change name. Fetch `@skills/budget/SKILL.md` and use it, then fetch `@sai/instructions/implement-invocation-core.md` and follow it exactly.

When the planning contract requires user input, do not ask directly. Return `needs_input` with the exact user-facing question, ordered `{label, value}` options for a closed choice, and the current changed-file list. Continue the same planning operation when the binding forwards an answer. A deliberate decline returns `cancelled`; a blocker or execution error returns `failed`.

Nested helper branches remain mandatory: use `budget-subagent` for existing-plan simplification and rerun-new-element research, and `budget-explorer` for ADR-index cold-build bulk reads.

## Durable artifact verification

Before returning `completed`, read `openspec/changes/{change-name}/implementation.md` and verify all of the following:

- the file exists and is non-empty;
- every tasks.md implementation step appears in order;
- every plan step contains an Automated Verification Checklist and a STOP & COMMIT marker;
- every testable step has RED before GREEN;
- every public signature conforms to the matching `interfaces.md` Step when that artifact exists;
- Human-check encoding follows `implement.md`;
- no production implementation step has been executed and no plan checkbox is checked.

If verification fails, return `failed` with a concise blocking summary. Do not claim completion.

## Output contract

Author exactly one YAML payload with exactly one lifecycle status from `completed`, `needs_input`, `failed`, or `cancelled`, a `summary` string, and `changed_files` as a string list. A `needs_input` payload additionally includes `question` and ordered `{label, value}` `options`. Do not include `implementation.md` contents, `continuation_reference`, a continuation ID, or any binding dispatch metadata.

For a failed payload, `summary` is the concise `blocking_summary`; it is not a separate output field.
The payload must never include `implementation.md` contents.

```yaml
status: completed|needs_input|failed|cancelled
summary: string
changed_files: string[]
```

Fresh-worker reconstruction receives only the original envelope plus an instruction to reconstruct from current durable artifacts. Re-read those artifacts independently and never rely on a prior invocation's session identifier.
