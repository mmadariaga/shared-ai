> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: high (S1 = 5 capabilities ≥ 4; S2 = 13 requirements > 10; S5 = 10 impact paths > 8; no breaking change, no new dependency)

## Why

`sai/commands/worktree/instructions.md` encoded a pure finite-state machine as prose: porcelain parsing, the free-slot search, branch derivation, refname validation, the dirty-worktree check, and the unmerged-commits check were all re-interpreted by the model on every `/sai-worktree` invocation. Prose re-interpretation of deterministic decisions is where drift enters, and the Windows PowerShell quoting of git arguments was a standing hazard.

`sai/tools/check-delta-headers.js` had already established the tool pattern — a Node script with `--json` and closed exit codes — but no projection rule installed it. `sai/commands/archive/coordinator.md` therefore invoked it through a project-relative path that only resolves inside this repository. Shipping a projection rule for `sai/tools/*.js` is what makes the tool pattern usable outside this repo at all, and it makes the existing delta-header preflight reachable retroactively.

## What Changes

- Added `sai/tools/worktree.js`: the deterministic engine for `/sai-worktree`, with five sub-commands — `inventory`, `create [name]`, `index <path>`, `remove <path>`, and `delete-branch <branch>` — a `--json` report on stdout, a `--cwd` repository anchor, and closed exit codes 0 (done) / 1 (refused, nothing mutated) / 2 (usage or git/IO error). Refusals carry a `reason` and a human-readable `message`.
- Kept the CodeGraph pre-announcement by splitting the indexing pass out of `create` into its own `index` sub-command: `create` returns an `indexAnnouncement` string and runs no pass, and the instruction prints that announcement verbatim, calls `index <path>`, then prints the returned `indexing.message` as the single result line. Splitting the calls is what lets the announcement precede the pass while each call's stdout stays parseable JSON.
- Added a `sai-tools` rule to `sai/install-manifest.json`, symmetric to the existing policy rules: `source: sai/tools`, `destination: { class: "sai", path: "tools" }`, both harnesses, `strategy: copy`, `recursive: true`, `include: ["**/*.js"]`, `ownership: managed`, `drift: content`.
- Rewrote `sai/commands/worktree/instructions.md` so the agent calls the tool and presents what it returns instead of re-deriving the checks. The instruction lists four verbatim candidate tool paths with a per-harness try-order — project-local before user-global — and never composes an absolute path from a root string; the opencode user-global root is `~/.config/opencode/`, with an `opencode debug paths` probe as the only fallback for a non-default XDG root.
- Registered `sai/tools/` in the `AGENTS.md` layout listing and registry table, and rewrote the `/sai-worktree` prerequisite-exception paragraph to name the five sub-commands and the announce-then-index-then-report sequence of the Create action.
- Added `test/worktree-tool.test.js` covering the projection rule and its managed content-tracked ownership, porcelain parsing, branch derivation, inventory role marking and free-slot selection, every `create` refusal, the `delete-branch` unmerged and skipped-merge-check refusals, the rule that only `create` announces the pass and the pass reports exactly one result line, the usage-error path, and the instruction's use of the tool.

Implemented behavior not named in the statement of intent, recorded here as implemented behavior only: `remove` additionally refuses an unregistered path and the main or current worktree, and `delete-branch` additionally refuses a branch that does not exist.

## Capabilities

### New Capabilities

- **sai-tools-distribution** — the managed projection of `sai/tools/*.js` into the resolved `sai/tools/` directory of both harness roots, with install, doctor, and uninstall lifecycle coverage.
- **worktree-tool-engine** — the deterministic `/sai-worktree` engine: the five-sub-command surface, the invocation form, the exit-code and JSON output contract, verbatim forwarding of tool output, and the tool-path candidate resolution rule.

### Modified Capabilities

- **worktree-create-indexing** — the indexing pass runs through the `index` sub-command, which spawns `codegraph` directly with no shell, so no shell-quoting step applies to the worktree path. The pre-announcement line and the single result notice are unchanged.
- **worktree-command-distribution** — the `AGENTS.md` documentation of the `/sai-worktree` prerequisite exception now records the five sub-commands and the announce-then-index-then-report sequence.
- **worktree-deletion** — the detached-main branch deletion runs through a `merge-check-skipped` refusal and a re-presented, informed confirmation before `--force`.

## Impact

- New files: `sai/tools/worktree.js`, `test/worktree-tool.test.js`
- Modified files: `sai/install-manifest.json`, `sai/commands/worktree/instructions.md`, `AGENTS.md`
- New capability specs: `openspec/specs/sai-tools-distribution/spec.md`, `openspec/specs/worktree-tool-engine/spec.md`
- Modified capability specs: `openspec/specs/worktree-create-indexing/spec.md`, `openspec/specs/worktree-command-distribution/spec.md`, `openspec/specs/worktree-deletion/spec.md`
- Operational: every `node <tool-path> …` invocation raises a permission prompt until the user whitelists the stable command prefix; no wrapper's `allowed-tools` was changed and no `permission.bash` entry was added to the installer merge.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

Implementation evidence — the staged diff against base `22175a9ee10f06fa7e5bf9be47a5b6ee7472171c`:

- `sai/tools/worktree.js` — the new engine; the sub-command surface, the refusal reasons, `indexAnnouncement`, and `indexWorktree` were read directly rather than taken from the change description.
- `sai/commands/worktree/instructions.md` — the rewritten consumer: tool-path candidates, the invocation form, the exit-code contract, and Steps 1–4.
- `sai/install-manifest.json` — the new `sai-tools` projection rule, compared against the adjacent policy rule it mirrors.
- `AGENTS.md` — the layout line, the registry row, and the `/sai-worktree` prerequisite-exception paragraph.
- `test/worktree-tool.test.js` — the behavior the change asserts about itself.

Existing contracts consulted to decide what this change invalidates:

- `openspec/specs/worktree-inventory/spec.md`
- `openspec/specs/worktree-selector-loop/spec.md`
- `openspec/specs/worktree-creation/spec.md`
- `openspec/specs/worktree-deletion/spec.md`
- `openspec/specs/worktree-create-indexing/spec.md`
- `openspec/specs/worktree-command-distribution/spec.md`

Contracts consulted while composing and validating this proposal:

- `openspec/schemas/sai-workflow/schema.yaml` — the proposal artifact's required line and sections.
- `sai/commands/spec/steps/validation.md` — the `## Complexity Derivation Rubric` used for the `**Complexity**` token above.
- `openspec/changes/archive/2026-08-23-unify-apply-command-shape/proposal.md` — the conforming post-hoc precedent for placing `**Complexity**` after the POST-HOC RECORD blockquote.

No external URL was consulted; every source is in-repository.

## Additional Notes

- **Which copy of the tool runs is a correctness property, not a convenience.** The instruction resolves the tool through an ordered list of verbatim path literals and never joins a root string to a suffix, because composed absolute paths have been observed to drop a segment. The opencode user-global root is `~/.config/opencode/`, not `~/.opencode/`; the `opencode debug paths` probe exists only for a non-default XDG root and is the single place any path is joined at all.
- **The permission surface was deliberately left alone.** No wrapper's `allowed-tools` was widened and no `permission.bash` entry was added to what the installer merges into an existing opencode config, so the user decides their own whitelist. The consequence is accepted: each invocation prompts until the user whitelists the stable `node <tool-path> …` prefix. That prefix is a textual match, not a filesystem boundary — the argument validation inside the tool is the real check.
- **`bin/` stays install-time only.** Runtime tools live under `sai/` so they travel through the same managed projection as the prose that invokes them; a new `tools` destination class was considered and rejected because the existing `sai` class already reaches the right root.
- **The implementation moved twice after the first backfill pass.** The CodeGraph pre-announcement was briefly dropped and then restored — the code was corrected rather than the governing spec — and the `--no-index` flag existed briefly and was removed. Neither appears anywhere in this record as implemented behavior, because neither is in the code being described. This note exists so a later reader who finds them in the branch history knows they were transient.
