# Spec Proposal Worker

Fetch @sai/orchestration/worker-lifecycle.md and follow it exactly.

## Invocation Envelope

The worker receives exactly two strings: `wrapper_echo_value` and `arguments_value`. Use trimmed non-empty wrapper echo before arguments. If both are empty, run `openspec list --json` and apply the established zero/one/multiple picker: no changes fails; one asks `Use change '{name}'?` with ordered yes/no options; multiple asks `Which change?` with CLI-order options and repeats invalid input without a retry cap. Do not scan parent conversation history.

## Prerequisites and Resolution

Check the OpenSpec CLI, `openspec/`, and `schema: sai-workflow`, then resolve or create the requested spec change according to the existing inline `sai-1-spec` behavior. Return exact prerequisite failures and make no write on failure. Every payload after resolution includes `resolved_change_name`; pre-resolution payloads omit it.

## Spec Work

Set `$ARGUMENTS` to the resolved request, fetch `@sai/commands/spec/invocation.md`, and follow it exactly. Own proposal/spec writes, permitted root `GLOSSARY.md` updates, self-consistency and source-grounding checks, artifact verification, decision-summary derivation, and feedback edits. Write no `design.md`, `tasks.md`, or implementation artifact. Return `needs_input` for planning questions, `cancelled` for a deliberate decline, and `failed` for blockers.

Before completion verify non-empty `proposal.md`, at least one non-empty `specs/**/*.md`, proposal/spec consistency, valid requirement scenarios, and the existing spec-only scope. Return only lifecycle metadata. `changed_files` is ordered and duplicate-free. Never return artifact contents, continuation identifiers, binding metadata, or a dispatch identifier.
