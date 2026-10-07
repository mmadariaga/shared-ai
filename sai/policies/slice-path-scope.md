# Slice Path Scope

Single source of the deterministic check that compares a slice's paths with
the working tree and with a commit order.

## Terms

- **Slice paths** — the files the implementer changed, the reconstructed
  artifacts, and the synced main specs.
- **Initial snapshot** — the record of the files that were already modified
  before the slice started.

## The tool

`sai/tools/slice-path-scope.js` makes the check and only reads the repository.
Fetch @sai/policies/tool-resolution.md and resolve the copy with `<name>` set
to `slice-path-scope.js`. The invocations are byte-identical whichever
candidate wins:

```
node <tool-path> snapshot --json --cwd <project-root>
node <tool-path> verify --snapshot <slice_snapshot> --json --cwd <project-root>
```

`verify` reads its lists from standard input, one repository-relative path per
line: the slice paths, then a `---` line, then the covering list. A directory
stands for every path beneath it. Act on the payload the tool prints; its
verdict is final.

## Initial snapshot

Take one `snapshot` per slice, before the slice's first write, and hold the
returned `snapshot` value as `slice_snapshot`. It is invocation-scoped
conversation state, held exactly like `guard_base` in
`@sai/policies/no-commit-guard.md`.

## Verify payload

- `foreign` — paths changed since the initial snapshot that lie outside the
  slice paths.
- `uncovered` — slice paths that lie outside the covering list.
- `verdict` — `clean` when both lists are empty, `mismatch` when either holds
  a path, `n/a` when no check was possible; `reason` then names why.

## Commit coverage

A commit order covers the slice when `verify`, given the slice paths and the
order's owned paths as the covering list, returns an empty `uncovered`. Send
the order then. While `uncovered` holds a path, the order is incomplete: add
those paths to its owned paths and verify again.

On an `n/a` verdict, print one conversation line naming `reason` and send the
order.
