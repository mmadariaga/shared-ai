> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: medium (S1 = 3 capabilities in 2–3; S2 = 7 requirements in 4–10; S5 = 8 impact paths in 3–8; no breaking change, no new dependency)

## Why

`sai/policies/status-picker.md` was `sai/policies/change-picker.md` reproduced nearly line for line. Both described the same mechanical resolution in English — take the trimmed `arguments_value` if it is non-empty, otherwise read `openspec list --json` and branch on whether the list has zero, one, or two-or-more entries — and the only real difference between the two files was that one of them prepends a "See all" option on the last branch. That single parameter had nowhere to live in prose, so it was expressed by cloning the file.

The cost was not the duplication itself but what the duplication was made of: a resolution that is `changes.length === 0 / === 1 / else` was maintained twice as English, and re-derived by the model on every invocation of ten consuming commands. Two copies of a rule drift; one copy in code does not. This change makes the resolution deterministic and gives the bulk-view branch the parameter it always wanted, while leaving every user-facing word exactly where a user-facing word belongs — in the policy that asks the question.

## What Changes

- Added `sai/tools/change-picker.js`, the deterministic resolution engine, following the pattern `check-delta-headers.js`, `worktree.js`, and `prereqs.js` established. One sub-command, `resolve`, takes an optional supplied name as its single positional argument and accepts `--bulk-option`, `--json`, and a `--cwd` project-root anchor. Its closed exit codes are 0 = a name was resolved or an option set is reported, 1 = refused because there is no active change to pick, 2 = usage error or CLI/IO failure on stderr.
- The resolution follows the policies' order exactly. A non-empty trimmed supplied name wins outright and reports `outcome: supplied` with `resolved_name` set — the active change list is never consulted on that path. Otherwise the list decides: empty refuses with `reason: no-active-changes`; one change reports `outcome: confirm` with the `candidate` name and a `yes`/`no` option set; two or more report `outcome: select` with one option per change name in list order. `openspec list --json` is the sole source of that list, and only `changes[].name` is read.
- `--bulk-option` is the whole of the difference between the two pickers. It prepends `{ label: "See all", value: "see-all" }` to the two-or-more option set and to nothing else — the zero- and one-change branches never offer it, with or without the flag. The `see-all` sentinel is chosen so it cannot collide with a change name, since change names are directory names.
- The tool resolves; the harness asks. It never prints a question, never assumes an answer, and carries none of the user-facing wording: not the zero-changes STOP literal, not either confirmation or selection question, not their numbered plain-text fallbacks, and not the `> BULK-MODE ACTIVE` signal line. A test asserts that none of them appears anywhere in the tool's serialized output on any branch.
- Rewrote `sai/policies/change-picker.md` to delegate rather than describe. It carries the per-harness ordered list of verbatim tool-path candidates (project-local root before user-global; on opencode, an `opencode debug paths` probe as the only fallback for a non-default XDG config root), the single byte-identical invocation `node <tool-path> resolve "<arguments_value>" --json --cwd <project-root>` so one whitelist entry per root covers it, the exit-code mapping, and an outcome-to-prompt map. It instructs the reader not to list the changes themselves, not to second-guess an outcome, and not to let the tool phrase a question. Every pinned literal is byte-identical to its pre-change form.
- Rewrote `sai/policies/status-picker.md` the same way, by reference: it points at `change-picker.md`'s candidate-resolution section instead of restating it, and differs only by adding `--bulk-option` to the invocation and by recognising the answer whose reported `value` is `see-all`. Its option order, its `> BULK-MODE ACTIVE` behavior, and its decline and re-prompt semantics are unchanged.
- Amended `status-picker.md`'s read-only invariant sentence so its enumeration of permitted side effects names the `openspec list --json` call the tool makes, rather than a direct CLI call the policy no longer performs.
- Updated the `sai/tools/` registry row in `AGENTS.md` so it names `change-picker.js` (the change-name resolution engine shared by `change-picker.md` and `status-picker.md`) alongside `check-delta-headers.js`, `worktree.js`, and `prereqs.js`, in the same parenthetical style. One row changed; the projection sentence that follows it is untouched. Without this the row would have described a directory holding four tools while naming three, which the `sai-tools-distribution` requirement that the registry name the tools it holds does not permit.
- Added `test/change-picker-tool.test.js`: the supplied-name short-circuit proved by running with no `openspec` on PATH at all, each of the three list branches, the one-change branch's refusal of `--bulk-option`, the bulk option as the sole difference between the two option sets, the caller-owns-the-wording property across every branch and both flag settings, the exit-2 usage surface, the `--help` exit-code documentation, the two policies' delegation and literal byte-identity, and the absence of the old change-list-parsing prose from both.

Implemented behavior not named in the statement of intent, recorded here as implemented behavior only: the `--help` and bare-invocation usage surface with its exit codes; a one-line human-readable rendering of each outcome when `--json` is absent; the win32 shell hop that lets an npm-installed `openspec` `.cmd` shim be executed at all; the mapping of a spawn `ENOENT` to "the binary is not available" and the guards for non-zero CLI exit, unparseable JSON, and a missing `changes` array; the `--cwd` directory existence check as an exit-2 usage error; and the `see-all` sentinel's collision-proof choice.

## Capabilities

### New Capabilities

- **change-name-resolution-tool** — the deterministic change-name resolution engine: the `resolve` sub-command surface, the supplied-name short-circuit, the 0/1/N outcome vocabulary and its ordered option sets, the `--bulk-option` parameterization of the two-or-more branch, the JSON and exit-code output contract, the caller-owned question boundary, and the per-harness tool-path candidate resolution both policies share.

### Modified Capabilities

- **change-picker** — the shared instruction no longer carries the 0/1/N resolution steps at all, so the consumer-scope requirement's claim that those steps are identical before and after no longer describes the file. The nine consumers remain behaviorally identical; what changed is where the resolution lives.
- **status-picker** — the read-only invariant's closed enumeration of permitted side effects no longer matches the instruction, which now reaches `openspec list --json` through a node tool invocation rather than calling the CLI itself.

## Impact

- New files: `sai/tools/change-picker.js`, `test/change-picker-tool.test.js`
- Modified files: `sai/policies/change-picker.md`, `sai/policies/status-picker.md`, `AGENTS.md`
- New capability specs: `openspec/specs/change-name-resolution-tool/spec.md`
- Modified capability specs: `openspec/specs/change-picker/spec.md`, `openspec/specs/status-picker/spec.md`
- Distribution: none. The `sai-tools` projection rule already installs every `sai/tools/*.js` into both harness roots as managed, content-tracked files; `change-picker.js` is covered by it on arrival and no manifest change was needed. Only the `AGENTS.md` registry row that names the tools required an edit.
- Operational: no wrapper's `allowed-tools` was changed and no `permission.bash` entry was added to the installer merge, so each `node <tool-path> resolve …` invocation prompts until the user whitelists the stable prefix themselves.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

Implementation evidence — the staged diff against base `9fdbeba2` on branch `worktree-4`:

- `sai/tools/change-picker.js` — the new engine; `commandResolve`, `listChangeNames`, `run`, `parseArgs`, `renderText`, `main`, the `BULK_VALUE` constant, and the exported surface were read directly rather than taken from the change description.
- `sai/policies/change-picker.md` — the rewritten consumer: the candidate ladder, the invocation form, the exit-code mapping, the four numbered outcome branches, and the pinned literals verified against their pre-change form in the diff.
- `sai/policies/status-picker.md` — the same rewrite by reference, plus the `--bulk-option` invocation, the `see-all` recognition rule, and the amended read-only invariant sentence.
- `AGENTS.md` — the `sai/tools/` registry row, read as a one-line diff: the fourth tool and its parenthetical gloss were added and nothing else on the row or in the surrounding table changed.
- `test/change-picker-tool.test.js` — the behavior the change asserts about itself, including the leak test that pins the caller-owns-the-wording boundary.

Existing contracts consulted to decide what this change invalidates:

- `openspec/specs/change-picker/spec.md` — invalidated; MODIFIED delta emitted. Validates clean today.
- `openspec/specs/status-picker/spec.md` — invalidated; MODIFIED delta emitted. Validates clean today.
- `openspec/specs/sai-tools-distribution/spec.md` — read in full. The `sai-tools` projection rule pre-exists this change and already covers the new tool, and the registry requirement that `AGENTS.md` name the tools the directory holds is now satisfied by the updated row rather than contradicted by it. Its scenario names two tools as examples, which a row naming four still satisfies. No delta.
- `openspec/specs/bulk-status-table/spec.md` — read in full; the "See all" trigger and the list order it depends on survive unchanged. No delta.
- `openspec/specs/closed-choice-prompts/spec.md` — read in full; presentation is unchanged and stays the harness's. No delta.
- `openspec/specs/question-context-policy/spec.md` — read in full; both picker prompt families remain registered exemptions with their wording byte-stable. No delta.
- `openspec/specs/per-command-tool-scoping/spec.md` — read in full; no `allowed-tools` was changed. No delta.
- `openspec/specs/sai-status-change-picker/spec.md` — read in full; it records `sai-status`'s supersession to a dedicated picker file, which this change does not touch. No delta. It fails `openspec validate` today on an unrelated pre-existing defect.

Contracts consulted while composing and validating this proposal:

- `openspec/schemas/sai-workflow/schema.yaml` — the proposal artifact's required `**Complexity**` line and its `## Proposal Research Documentation` and `## Additional Notes` sections.
- `sai/commands/spec/steps/validation.md` — the `## Complexity Derivation Rubric` used for the `**Complexity**` token above.
- `openspec/changes/archive/2026-09-06-extract-prereqs-preflight-tool/proposal.md` — the conforming post-hoc precedent for this shape, and the immediately preceding slice this one follows.

No external URL was consulted; every source is in-repository.

## Additional Notes

- **The duplication was never about behavior; it was about a parameter that had nowhere to live.** Prose has no formal parameters, so the one difference between the two pickers — a single extra option on one branch — could only be expressed by copying the file. In code it is a boolean, and the second copy stops existing.
- **The tool resolves; the harness asks.** The split is the whole design. A native option-picker is a presentation affordance the harness owns, and the exact words of a question are the one part of a picker that is genuinely prose. Both stay in the policies; only the `0/1/N` decision moved.
- **The bulk-view option belongs to one branch, not to one caller.** `--bulk-option` is scoped to the two-or-more branch inside the tool, so `sai-status` cannot accidentally offer "See all" when there is nothing to see all of. A test pins that, because the flag reads like a caller-wide mode and is not one.
- **One tool, two callers, an explicit contract.** The accepted trade-off is that the bulk-view branch must be stated in the invocation rather than implied by which file is reading. That is why `status-picker.md` documents `--bulk-option` as always-passed and names the `see-all` value it recognises, instead of leaving the difference implicit.
- **Adding a tool is not finished until the registry names it.** The `sai-tools` projection needs no manifest edit for a new tool, which makes it easy to forget that `AGENTS.md` carries a separate, human-facing obligation to name what the directory holds. This change initially met the first and missed the second; the registry row was the last step, not an afterthought.
- **Direct invocation from the nine consuming commands was considered and rejected.** None of them declares Bash today, and they already delegate change resolution to the shared policy. Adding nine invocation points would widen the permission surface to buy nothing.
- **Two tools mirroring the two policy files was considered and rejected.** It would have reproduced the duplication in code, where it is harder to see and easier to let drift.
- **Two claimed boundaries are recorded here rather than specified.** That the pickers run through the executor subagent path (I5) is not evidenced anywhere in the staged diff, and that no `allowed-tools` or `permission.bash` entry was touched (I3) is evidenced only as an absence. Under the fast-track path no reconciliation question was asked, so neither was confirmed as a deliberate preservation and neither entered a normative requirement.
