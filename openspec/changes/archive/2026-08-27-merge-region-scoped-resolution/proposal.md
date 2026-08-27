> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The prior merge contract required the coordinator to write complete final file contents for every conflicted file and explicitly rejected region replacements. When a three-line conflict appeared in one file, the worker had to retype the entire file contents—including untouched regions—to produce a valid payload. This overhead created a correctness risk: untouched lines could drift silently during regeneration, as observed when an assertion in an untouched test region was dropped during merge resolution without any coordinator detection.

By limiting generated content to the conflict region itself and sourcing `ours` and `theirs` outcomes directly from git, the region-replacement model eliminates the retyping overhead and the drift class it enabled. Single-side resolutions use git's authoritative versions without generation; mixed-side resolutions require explicit authored synthesis of only the regions in question.

## What Changes

- **Worker alternative construction**: `ours` and `theirs` are no longer generated. They are obtained directly from git via `git show :2:<file>` and `git show :3:<file>`, materializable with `git checkout --ours` or `--theirs`. This applies only when all conflict regions in a file resolve to the same side. When regions resolve to different sides, neither single-side alternative is available; synthesis is the only path.

- **Synthesis scope**: The `synthesis` alternative changes from a complete file outcome to a region-scoped outcome. The authored text is limited to the conflict region(s), not the entire file. Workers must never retype untouched lines when creating a synthesis.

- **Payload structure**: The resolution payload changes from a `content` field (complete UTF-8 file contents as a JSON string) to a `source` field (exactly `"git-ours"`, `"git-theirs"`, or `"authored"`) and a `regions` array. When `source` is `git-ours` or `git-theirs`, the regions array is empty. When `source` is `"authored"`, regions contains one entry per conflicted region, each carrying a `conflict_id` and region-replacement `text`.

- **Coordinator materialization**: The coordinator no longer writes complete file contents. Instead, it uses `git checkout --ours` or `--theirs` for git-sourced outcomes, and splices each region's authored text into the working file at its marked conflict location for authored outcomes.

- **Edge case handling**: New explicit paths for conflicts where regions resolve to different sides (E4) and conflicts with no region markers (E5) are introduced.

- **Validation inversion**: Region replacements change from rejected to accepted. The validation boundary inverts to accept source/regions structure and reject complete-file content.

## Capabilities

### Modified Capabilities

- **sai-merge-command**: The resolution payload contract inverts from whole-file to region-scoped. Git-sourced branch outcomes are obtained by command rather than generation. Coordinator materialization uses splicing instead of complete-file writes.

- **merge-presentation-seam**: The validation boundary now accepts region-replacement payloads instead of rejecting them. Mutation remains gated on atomic validation, but the validated unit changes from complete file contents to source/regions records.

## Impact

### Modified Capabilities

- `openspec/specs/sai-merge-command/spec.md` — Three requirements updated:
  1. "Categorized conflict resolution with criteria" — region-scoped construction with git-sourced alternatives and E4/E5 edge cases
  2. "Contextual decision precedes resolution mutation" — source/regions records unlock mutation, not complete-file payloads
  3. "Complete resolution payload validation" — inverted to accept source/regions, reject complete files
  All scenarios preserved by name (11 + 2 + 2 scenarios).

- `openspec/specs/merge-presentation-seam/spec.md` — One requirement updated:
  1. "Complete-file resolution validation precedes mutation" — now validates source/regions records and uses git-checkout/splice materialization instead of complete-file writes
  All three scenarios preserved by name.

### Files Modified

- `sai/commands/merge/coordinator.md` — Payload validation and materialization sections updated
- `sai/commands/merge/instructions.md` — Alternative construction, synthesis scope, edge cases E4 and E5
- `sai/commands/merge/worker.md` — Resolution result contract updated for source/regions format
- `test/merge-contextual-conflict.test.js` — New test added for region-scoped resolution with edge cases

Out of scope: design.md, tasks.md, implementation.md
