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
node <tool-path> snapshot --targets --json --cwd <project-root>
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

## Foreign changes

After a recovery attempt, run `verify` with `slice_snapshot` and the slice
paths, without a covering list. An empty `foreign` means every change since
the slice started lies on the slice paths. A path in `foreign` is a repository
file foreign to the slice that changed: the caller reports those exact paths.

## No-effect check

This check proves that a failed execute order changed nothing. Immediately
before sending the order, take a `snapshot --targets`, with the order's
**target paths** on standard input, one per line, and hold its reference as
`order_snapshot`, conversation state like `slice_snapshot`. The target paths
are every path the order may create, modify, move, or remove: each path it
writes or stages, each directory it moves from and to, and each synced spec.
The tool watches a target straight from the file system, whatever its
git-ignore status, so list them all: a path left off the list is covered only
while git reports it.

When the order fails, run `verify` with `order_snapshot` and an empty standard
input: with no slice paths, every change since that snapshot — a target
created, modified, or removed, the working tree, the index, or HEAD — lands in
`foreign`.

- `clean` — the order had no effect.
- `mismatch` — the order had an effect; `foreign` names it.
- `n/a` — the effect is unknown.
