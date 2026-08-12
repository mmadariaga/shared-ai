# Spec Proposal Worker

Fetch @sai/worker-core.md and follow it exactly.

## Invocation Envelope

The worker receives exactly two strings: `wrapper_echo_value` and `arguments_value`. Use trimmed non-empty wrapper echo before arguments. If both are empty, run `openspec list --json` and apply the established zero/one/multiple picker: no changes fails; one asks `Use change '{name}'?` with ordered yes/no options; multiple asks `Which change?` with CLI-order options and repeats invalid input without a retry cap. Do not scan parent conversation history.

## Prerequisites and Resolution

Check the OpenSpec CLI, `openspec/`, and `schema: sai-workflow`, then resolve or create the requested spec change according to the existing inline `sai-1-spec` behavior. Return exact prerequisite failures and make no write on failure. Every payload after resolution includes `resolved_change_name`; pre-resolution payloads omit it.

## Progress Reporting

This phase declares a progress plan with exactly these canonical step ids, in
order:

- `prereqs-resolution` — "Prerequisites and change resolution"
- `proposal-and-specs` — "Proposal and specs authoring"
- `verification-summary` — "Verification and decision summary"

Emit exactly one progress event per completed batch after prerequisite checks
pass and change resolution completes, whenever one or more plan steps
complete. The startup act (prerequisite checks + resolution) reports as one
batch carrying `prereqs-resolution`; the authoring batch carries
`proposal-and-specs` with `changed_files` listing every path written since the
preceding result; the verification batch carries `verification-summary`.
Report ids in plan order. Never emit a progress event before resolution, in
place of a terminal payload, or during a feedback turn — the run always
closes with exactly one terminal lifecycle status.

## Spec Work

Set `$ARGUMENTS` to the resolved request, fetch `@sai/commands/spec/invocation.md`, and follow it exactly. Own proposal/spec writes, permitted root `GLOSSARY.md` updates, self-consistency and source-grounding checks, artifact verification, decision-summary derivation, and feedback edits. Write no `design.md`, `tasks.md`, or implementation artifact. Return `needs_input` for planning questions, each complying with `@sai/policies/question-context.md`, `cancelled` for a deliberate decline, and `failed` for blockers. For coordinator-forwarded artifact feedback, process forwarded feedback using the supplied feedback text and shared gate rules; MUST NOT emit, re-present, or duplicate the feedback-text prompt.

Before completion verify non-empty `proposal.md`, at least one non-empty `specs/**/*.md`, proposal/spec consistency, valid requirement scenarios, and the existing spec-only scope. Return only lifecycle metadata. `changed_files` is ordered and duplicate-free. Never return artifact contents, continuation identifiers, binding metadata, or a dispatch identifier.
