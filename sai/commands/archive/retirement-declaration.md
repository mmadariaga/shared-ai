# Capability Retirement Declaration

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

## Detection

Detection is read-only and runs in the worker's pre-flight. The worker records
the emptied capabilities as `retired_capabilities` and checks the preconditions
below, also read-only. Detect the delta shape directly: `openspec validate`
checks delta well-formedness or the published spec, never this shape.

## Preconditions

Each blocking condition is a **declaration refusal**: write nothing, run no CLI
archive, and report the condition with its way forward. A refusal is a stop,
never a question, on every route.

- **Author veto** — `retire_capabilities` is present with the parsed value
  `false`. Way forward: remove the `retire_capabilities: false` entry, or
  reshape the delta so it does not empty the capability. Running the CLI anyway
  fails with `archive_spec_validation_failed` on every rerun, because the CLI
  cannot tell `false` from an absent key.
- **Unhonoured value** — `retire_capabilities` is present with a parsed value
  that is not a boolean (a string such as `"yes"`, `null`, a number). Name the
  file, the key, and the value. Way forward: set it to `true` to declare, to
  `false` to veto, or remove it. Archive never guesses which boolean the value
  meant and never overwrites it: guessing `true` would delete a published spec
  on a guess.
- **Unaccounted content** — an emptied capability's published spec has a `##`
  section other than `## Purpose` above its requirements; the CLI cannot
  attribute it and refuses the retirement. Name the capability and each
  heading. Way forward: move that content out of the spec, then rerun
  `sai-archive`.
- **Metadata** — `openspec/changes/<name>/.openspec.yaml` is missing, does not
  parse, or has no `schema:` key. Name the file and the missing or broken key.
  Archive never creates `.openspec.yaml` and never authors `schema:`: a file
  without a schema makes the change unreadable to `openspec status`.
- **All or nothing** — when any emptied capability is blocked, the whole
  declaration is refused; no subset is retired.

## Write

Whoever runs the CLI archive writes the declaration: the coordinator on the
ordinary route, the archive worker (through Bash) in the Direct Build execute
continuation. With no capability-emptying delta, `.openspec.yaml` is not
touched.

1. Re-check the preconditions against the current files.
2. Judge on the parsed YAML value, never on the line's text: a parsed `true`
   is already a declaration, so skip the write; `false` and non-booleans were
   refused above. The write therefore only inserts an absent key.
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
