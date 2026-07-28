# Inline Coordinator Adapter

Shared caller lifecycle for the Copilot inline design and implementation paths.

## Invocation envelope

The caller supplies exactly these two lines:

    phase: sai-2-design
    arguments: $ARGUMENTS

The only supported phase values are `sai-2-design` and `sai-3-implement`. The
implementation caller replaces only the phase value. Treat all text after
`arguments:` as the forwarded request without normalization or invented
defaults. A missing `arguments:` line or an empty value becomes an empty
request.

If the phase line is missing, malformed, or unsupported, STOP and print:
`Invalid inline phase. Expected phase: sai-2-design or phase: sai-3-implement.`
Reject it before running prerequisites, selection, or either phase core.

Set `$ARGUMENTS` to the forwarded request, then execute exactly one matching
branch below in the current context. The adapter MUST NOT introduce routed worker identifiers, worker continuation state, or `subagent_depth`.

## Design branch: phase: sai-2-design

1. Fetch @sai/policies/prereqs.md and perform its checks.
2. Inspect `$ARGUMENTS` for the positional token `--fast-track`.
   - When present, activate the in-conversation fast-track signal, remove the
     token, trim surrounding whitespace, and print exactly
     `> FAST-TRACK MODE ACTIVE` once.
   - When absent, leave the signal inactive and preserve `$ARGUMENTS` verbatim.
3. Fetch @skills/budget/SKILL.md and use it.
4. Fetch @sai/policies/change-picker.md and follow it exactly. If the resolved
   value still contains `--fast-track`, remove the token and trim whitespace.
5. Fetch @sai/compat/sai-2-design-core.md and follow it exactly using the
   resolved change name as `$ARGUMENTS`.
6. Derive the existing design decision summary only from the written
   `design.md` and `tasks.md`: one line per `### D<n>` decision, one line per
   risk, and resolved Open Questions only when present. Keep the summary at or
   below 15 non-blank lines and use the existing `+N more` signal when needed.
7. Fetch @sai/policies/artifact-feedback-gate.md and follow it exactly with:
   artifacts = `design.md`, `tasks.md`, `interfaces.md`; proceed-label =
   `Continue`; next-action = the implementation navigation below.
8. After `Continue`, present these choices:
   - `Stop for a new chat (Recommended)`
   - `Continue now in this chat`
9. On Stop, print exactly:
   `Design done in openspec/changes/{name}/. Run \`/sai-3-implement {name}\` **in a new chat** when ready.`
   Then STOP.
10. On Continue now, re-read `design.md`, `tasks.md`, and `interfaces.md`, clear
    the design lifecycle state, and enter this adapter's implementation branch
    in the same context with:

        phase: sai-3-implement
        arguments: {name}

## Implementation branch: phase: sai-3-implement

1. Fetch @sai/policies/change-picker.md and follow it exactly.
2. Fetch @sai/policies/prereqs.md and perform its checks.
3. Verify the resolved change's planning artifacts in this exact order and STOP
   on the first missing artifact without checking later artifacts or writing any
   file:
   - Missing `proposal.md`: print exactly
     `Change '{change-name}' not found. Run /sai-1-spec to create it first.`
   - Missing `design.md`: print exactly
     `design.md not found for '{change-name}'. Run /sai-2-design first.`
   - Missing `tasks.md`: print exactly
     `tasks.md not found for '{change-name}'. Run /sai-2-design first.`
4. Fetch @skills/budget/SKILL.md and use it.
5. Fetch @sai/compat/sai-3-implementation-core.md and follow it exactly using
   the resolved change name as `$ARGUMENTS`.
6. MANDATORY STOP: once
   `openspec/changes/{name}/implementation.md` is written, do not execute plan
   steps, run verification, mark checkboxes, or enter `/sai-4-apply`. Print
   exactly:
   `Implementation plan done in openspec/changes/{name}/. Review and run \`/sai-4-apply {name}\` (--fast-track) **in a new chat** when ready.`
   Then STOP.
