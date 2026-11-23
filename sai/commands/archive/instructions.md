# Archive Plan

The archive pre-flight is a computation, so `sai/tools/archive-plan.js` makes it
and the coordinator runs it directly: no worker turn computes a plan. The tool
is the single source of the Classification Check (the CORE gate and the AUDIT
line), the delta-sync summary, the capability-retirement detection and its
preconditions (`@sai/commands/archive/retirement-declaration.md` defines the
declaration), the collision check, the date-prefixed destination, the owned
staging paths, and the closing line of the archive commit. It reads the
repository and spawns only `git` and `check-delta-headers.js`; it writes nothing.
`openspec archive <name> --yes --json` stays the sole sync and move primitive.

## Running the tool

Fetch `@sai/policies/tool-resolution.md` and resolve `archive-plan.js`:

```
node <tool-path> plan <change-name> --json --cwd <project-root>
```

Direct Build adds `--implementer-paths-file <path>` (one repository-relative
path per line, deletions included), or one `--implementer-path <path>` argument
per path, and, on the no-specs route, `--drafts-dir <transfer directory>`: the
draft `.openspec.yaml` and `proposal.md` there stand in for the change files
that no backfill worker wrote yet. Exit 0 is a plan, exit 1 is a refusal, exit 2
is a usage or tooling error. Every exit prints one JSON object.

## Refusal

A refusal (`ok: false`, `refused: true`) carries `reason` and a `summary` to
print verbatim. Nothing was written and no archive runs. A refusal is a planned
stop, never a question and never an obstacle. The reasons are `core-missing` (the
summary is exactly `Missing CORE artifact(s): <ids>. Archive blocked.`),
`collision`, `scenario-dropped`, `metadata-unreadable`, `comparison-incomplete`,
`change-not-found`, and the declaration refusals `retire-veto`,
`retire-unhonoured`, `retire-unaccounted-content`, and `retire-metadata`.

## The plan

A plan (`ok: true`) holds:

- `report_lines`: the confirming report, to print verbatim. It restates the
  change, schema, collision verdict, delta-sync summary, every retired
  capability, the AUDIT line, and the warnings.
- `archive_destination`: the date-prefixed destination, with the CLI's naming (a
  name that already starts with `YYYY-MM-DD-` keeps it).
- `retired_capabilities` and `retirement.declaration`: `none`, `write` (the
  declaration is still to be written), or `present` (the key already reads
  `true`).
- `affected_main_specs`, `owned_staging_paths`, `already_staged_deletions`,
  `omitted_ignored_paths`, `omitted_absent_paths`, and `covering_paths`: the
  paths the commit owns and the ones it leaves out. `owned_staging_paths` is the
  exact allowlist for staging. An already staged deletion is not added again and
  still belongs to the commit. `covering_paths` is the covering list of the
  `verify` check of `@sai/policies/slice-path-scope.md`.
- `closing_line` and `commit_body_lines`: the lines the commit message carries,
  from the tool and never from a model: `Closes owner/repo#N` for a verified
  origin, and one `Retired capability: <id>` line per retired capability.
- `plan_fingerprint`: the digest of the fields above. A plan computed again that
  differs from the one a decision rested on (the date changed at midnight, the
  index changed) is a different plan.

## Origin

Fetch `@sai/policies/issue-origin-preservation.md`. `origin.backlog_origin` is
the known pre-move value; compare it with the archived `.openspec.yaml` after the
move. A lost or unverifiable origin warns and never blocks, and gives no closing
line.
