# Slice-scoped implementation for the Build (unattended) route

## Why

In a sliced crystallization set, every per-slice `Ready to Propose` block
carries the whole-idea `**Implementation Details**` list (`I1`…`In`) with no
mechanical per-slice attribution. That is deliberate: the `I` items are
decisions of the whole idea, not of one slice. But `sai-autofast-implement-worker`
works only from the block, and the block does not tell it which `I` items
belong to its slice. A blind implementer therefore implements later slices'
work in the current slice run — observed: slice 1 implemented `I5`–`I7` that
belonged to slice 2, the work was committed under slice 1's change name, and
the later slice was left with no content of its own.

The fix is not to attribute `I` items per slice at emission time (that would
break the deliberate whole-idea decision list). It is to make the implementer
scope by the block's own `**Capabilities in scope**`, which ARE per-slice.

## What Changes

1. **`sai/commands/explore/autofast-implement-worker.md`**: add a
   slice-scoped scope rule stating that `**Capabilities in scope**` is the
   authoritative boundary for the run; an `I` item is in scope only when its
   behavior is required by a capability listed in the block (or an Edge Case
   attributed to this slice), and out-of-scope items are never implemented,
   stubbed, or referenced in any slice of the run.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- auto-fast-implement-worker

## Impact

- `sai/commands/explore/autofast-implement-worker.md` 8 insertions

Out of scope: the sliced-crystallization block emission format is unchanged —
per-slice blocks still carry the full whole-idea `**Implementation Details**`
list, and the `explore-implementation-details` and `explore-crystallization-block`
capabilities are untouched.