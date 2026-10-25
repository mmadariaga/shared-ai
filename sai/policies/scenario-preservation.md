# MODIFIED Scenario Preservation

Applies to Claude Code and opencode with the same shared checker. Published
specifications are read-only inputs. A MODIFIED requirement keeps every existing
scenario name in that same requirement; order and scenario text may change and
new scenarios may be added.

## Intentional removal or renaming

Preservation in MODIFIED is mandatory, with no exception mechanism. OpenSpec
1.13.0 rejects scenario loss there even when the requested change is approved.
Use REMOVED for the old requirement and ADDED for its replacement under an
explicitly chosen distinct, non-colliding requirement name. Reusing the old name
does not work. Never silently invent a replacement name: obtain it from approved
scope or ask for it. Approval alone cannot make an unsupported delta valid.

## Check at each boundary

Resolve `check-delta-headers.js` per `@sai/policies/tool-resolution.md`. Run:

```sh
node <tool-path> <change-name> --json --delta-dir <draft-specs-dir>
```

For on-disk deltas omit `--delta-dir`. Main specs resolve from the project
root, never the temporary draft directory. The tool compares by capability AND
requirement, not globally. Exit 0 means headers and scenario preservation pass;
exit 1 returns concrete differences for correction; exit 2 means the comparison
could not complete, not that preservation succeeded. Keep existing schema checks.

- **Author boundary:** after putting the complete draft set, the
  backfill worker runs the check on `<transfer-dir>/specs` before returning any
  completed draft result. This is preliminary, not write authorization.
- **Receiver boundary:** before materialization, the coordinator independently
  verifies all references and runs the check on the
  temporary drafts. It also applies `@sai/policies/backfill-draft-validation.md`.
  A failed check returns its report to the same worker for
  correction; no draft writes occur before it passes. Repeat on corrected content.
- **Archive boundary:** immediately before issuing any archive execution order
  or running the archive CLI, the coordinator independently runs the check on
  current on-disk deltas. Repeat after any
  content correction, before retrying the CLI. A failed comparison prevents sync,
  archive, and commit of those drafts; correct the affected content first.

Direct Build archive-failure corrections also return temporary draft references
first. The coordinator applies the receiver boundary to those corrected bytes
before authorizing the backfill worker to rewrite the named drafts. It then
repeats the archive boundary before any sync retry. This preserves the existing
same-worker correction ownership and budget, with no new commit authorization.

Direct Build retains its transfer directory through archive (including
corrections); close it at the existing terminal cleanup. Re-verify references
before every use; changed bytes require fresh validation. Ordinary backfill keeps
its existing invocation-close cleanup. Independent archive checks and the archive
CLI remain required; temporary validation does not replace either.
