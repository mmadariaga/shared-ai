# DDR 0164: A committed project setting is a read-only source for the overview-language gate

<!-- ddr-index: amends 0123c -->

## Status

Accepted

## Context

DDR 0123c keeps the overview language invocation-scoped: the selection made in one invocation is never persisted, so an unflagged run never inherits another run's choice. Since then, `.sai/settings.jsonc` has become the committed, per-project home for answers to questions a command asks every run. The overview-language question at Plan (unattended) activation and the Ready to Propose language question are project conventions in many repositories, yet every activation asks them.

A setting is not a persisted selection. A person edits it by hand and commits it, and every run of the project reads it the same way.

## Decision

- The `explore.overviewLanguage` project setting is one more source that answers gate 9 at Plan (unattended) activation. The gate only reads it; nothing writes it from a selection.
- A selection made in one invocation stays invocation-scoped and unpersisted, exactly as 0123c states.
- Precedence at gate 9: an explicit `--overview-lang` or direct user statement, then a value already resolved for the same crystallized set, then the setting, then the fast-track value `None`, then the normal question.
- `.openspec.yaml`, the normative artifacts, and the `**Overview language**` block field stay unchanged; the field shows only the `--overview-lang` value or `None`.

This amends 0123c's rule that the overview language is never persisted: a committed project setting is now a read-only input. The rest of 0123c, including the exclusion of change metadata and artifacts, is unchanged.

## Alternatives Considered

- Supersede 0123c: loses the distinction between an invocation selection and a project convention, which still holds.
- Leave gate 9 without a setting: every Plan (unattended) activation keeps asking a question the project already answered.
- Let fast-track win over the setting: a configured project would get no overview exactly when it moves fastest.

## Consequences

- Gate 9 makes one settings lookup before it asks.
- A project can commit its overview language, and an unflagged run in a project without the setting behaves as before.
- Each localized generation still receives its language through the invocation, so the isolated-chat transport in 0123c is unchanged.

## Provenance

Derived — the project-settings slices chose a read-only committed source over a persisted selection, preserving 0123c's reason.
