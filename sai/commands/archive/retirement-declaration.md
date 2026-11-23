# Capability Retirement Declaration

Fetch `@sai/policies/command-execution.md` and follow it for command execution.

A **capability-emptying delta** is a delta spec whose `## REMOVED Requirements`
names every requirement currently published in
`openspec/specs/<capability>/spec.md`, with no `## ADDED Requirements` for that
same capability. It does not block the archive: archive declares the
retirement, and the `openspec archive` CLI performs it. The CLI is the only
component that deletes anything under `openspec/specs/**`.

Declaring means writing the single key `retire_capabilities: true` into
`openspec/changes/<name>/.openspec.yaml` immediately before
`openspec archive <name> --yes --json`. The key belongs to the change, not to a
capability: one key covers every capability the change empties, and the CLI
deletes only specs left with no requirements. The file moves with the change
into `openspec/changes/archive/YYYY-MM-DD-<name>/`, where the key stays as the
record of the retirement's intent.

The retirement adds no question, gate, or per-route branch. The human decision
is the delta the author wrote; archive carries it out identically on the
ordinary route, under `--fast-track`, and on the Direct Build (unattended)
route.

## Detection and preconditions

`sai/tools/archive-plan.js` is their single source. It detects the emptied
capabilities from the delta and the published spec (`openspec validate` checks
delta well-formedness or the published spec, never this shape) and checks the
preconditions read-only. Its plan carries `retired_capabilities` and
`retirement.declaration`: `write` when the key is absent, `present` when it
already reads `true`, `none` without a capability-emptying delta.

Each blocking condition is a **declaration refusal**: write nothing, run no CLI
archive, and report the condition with its way forward (the plan is refused with
a `reason` and the way forward in its `summary`). A refusal is a stop, never a
question, on every route. The conditions are:

- **Author veto** (`retire-veto`) — `retire_capabilities` is present with the
  parsed value `false`. Running the CLI anyway fails with
  `archive_spec_validation_failed` on every rerun, because the CLI cannot tell
  `false` from an absent key.
- **Unhonoured value** (`retire-unhonoured`) — `retire_capabilities` is present
  with a parsed value that is not a boolean (a string such as `"yes"`, `null`, a
  number). Archive never guesses which boolean it meant and never overwrites it.
- **Unaccounted content** (`retire-unaccounted-content`) — an emptied
  capability's published spec has a `##` section other than `## Purpose` and
  `## Requirements`, above or below the requirements.
- **Metadata** (`retire-metadata`) — `openspec/changes/<name>/.openspec.yaml` is
  missing or has no `schema:` key. Archive never creates `.openspec.yaml` and
  never authors `schema:`.
- **All or nothing** — when any emptied capability is blocked, the whole
  declaration is refused; no subset is retired.

A `.openspec.yaml` the tool cannot read at all is refused first, with a read
reason (`metadata-unreadable`), whatever the delta holds.

## Write

Whoever runs the CLI archive writes the declaration: the coordinator on the
ordinary route, the archive worker in the Direct Build execute continuation.
Use the active supported shell and command-execution tool under
`@sai/policies/command-execution.md`; do not require Bash. With no
capability-emptying delta, `.openspec.yaml` is not touched.

1. Compute the plan again. A refusal ends the run before any write.
2. Act on the plan's `retirement.declaration`, never on the line's text: `present`
   means a parsed `true` is already a declaration, so skip the write; `false`
   and non-booleans were refused. The write therefore only inserts an absent
   key.
3. Insert `retire_capabilities: true` once, as a replace-in-place edit: never a
   second entry (a duplicate key makes the file invalid YAML for every CLI
   surface), every other key and the formatting preserved, no other key and no
   approval key written.
4. Re-parse the file. When it no longer parses or the key does not read back as
   boolean `true`, stop without the CLI archive and say that archive itself
   broke a file that parsed before. The write is not reverted; the file must be
   restored before a rerun, with
   `git checkout HEAD -- openspec/changes/<name>/.openspec.yaml` when tracked or
   by hand otherwise. Until then `openspec status` cannot read the change. The
   worker reports that command as the user's remedy and runs no git in this
   step.
5. Add the file to the changed-files union.

When the CLI archive then fails, the written key stays in place.

## Disclosure

Whenever one or more capabilities are retired, the archive output names every
retired capability id, identically on every route. On the ordinary route this
line comes before the CLI archive runs; by the time the post-archive commit
gate is reached the spec is already deleted on disk, so declining the commit
leaves the deletion uncommitted rather than undoing it. The line is report
text only: no options, no answer, no block. A run that retires nothing emits no
such line.

When a commit is created after a retirement, its message **body** names every
retired capability id, one per line; the subject stays exactly what the
commit-message rules derive. No commit means no line, and an amend with
`--no-edit` authors no message.

## Out of scope

Archive does not check cross-capability references to a retired capability.
`/sai-retire-docs` and `openspec/specs/_archived/` keep their own ownership:
they retire material with no change behind it.
