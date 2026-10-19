# Archive Pre-flight

The read-only pre-flight of the `sai-archive-worker`. Every check here reads;
none writes. `$ARGUMENTS` is the resolved change name.

Transport: where this file says **report**, the worker carries the exact text
in its returned `summary` and the coordinator presents it verbatim; where it
says **ask**, the worker returns the question and ordered options as a
`needs_input` result. Every mutation — the retirement declaration, the CLI
archive, and every git operation — runs outside this pre-flight: coordinator-side
on the ordinary route, and in the validated Direct Build execute continuation on
that route.

## Classification Check

Fetch @sai/policies/issue-origin-preservation.md. Read the selected change's
`backlog_origin` before the archive move and carry that known value in the
pre-flight summary for the mutation owner to compare with archived metadata.
If a known origin is absent or unverifiable, warn and continue. Do not infer
an association from a branch number or an ordinary `Refs` mention.

1. Run `openspec status --change "$ARGUMENTS" --json` for the artifact
   completion status.
2. Resolve `backfilled` from `openspec/changes/$ARGUMENTS/.openspec.yaml`: it is
   `true` only when the file exists, parses, and holds the boolean `true` under
   that key. Anything else (absent file or key, `false`, the string `"true"`,
   `null`) is `false`. A corrupt file is `false` plus one warning line; the check
   continues. Log `[sai-archive] backfilled=<true|false>`.
3. Group the ten `sai-workflow` artifacts from the JSON `artifacts` array:
   - **CORE** (blocking): `proposal`, `specs`, `design`, `tasks`;
   - **AUDIT** (informational): `review`, `security`, `performance`,
     `accessibility`, `change-overview`;
   - **EXEMPT** (silent): `interfaces`, never collected into any set and never
     named in a diagnostic.
4. **CORE.** For a backfilled change, skip `design` and `tasks`; `proposal` and
   `specs` are always checked. Collect every
   remaining CORE artifact whose `status` is not `done`. When any is collected,
   close the run with a terminal result whose summary is exactly
   **"Missing CORE artifact(s): <id1>, <id2>. Archive blocked."**, with no AUDIT
   line.
5. **AUDIT**, once CORE is complete:
   - `review`, `security`, `performance`, `accessibility` — an artifact not
     `done` still counts as present when
     `openspec/changes/$ARGUMENTS/<id>.md` exists and contains the heading
     `## Not Applicable` (case-sensitive); otherwise collect it.
   - `change-overview` — skipped for a backfilled change. Otherwise read
     `overview.state` from `.openspec.yaml` (absent means `unmaterialized`) and
     collect it unless its CLI `status` is `done` **and** the state is
     `current`. `## Not Applicable` does not apply to it.
   - When anything is collected, report exactly one line:
     `[sai-archive] informational: missing AUDIT artifact(s): <id1>, <id2>`.

## Delta-sync summary

For each delta spec capability, compare it with its main spec at
`openspec/specs/<capability>/spec.md` and report a combined, informational
delta-sync summary. A capability with no main spec is a new addition, reported
as `[ADD] <capability>`. The `openspec archive <name> --yes --json` CLI performs
the actual synchronization and move in one validated operation; SAI reports,
and never duplicates, that work.

## Capability retirement

Detect capability-emptying deltas and check the declaration preconditions as
defined in @sai/commands/archive/retirement-declaration.md. A blocking
precondition closes the pre-flight with the refusal; otherwise the emptied
capabilities travel in the summary as `retired_capabilities`.

## Collision check

Report whether `openspec/changes/archive/YYYY-MM-DD-$ARGUMENTS/` already
exists, using the CLI's naming: a name that already starts with `YYYY-MM-DD-`
keeps it, and no second date is stacked.
