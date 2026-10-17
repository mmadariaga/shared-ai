# MODIFIED Scenario Preservation

Applies to Claude Code and opencode with the same shared checker. Published
specifications are read-only inputs. A MODIFIED requirement keeps every existing
scenario name in that same requirement; order and scenario text may change and
new scenarios may be added.

## Temporary exceptions

Represent intentional differences as a JSON array, one object per scenario:

```json
[
  {"capability":"example","requirement":"Existing requirement","original_name":"Old scenario","operation":"remove"},
  {"capability":"example","requirement":"Other requirement","original_name":"Old name","operation":"rename","new_name":"New name"}
]
```

Names are exact. A rename requires its new name in that same requirement.
Duplicate, malformed, or unused exceptions fail validation. There is no blanket
bypass. Metadata is temporary, never a scenario or repository artifact.

The backfill worker writes `scenario-exceptions.json` with `transfer.js put`
inside its transfer directory (an empty array when none are proposed). It returns
`scenario_exception_reference: {path, sha256}` beside `draft_references`, not
inside that destination-bearing list. Each corrected result returns the complete
latest metadata reference as well as the latest drafts.

The receiver verifies the metadata reference with `transfer.js verify` and checks
each proposed exception against explicit approved scope (the approved block,
accepted interview answers, or approved change artifacts). A worker declaration,
the implementation diff, fast-track, and a checker pass are not approval. With
no evidence, restore the scenario or ask the user to approve that exact removal
or rename; do not materialize or archive the affected draft meanwhile.

## Check at each boundary

Resolve `check-delta-headers.js` per `@sai/policies/tool-resolution.md`. Run:

```sh
node <tool-path> <change-name> --json --delta-dir <draft-specs-dir> --scenario-exceptions <metadata-file>
```

For on-disk deltas omit `--delta-dir`. Without exceptions omit
`--scenario-exceptions` (preserve every name). Main specs resolve from the project
root, never the temporary draft directory. The tool compares by capability AND
requirement, not globally. Exit 0 means headers and scenario preservation pass;
exit 1 returns concrete differences for correction; exit 2 means the comparison
could not complete, not that preservation succeeded. Keep existing schema checks.

- **Author boundary:** after putting the complete draft set and metadata, the
  backfill worker runs the check on `<transfer-dir>/specs` before returning any
  completed draft result. Candidate exceptions here are proposals only.
- **Receiver boundary:** before materialization, the coordinator independently
  verifies all references, approves each exception, and runs the check on the
  temporary drafts. A failed check returns its report to the same worker for
  correction; no draft writes occur before it passes. Repeat on corrected content.
- **Archive boundary:** immediately before issuing any archive execution order
  or running the archive CLI, the coordinator independently runs the check on
  current on-disk deltas, with only scope-verified exceptions. Repeat after any
  content correction, before retrying the CLI. A failed comparison prevents sync,
  archive, and commit of those drafts; correct the affected content first.

Direct Build archive-failure corrections also return temporary draft references
first. The coordinator applies the receiver boundary to those corrected bytes
before authorizing the backfill worker to rewrite the named drafts. It then
repeats the archive boundary before any sync retry. This preserves the existing
same-worker correction ownership and budget, with no new commit authorization.

Direct Build retains verified exception bytes and approval evidence outside the
repository until archive completes. It retains its transfer directory through
archive (including corrections), rather than closing it after backfill execution;
close it at the existing terminal cleanup. Re-verify references before every use;
changed bytes require fresh approval and a fresh check. Ordinary archive sessions
derive any needed temporary exceptions from explicit approved change scope and
verify them independently, without depending on a previous backfill's temporary
directory. Ordinary backfill keeps its existing invocation-close cleanup; an
absent earlier session is not approval.
