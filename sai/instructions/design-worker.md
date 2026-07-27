# Design worker — technical lifecycle adapter

## Invocation envelope

The worker receives exactly two strings:
- `wrapper_echo_value`: the value after the exact opencode line `**Change-name argument and and optional flags:** <value>`, or empty when absent
- `arguments_value`: `$ARGUMENTS` exactly as received from the coordinator

## Changed-file tracking

Maintain an ordered duplicate-free union of every path reported in `changed_files` from each worker result. The union accumulates across notice, needs_input, and terminal payloads within a single worker session and carries forward into reconstruction.

## Universal prerequisites before fast-track parsing

Parse `--fast-track` first. If `--fast-track` is present in the combined `wrapper_echo_value + arguments_value`:
1. Set the in-conversation fast-track signal to active.
2. Remove the token and trim surrounding whitespace from whichever value contained it.
3. If the banner has not been emitted in this session (including via `fast_track_banner_emitted: false` in reconstruction metadata), print `> FAST-TRACK MODE ACTIVE` as a notice.
4. Use the cleaned remainder as the effective request.

Then run universal prerequisite checks via `Fetch @sai/instructions/prereqs.md`. Return `failed` with a summary containing the missing-prerequisite text if any check fails.

## Wrapper-echo precedence

When both `wrapper_echo_value` and `arguments_value` are non-empty, `wrapper_echo_value` takes precedence as the change name. When both are empty, run the change picker. When one is non-empty, use it directly.

## Discrete flag stripping

After precedence resolution, if the resolved change name contains `--fast-track`, strip the token and trim surrounding whitespace. The cleaned value is the effective change name. If this was the first `--fast-track` discovery (not already handled above) and `fast_track_banner_emitted` is false, emit the notice.

## `continue_after_notice`

When the coordinator sends `continue_after_notice` as the continuation message, the worker resumes processing from where it emitted the notice. No user input is required or expected.

## Zero/one/many picker outcomes

- **Zero changes** (`openspec list --json` returns empty `changes`): return `failed` with summary containing "No active changes found. Run /sai-1-spec to create one."
- **One change**: return `needs_input` with question `Use change '{name}'?` and options `[{label: "yes", value: "yes"}, {label: "no", value: "no"}]`. On "yes", resolve the change. On "no", return `cancelled`.
- **Multiple changes**: return `needs_input` with question `Which change?` and one option per change name in CLI order. For invalid input, re-request the same without retry cap.

## Source artifact checks

Verify `openspec/changes/{name}/proposal.md` exists AND at least one file matching `openspec/changes/{name}/specs/**/*.md` exists. If either is missing, return `failed` with summary: "Change '{name}' not found or has no specs. Run /sai-1-spec to create it first."

## Approval/amendment handling

If fast-track is active, skip the approval ask and proceed. Otherwise ask: "Have you reviewed the specs in openspec/changes/{name}/specs/ and are ready to approve them for design? (yes/no, and any notes)" as a closed-choice prompt with `yes (Recommended)` first then `no`. On "no", return `cancelled`. On "yes", write `approval.specs.approved_at` (ISO 8601 UTC) and `approval.specs.notes` to `.openspec.yaml`, merging into existing content. Handle spec-problem amendments per the spec-problem handling in design.md.

## Invocation-core fetch

Fetch @sai/instructions/design-invocation-core.md and follow it exactly. This loads budget behaviors, glossary-format, sai-learnings-format, design.md, and remember.md.

## Mandatory budget-explorer source delegation

DELEGATE all codebase discovery and deep reading to a budget-explorer subagent. The main agent must NOT run glob, grep, Read, or any file operation on source code. Launch ONE budget-explorer with the exact prompt specified in design.md's Codebase Research section. Act exclusively on the subagent's output.

## Open Questions

After writing design.md, delegate each Open Question to a budget-explorer subagent. If answerable from the codebase, incorporate and remove. If not, present to the user. Do not proceed to tasks.md until all Open Questions are resolved.

## Direct writes and disk verification for all three artifacts

Write `design.md`, `tasks.md`, and `interfaces.md` directly to `openspec/changes/{name}/`. After writing all three, verify each exists on disk and is non-empty. If any is missing or empty, return `failed` with a blocking summary.

## Worker-owned feedback

When the coordinator sends `pending_feedback` as the continuation message, parse it as free-form feedback and apply it per the artifact-feedback-gate processing rules: split into items, evaluate each independently, edit legitimate items in the relevant artifacts in place, and report every discard. Return the updated artifacts and a discard report. Do NOT re-present the feedack gate — that is the coordinator's responsibility.

## Design-only reconstruction metadata

When the coordinator sends a reconstruction instruction, reconstruct using:
- `opaque_input_history`: replay each entry to skip already-resolved questions
- `pending_feedback`: if present, re-apply to reconstructed artifacts
- `fast_track_banner_emitted`: skip initial banner emission if true
- `resolved_change_name`: use directly when present
- Original `wrapper_echo_value` and `arguments_value` for the envelope

## `resolved_change_name`

Every payload after change resolution includes `resolved_change_name`. Pre-resolution payloads omit it.

## Metadata-only notice/terminal output

A notice payload contains `event: "notice"`, `message`, and `changed_files`. The worker emits it for intermediate status (e.g., fast-track banner, progress milestones) and then waits for `continue_after_notice`. A terminal payload (completed/failed/cancelled) contains `summary` and `changed_files`, and optionally `resolved_change_name` for completed.

## Implementation-worker fallback

The implementation-worker fallback (Continue-now routing to the implementation coordinator) is explicitly outside this worker's scope. The coordinator handles the handoff at the lifecycle boundary per ADR 0080.
