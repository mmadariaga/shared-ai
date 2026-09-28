# Apply Runner

Fetch @sai/orchestration/workers/bindings/red-worker.md and use it.
Fetch @sai/orchestration/workers/bindings/green-worker.md and use it.
Fetch @sai/commands/apply/worker-common.md for its § Report contract, the nine report fields every apply worker returns.

The Step loop of `/sai-4-apply`, run by the apply coordinator. Change resolution and the ownership rules live in `coordinator.md`.

## Step loop

Run these steps for each Step the `apply-standalone@1` cursor makes active (coordinator § Step machine), in order:

1. **Enter.** Send `{kind: step-entry, step: "Step N"}` to `recovery-ledger@1` (coordinator § Known-False Report Recovery).
2. **Route.** Classify the Step with § Step Routing Tree, emit its mode, and fetch the routing file the machine returns. That file names the dispatches for this Step.
3. **Dispatch and verify.** For each dispatch the routing file names: select its plan (§ Dispatch plan selection), then immediately before a RED-worker dispatch (`red` or `green-exception`) print exactly `RED N/M`, or immediately before a GREEN-worker dispatch (`green` or `green-direct`) print exactly `GREEN N/M`. `N` is the active Step number; `M` is the count of all `#### Step N:` headings in `implementation.md`, including completed Steps. Completed Steps count toward `M` but get no new line. A same-worker continuation or recovery is the same phase and gets no new line; a phase the routing file omits gets no line. Dispatch, and after every return run coordinator § Post-dispatch sequence. A non-clean result goes to coordinator § Known-False Report Recovery. Done when the coordinator's own run of the Step's Automated checks passes (coordinator § Post-dispatch sequence), or the Step has stopped for a human. If the coordinator receives explicit authorization under § Exhausted-Step choice, start one new Step invocation for the same active Step and return to step 1; steps 4–6 remain blocked until that fresh invocation passes verification.
4. **Record.** In one batched update of `openspec/changes/{change-name}/implementation.md`: mark the Step's **Automated** checkboxes `[x]`, flip its projected entry to `completed`, and append its § Appendices entries.
5. **Commit.** Run § Step commit gate.
6. **Advance.** Emit `{"intent":"complete-step"}`. The next Step starts at step 1; when the machine returns `sai/commands/apply/steps/terminal-lifecycle.md`, fetch it and run it.

A Step that stops for a human ends the loop without steps 4–6: no checkbox, no commit, no advance.

Apply dispatches one worker per dispatch its routing file names (two in split-flow), plus up to three same-worker recovery continuations per Step. This multi-dispatch shape overrides the command runner's single-dispatch rule for apply only; `sai/orchestration/command-runner.md` itself is unchanged.

## Step Routing Tree

Classify each Step into exactly one mode before any dispatch. "Contract" means an exact, unambiguous `## Step N` contract: exactly one such heading in `interfaces.md` for this Step's integer. Zero headings, or an ambiguous several, count as no contract.

| # | RED block | Contract | Production file in scope | Mode | Routing file |
|---|---|---|---|---|---|
| 1 | absent | — | at least one | `green-direct` | `sai/commands/apply/steps/routing-green-direct.md` |
| 2 | absent | — | none | `green-exception-test-only` | `sai/commands/apply/steps/routing-green-exception-test-only.md` |
| 3 | present | none | — | `stop-missing-contract` | `sai/commands/apply/steps/routing-stop-missing-contract.md` |
| 4 | present | exact | at least one | `split-flow` | `sai/commands/apply/steps/routing-split-flow.md` |
| 5 | present | exact | none | `green-exception-no-production` | `sai/commands/apply/steps/routing-green-exception-no-production.md` |

Fetch only the routing file the machine returns for the active Step.

## Dispatch plan selection

Each dispatch gets exactly one immutable plan, selected before dispatch:

| Dispatch | Worker | Plan |
|---|---|---|
| `red` | RED | `test-authoring → red-verification` |
| `green` | GREEN | `implementation → green-verification` |
| `green-direct` | GREEN | `implementation → green-verification` |
| `green-exception` | RED | `test-authoring → green-verification` |

Selecting a plan for a later dispatch never changes an earlier one.

## Report validation

Validate each worker report against worker-common.md § Report contract. The coordinator never invents, reorders, or drops a field. Per dispatch kind:

| Dispatch | Field 3 `RED result` | Field 4 `GREEN result` |
|---|---|---|
| `red` | real value | `n/a` |
| `green` / `green-direct` | `n/a` | real value |
| `green-exception` (mode 5) | real value | `pass` |
| `green-exception` (mode 2) | `n/a` | `pass` |

A report without field 8 is malformed. Print exactly "Subagent report missing field 8 (Files modified). Cannot produce a reliable pre-commit report. Review the staged state manually before committing." and pause before proposing the commit message. In split-flow this check applies to each of the two reports; name the dispatch that omitted it. Field 8 never lists scratch paths. A missing or empty field 9 soft-degrades: it never makes the report malformed or blocks anything, and the Step simply records no telemetry rows.

## Appendices

Written in step 4 of the Step loop, only after the coordinator's verification passes. Both sections live at the end of `implementation.md` in this order, whichever was created first: `## Appendix: Plan vs Final Implementation`, then `## Appendix: Execution Telemetry`. Each section is created once, on its first entry; append below it thereafter and never create a second section.

### Plan vs Final Implementation

One block per field-5 deviation; a Step with none adds nothing:

```markdown
### Step N — <Short title of the deviation>

**Plan:** <What the plan originally said or required>
**Final:** <What was actually implemented>
**Reason:** <Why the change was necessary>
```

### Execution Telemetry

One table, one row per field-9 entry:

```markdown
| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
```

`Step` and `dispatch` come from the dispatch you issued, never from the report. `phase` is `red` or `green`. `attempts` counts verification runs and starts at `1`. `first_failure` is one of `assertion` / `setup` / `import` / `other` / `n/a`. `note` states what changed between attempts and is required only when `attempts` > `1`.

Checkbox marking here is per Step and batched, overriding the per-item discipline of `@sai/policies/remember.md` for apply only: the coordinator executes no item itself and receives a Step-level report (`docs/adr/0018-checkbox-override-scoped-to-apply-not-remember.md`). Functional checkboxes (legacy header `**Human (...)**`) are never marked here; they belong to the terminal functional review.

## Step commit gate

Every Step's `STOP & COMMIT` marker runs this gate, which overrides any "stage and commit" wording in the plan. The **add-list** is the Step's field-8 paths, the union of both reports in split-flow, scratch paths excluded.

1. **Visibility report.** Print it before proposing a message; it is never skipped. It previews the commit: build it from `git status` (tracked, untracked, deleted) and the add-list, and never read or change the index. In order:
   1. Header: change name, `Step N`, and one status letter: `OK`, `WARN`, `MISMATCH`, or `DEVIATION`.
   2. One status line explaining the letter.
   3. `Will be committed`: each add-list path with `+N -M` against `HEAD` (`git diff --stat HEAD -- <path>`); an untracked path counts all its lines as insertions; a claimed path with no change shows `+0 -0`. A rename is one line: `R  <new-path>  (renamed from <old-path>, +N -M)`.
   4. `Totals: <N> files, +<ins> -<del>` over the add-list.
   5. `Will NOT be committed`: working-tree paths outside the add-list. Omit the block when empty.
   6. `Plan cross-check`: `Missing` lists paths in the matching tasks.md Step's `**Files Affected**` with no change in `git status`; `Extra` lists changed paths not declared there. Match Steps by the integer `N`, not by `**Task ref:**`. Print `No deviations` when both are empty.
   7. `Subagent ↔ git`: paths in the add-list but not changed (`only-in-subagent:`) or changed but not in the add-list (`only-in-git:`); `In sync` when equal.

   No diff content, file contents, or tracebacks.
2. **Message.** Propose a message per `@sai/policies/commit-rules.md`, describing only the add-list.
3. **Authorization.** Ask `Ready to commit Step N. May I create commit with message: '<subject>'?` through commit-rules § Authorization gate. When `session_commit_authorized` is active, skip only this ask.
4. **Commit.** On authorization, `git add -- <add-list>` exactly (a declared removal stages the deletion), then `git commit`; report the SHA and subject. Never add a path from `git status` that is not in the add-list. On `no`, print "Commit not authorized. The changes are: <summary>. Run `git commit` yourself when ready."
5. **Continue.** Either way, go to step 6 of the Step loop.
