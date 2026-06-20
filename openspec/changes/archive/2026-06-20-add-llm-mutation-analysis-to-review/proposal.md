## Why

`sai-5-review`'s Testing pass (category 7) checks whether code paths are *covered*, but coverage cannot tell whether a test would actually *fail* when the code regresses — a test that calls the code without asserting real behavior passes coverage yet catches nothing. Mutation testing is the only way to verify test sensitivity, and existing tooling (Stryker, PIT, mutmut, …) is too heavy to run inside a review (install, configure, minutes-to-hours). An LLM-as-mutator pass gives real mutation analysis with zero setup.

## What Changes

- Add **pass 11 (Mutation Analysis)** to the review workflow in `sai/instructions/review.md`, run after the existing ten passes. It performs mutation testing scoped to the diff against the parent branch and emits surviving mutants as findings in `review.md`.
- Pass 11 uses a **two-tier strategy**:
  - **Tier 1 (tool-path):** pass 11 inspects the project's manifest files (`package.json`, `pom.xml`, `build.gradle`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `CMakeLists.txt`, etc.) to detect whether a supported mutation testing tool is a project dependency. If one is detected, pass 11 runs the tool and parses surviving mutants. The LLM-as-mutator path is skipped.
  - **Tier 2 (LLM-as-mutator):** otherwise, the main agent (frontier tier) reasons about candidate mutations and delegates the mechanical apply→test→revert→verify I/O to sequential `budget-subagent`s (cheap tier, haiku), one per batch of at most 5–6 mutations. The test command is auto-detected from the same manifest files.
- Pass 11 **auto-detects** both the mutation tool and the test command by inspecting the project's manifest files. No new fields are added to `tasks.md`; pass 11 does not depend on `sai-2-design` authoring anything. Detection happens at review time.
- Pass 11 runs **only** when the diff contains testable production code AND the repo has at least one test file; otherwise it is skipped silently.
- New finding outcomes in `review.md`: surviving mutants and pre-check-failed mutations as **Major** (`mMUT-N`); revert-failed mutations as **Blocker** plus a critical working-tree-pollution warning printed to the user.

## Capabilities

### New Capabilities
- `mutation-analysis`: pass 11 of `sai-5-review` — scopes mutations to diff files, auto-detects the mutation tool and test command from project manifests, runs the two-tier strategy, enforces the LLM-as-mutator safety protocol (baseline pass, per-mutation pre-check, file-scoped revert, revert verification, timeout, per-subagent cap), and emits per-mutation outcomes as findings such that `survived + killed + preCheckFailed + revertFailed == totalMutations`.

### Modified Capabilities
<!-- None. The review workflow lives in instruction prose, not in a spec-tracked capability; pass 11 is additive and does not alter the spec-level behavior of passes 1–10. -->

## Impact

- **Files touched (by the eventual implementation):**
  - `sai/instructions/review.md` — add pass 11 to the Step 2 review categories (or a new step after Step 2), the safety protocol, the subagent dispatch contract, and `mMUT-N` finding rows + a Mutation Analysis section in `<output_template>`.
  - `openspec/schemas/sai-workflow/schema.yaml` — the `review` artifact instruction currently says "Perform ten review passes" (line ~167); becomes eleven, with Mutation Analysis named.
- **No new artifacts, commands, or wrappers:** no new schema artifact, no new `sai-*` command, no new claude/opencode/copilot wrapper. The change is confined to instruction prose and the schema description.
- **No production/application code is run or modified by this change itself** — it edits SAI workflow instructions. (At *review time*, Tier 2 temporarily mutates working-tree files of the project under review, but always reverts them file-scoped via `git checkout -- {file}`; this is review-time behavior governed by the safety protocol, not a change to this repo's code.)
- **Cost reach:** Tier 2 keeps the frontier tier on mutation *reasoning* and pushes file-edit/test-run/revert cycles to haiku subagents, consistent with the existing `budget-explorer`/`budget-subagent` delegation model already used elsewhere in `review.md`.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/review.md` — full review workflow; ten existing passes (lines 63–94), finding classification (96–105), `budget-explorer` dispatch contract (61), `<output_template>` finding rows (181–211), Hard Rules (230–238). Insertion point and conventions for pass 11.
- `openspec/schemas/sai-workflow/schema.yaml:160-174` — `review` artifact instruction ("Perform ten review passes"); the count to update. The `description` line (162) does not reference the pass count, so it requires no change for this change.
- `openspec/changes/add-code-quality-priority-stack/tasks.md:32-46` — existing `## Implementation Context` section (Stack/Conventions/Avoid); referenced only to note the current fields (no fields are added by this change).
- `C:\Users\mikel.madariaga\.claude\skills\budget-subagent\SKILL.md` — cheap-tier subagent binding: `subagent_type: general-purpose`, `model: haiku`, ~30-call soft cap, structured completion report. Confirms the dispatch contract and the per-subagent call budget for 5–6 mutations.

**External URLs**: None

## Additional Notes

- **All surviving mutants are Major, by user decision** — pass 11 does not escalate any survivor to Blocker on its own. Only revert-failed mutations are Blockers, because they leave the user's working tree polluted.
- **Full-visibility invariant:** every mutation the main agent decides on appears in the output even when a technical impediment prevents testing. The subagent output contract requires a per-mutation result for each assigned mutation — none is silently dropped — and the aggregate must satisfy `survived + killed + preCheckFailed + revertFailed == totalMutations`.
- **Cascade behavior on revert failure:** when a mutation is revert-failed, subsequent batches still dispatch; their per-file pre-checks (`git status --porcelain {file}` non-empty) naturally cascade those files to `pre-check-failed`, which preserves full visibility rather than hiding the downstream effect.
- **Safety protocol (Tier 2):** baseline test pass must succeed before any mutation; per-mutation pre-check requires `git status --porcelain {file}` empty (if dirty, STOP and ask the user to commit/undo); revert is always file-scoped `git checkout -- {file}`, never project-wide; revert is verified with `git diff {file}` empty; 60s timeout per test run; hard cap of 5–6 mutations per subagent to stay within the 30-call soft cap.
- **Outcome → finding mapping:** `killed` → no finding (internal only); `survived` → Major `mMUT-N`; `pre-check-failed` → Major "Could not test {file}: uncommitted changes. Commit or undo and re-run review."; `revert-failed` → Blocker + working-tree-pollution warning printed to the user.
