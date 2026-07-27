# Introduce a Design Coordinator and Worker

## Goal

Route Claude Code and opencode `/sai-2-design` through an I/O-free coordinator and resumable design-planning worker while preserving Copilot's inline path, all design artifacts, feedback behavior, and Continue-now implementation handoff.

## Prerequisites

- [x] Run `git rev-parse --abbrev-ref HEAD`; if it returns no branch, record `detached HEAD`.
- [x] Resolve the default branch in order: `git symbolic-ref --quiet refs/remotes/origin/HEAD`; otherwise test local `main` then `master` with `git show-ref --verify --quiet refs/heads/<name>` (prefer `main` when both exist); otherwise use the current branch.
- [x] Present these options in order through the native picker: `Suggest branch "introduce-design-coordinator-worker"`, `Stay on current branch "<current branch>"`, `Enter branch name manually`.
- [x] If the selected branch is new and the current branch differs from the default branch, ask whether to base it on the resolved default or current branch, in that order. Skip this question when staying on the current branch, the target already exists, or current equals default.
- [x] Create the selected new branch from the chosen base before changing files. Never hardcode `main`.

### Step-by-Step Instructions

#### Step 1: Build and prove inactive design coordinator-worker infrastructure

*(Testable Node.js installer and lifecycle infrastructure; use RED -> GREEN.)*

##### RED phase

- [x] Create `test/design-coordinator-worker.test.js` using `node:test`, `node:assert/strict`, `fs`, `os`, `path`, and `jsonc-parser`, following `test/implement-coordinator-worker.test.js`. Cover every Step 1 assertion in `interfaces.md`, including:
  - caller-neutral core versus inline completion ownership;
  - exact four-status payload plus the separate `DesignNotice` shape;
  - prerequisite-before-notice ordering and all pinned prerequisite/picker outcomes;
  - `continue_after_notice` through Claude `SendMessage` and opencode `task_id`, excluded from opaque history;
  - coordinator I/O denial and worker-only artifact/research ownership;
  - exact Claude agent tools/model/effort and both binding continuation/fallback paths;
  - exact opencode coordinator/worker shapes and task permissions;
  - absent, compatible user-owned, incompatible, owned-unchanged, and owned-modified installation/uninstall cases;
  - doctor inventory, collision, fetch-resolution, version-skew, changed-file union, reconstruction, and fresh implementation namespace behavior.
- [x] Keep every RED assertion based on file content or exported installer behavior so missing design assets fail through `AssertionError`, not import, syntax, or setup errors.
- [x] Verify RED with `node --test test/design-coordinator-worker.test.js`; expected: non-zero with an assertion identifying a missing design coordinator-worker asset.
- [x] **GATE - DO NOT PROCEED to GREEN until RED is an assertion failure caused by the absent design infrastructure.**

##### GREEN phase (only after RED is verified)

- [x] Create `sai/instructions/design-invocation-core.md` with this complete caller-neutral body:

```markdown
# Design invocation core

Shared technical design invocation used by the inline caller and the design-planning worker. This file owns no prerequisite parsing, change selection, fast-track banner presentation, or terminal navigation message.

## Load behaviors (in order)
Fetch @skills/budget/SKILL.md and use it

## Load instructions (in order)
Fetch @sai/instructions/glossary-format.md
Fetch @sai/instructions/sai-learnings-format.md
Fetch @sai/instructions/design.md and follow those instructions exactly.
Fetch @sai/instructions/remember.md

## Run
**User's request:** $ARGUMENTS
```

- [x] Create `sai/commands/sai-2-design-inline.md` by moving the current inline prerequisite, fast-track parse, change-picker, approval/generation, artifact-derived summary, feedback loop, and Stop/Continue behavior from `sai/commands/sai-2-design.md` without semantic changes. Replace its direct glossary/learnings/design/remember sequence with `Fetch @sai/instructions/design-invocation-core.md and follow it exactly.` Retain the pinned Isolation Mode block byte-for-byte and retain Continue-now's fetch of `implement-invocation.md`.
- [x] Before replacing the shared command, change all three design wrappers to fetch `@sai/commands/sai-2-design-inline.md`. Preserve their current model/tool frontmatter and preserve opencode's exact `**Change-name argument and and optional flags:** $ARGUMENTS` line. Run `node --test test/design-coordinator-worker.test.js` and confirm the wrapper-selection assertions show all three still inline.
- [x] Replace `sai/commands/sai-2-design.md` with the routed coordinator contract below. Keep the pinned Isolation Mode block byte-for-byte at the top.

```markdown
# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Coordinator boundary
  You are the user-facing design coordinator. Do not run prerequisites, parse arguments or fast-track, query OpenSpec, resolve a change, read git, code, configuration, documentation, change artifacts, or design artifacts, and do not write any file or make technical design decisions. Technical work belongs exclusively to the design-planning worker.

  ## Invocation envelope
  Construct exactly two strings: `wrapper_echo_value` is the value after the exact opencode line `**Change-name argument and and optional flags:** <value>` or empty; `arguments_value` is `$ARGUMENTS` exactly as received. Do not resolve conflicts or strip flags.

  ## Design lifecycle state
  Initialize an ordered duplicate-free changed-file union, empty opaque input history, empty pending feedback, `fast_track_banner_emitted: false`, and feedback iteration `0`. Keep all state in this invocation only.

  ## Dispatch and validation
  Dispatch exactly one worker through the active design-worker binding with the original envelope. Validate either a terminal payload (`completed|needs_input|failed|cancelled`) or a design notice containing exactly `event: notice`, `message`, and `changed_files`. Binding-owned continuation metadata is never worker output. Add every reported path to the ordered union once.

  ## Result loop
  - Notice: print `message` exactly, set `fast_track_banner_emitted: true`, and continue the same worker with exactly `continue_after_notice`. Do not add this acknowledgement to opaque input history, user answers, or pending feedback.
  - `needs_input`: present the exact question and ordered options through the native picker. Append only `{question, options, answer_value}` to opaque history, forward the exact value through the binding, and process the next result through this loop.
  - Continuation failure: preserve all state and dispatch one fresh design worker with the original envelope, exact opaque history, exact pending feedback when present, `fast_track_banner_emitted`, and an independent durable-artifact reconstruction instruction. If any required reconstruction value is unavailable, stop with a restart request.
  - `failed` or `cancelled`: print the worker summary and accumulated changed files, then stop.
  - `completed`: require `resolved_change_name`, print the worker summary and accumulated changed files, then present the shared artifact-feedback gate for exactly `design.md`, `tasks.md`, and `interfaces.md`.

  ## Artifact feedback
  Present the shared gate's feedback option first, recommended only while iteration is zero. Retain exact free-form feedback as `pending_feedback`, continue the same worker, report every worker-authored discard, clear pending feedback only after verified completion, increment iteration, print the returned artifact-derived summary, and re-present the gate. Never inspect or edit artifacts.

  ## Navigation
  After Continue, ask Stop for new chat (recommended) or Continue now. Stop emits the existing exact design completion sentence. Continue now copies only `resolved_change_name`, clears all design lifecycle state, and starts the existing implementation-worker binding with `{wrapper_echo_value: "", arguments_value: resolved_change_name}` in a fresh result-loop namespace. Stop after implementation planning's existing completion message.

</TASK>

Follow instruction on <TASK> step by step
```

- [x] Create `sai/instructions/design-worker.md` as the technical lifecycle adapter. It must define, in this order: the exact two-field invocation envelope; ordered changed-file tracking; universal prerequisites before fast-track parsing; wrapper-echo precedence; discrete flag stripping; `continue_after_notice`; exact zero/one/many picker outcomes; source artifact checks; approval/amendment handling; invocation-core fetch; mandatory budget-explorer source delegation; Open Questions; direct writes and disk verification for all three artifacts; worker-owned feedback; design-only reconstruction metadata; `resolved_change_name`; and metadata-only notice/terminal output. Copy the exact prerequisite messages and picker questions from `specs/design-planning-worker/spec.md`, and explicitly leave implementation-worker fallback unchanged.
- [x] Create `agents/claude/sai-design-planning-worker.md` with this complete shape:

```markdown
---
name: sai-design-planning-worker
description: Owns the complete technical design phase and returns structured lifecycle metadata.
model: claude-opus-4-8
effort: high
tools: Read, Glob, Grep, Bash, Edit, Write, Agent, Skill, SendMessage
---

Fetch @skills/fetch/SKILL.md and follow those instructions.
Fetch @skills/budget-explorer/SKILL.md and use it.
Fetch @sai/instructions/design-worker.md and follow it exactly.
```

- [x] Create `skills/claude/sai-design-planning-worker/SKILL.md`. Mirror the implementation binding's Dispatch/Continue/Recovery sections, substituting `sai-design-planning-worker`; add Notice continuation using `SendMessage(to: "<captured agent ID>", message: "continue_after_notice")`; recovery must forward the original envelope, exact opaque history, exact pending feedback, and banner flag; permit only the mandatory budget-explorer nested branch.
- [x] Create `skills/opencode/sai-design-planning-worker/SKILL.md`. Mirror the implementation binding with `task(subagent_type: "sai-design-planning-worker", ...)`; add Notice continuation using `task(task_id: "<captured task ID>", prompt: "continue_after_notice")`; use the same design reconstruction fields; state that the worker may dispatch only `explore`.
- [x] Extend `configs/opencode.jsonc` and `OPENCODE_MANAGED_AGENTS` in `bin/install-flow.js` with these exact entries:

```json
"sai-design-coordinator": {
  "mode": "primary",
  "model": "opencode-go/glm-5.2",
  "variant": "high",
  "permission": {
    "task": {
      "*": "deny",
      "sai-design-planning-worker": "allow",
      "sai-implementation-planning-worker": "allow"
    },
    "question": "allow"
  }
},
"sai-design-planning-worker": {
  "mode": "subagent",
  "model": "opencode-go/glm-5.2",
  "variant": "high",
  "permission": {
    "task": { "*": "deny", "explore": "allow" }
  }
}
```

- [x] Generalize Claude managed-worker installation without changing implementation-worker behavior: add `CLAUDE_DESIGN_WORKER_AGENT = 'sai-design-planning-worker.md'` and `CLAUDE_DESIGN_WORKER_OWNER = '.sai-design-planning-worker.owner.json'`; extract the existing hash/collision algorithm into `installClaudeManagedWorker(targetPath, agentName, ownerName)`; call it for both workers; copy both binding skills; export the new constants/helper. Exact-compatible files return reused status without a new sidecar; incompatible content throws rename-or-remove guidance before partial managed installation.
- [x] Extend `bin/uninstall-flow.js`: include both design binding skills; enumerate both Claude agent/owner pairs as `claude-managed-agent`; keep opencode config excluded; delete an owned agent only when its own sidecar hash matches; preserve modified/user-owned agents and remove stale owner metadata only under the existing guarded policy.
- [x] Extend `bin/doctor.js`: replace the implementation-only Claude worker record with iteration over both managed worker descriptors; report each missing/incompatible design worker independently; continue deriving opencode compatibility from all `OPENCODE_MANAGED_AGENTS`; preserve current JSON/human report shapes.
- [x] Update `test/install-claude.test.js`, `test/install-opencode.test.js`, `test/uninstall-plan.test.js`, `test/uninstall-enumeration.test.js`, `test/uninstall-execution.test.js`, `test/doctor-harness-inventory.test.js`, `test/doctor-version-skew.test.js`, `test/doctor-fetch-resolution.test.js`, and `test/doctor-cli.test.js` so their expected inventories include the new body, instruction, two skills, Claude agent/owner pair, and opencode entries. Add explicit tests for compatible non-adoption, incompatible atomic collision, stale owner preservation, config comment preservation, and idempotent merge.
- [x] Create ADRs 0078-0080 using the existing `# ADR NNNN`, Status, Context, Decision, Alternatives Considered, Consequences, Related structure:
  - `0078-design-workflow-selects-routed-or-inline-entry.md`: wrapper-selected routed Claude/opencode versus inline Copilot; `<!-- adr-index: refs 0074; refs 0035 -->`.
  - `0079-design-worker-notices-and-reconstruction-metadata.md`: design-only nonterminal notice, fixed acknowledgement, opaque input history, pending feedback, and implementation contract isolation; `<!-- adr-index: refs 0075; refs 0076 -->`.
  - `0080-design-to-implementation-lifecycle-boundary.md`: Continue-now copies only resolved name into a fresh implementation envelope; `<!-- adr-index: refs 0075; refs 0076 -->`.
- [x] Warm-splice all three ADRs into `docs/adr/0000-INDEX.md`: add each under `/sai-2-design`; add 0078 under `Harness portability & mirror discipline`, 0079 under `Subagent dispatch & report contract`, and 0080 under `Argument passing & change-name resolution`. Use exact H1 titles and `Refs` annotations; do not recompute categories or touch correction/superseded sections.
- [x] Verify GREEN with `node --test test/design-coordinator-worker.test.js test/install-claude.test.js test/install-opencode.test.js test/uninstall-plan.test.js test/uninstall-enumeration.test.js test/uninstall-execution.test.js test/doctor-harness-inventory.test.js test/doctor-version-skew.test.js test/doctor-fetch-resolution.test.js test/doctor-cli.test.js`; expected: PASS.
- [x] Run `npm test`; expected: all tests pass with all three wrappers still selecting the inline design entry.
- [x] Run the pre-activation Claude Code smoke directly against the installed design binding: worker dispatch, nested budget-explorer research, `needs_input`, `continue_after_notice`, user-answer continuation, changed-file union, stale-ID reconstruction, pending feedback, and explicit implementation-worker handoff must all pass.
- [x] Run the equivalent opencode probe under restrictive top-level permissions: verify GLM 5.2 `variant: high` for both design agents, coordinator access only to both named workers and `question`, worker access only to `explore`, task-ID continuation, fixed notice acknowledgement, reconstruction, and implementation handoff. Any failure blocks Step 2.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED was an assertion failure attributable to missing design infrastructure.
- [x] Targeted GREEN command passes.
- [x] `npm test` passes.
- [x] `openspec validate introduce-design-coordinator-worker --strict` passes.
- [x] Installed temporary Claude/opencode artifacts parse and exactly match managed source shapes.

*(No browser Human checks - prompt infrastructure has no browser-rendered behavior. The required harness probes are explicit activation-gate actions above.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Do not proceed until both live harness probes and every automated check pass.

**STOP & COMMIT:** Stage only Step 1 files and commit after all checks and activation gates pass.

#### Step 2: Activate routed design and adapt the shared feedback gate

*(Instruction/config activation step; no RED/GREEN block because it changes prompt routing rather than executable application logic.)*

- [x] Update `commands/claude/sai-2-design.md`: keep `model: claude-opus-4-8`, add `effort: low` and `allowed-tools: Skill, Agent, SendMessage, AskUserQuestion`; load fetch, `sai-design-planning-worker`, the existing `sai-implementation-planning-worker`, then routed `sai-2-design.md`. Remove inline approval wording from the description.
- [x] Update `commands/opencode/sai-2-design.md`: remove `model`; add `agent: sai-design-coordinator` and `subtask: false`; load fetch, both planning-worker binding skills, then routed `sai-2-design.md`; retain the legacy echo line byte-for-byte.
- [x] Keep `commands/copilot/sai-2-design.prompt.md` on its current model/tools but point it explicitly to `sai-2-design-inline.md`; do not load routed bindings.
- [x] Add a `Routed design ownership adapter` section to `sai/instructions/artifact-feedback-gate.md`. State that sai-1 and inline Copilot retain all existing inline behavior; for routed sai-2, the coordinator owns picker presentation/counter/pending raw feedback while the worker owns item judgment, design-artifact edits, verification, discard reasons, and summary. Keep the canonical labels, descriptions, ordering, counter transitions, artifact sets, and proceed semantics single-sourced in their existing sections.
- [x] Extend `test/design-coordinator-worker.test.js` and relevant install tests to assert exact routed wrapper fields, no opencode model override, high-variant config selection, both binding fetches, Copilot inline selection, the exact echo adapter, shared-gate ownership split, and absence of coordinator technical I/O.
- [x] Run `node --test test/design-coordinator-worker.test.js test/install-claude.test.js test/install-opencode.test.js`; expected: PASS.
- [x] Run `npm test`; expected: PASS.
- [x] Repeat the activated Claude Code and opencode end-to-end smokes. Confirm exactly one banner, exact `continue_after_notice`, same-worker continuation, feedback iteration behavior, complete changed-file reporting, and a fresh implementation namespace. Smoke success must come from live harness behavior, not prompt-text assertions.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] Targeted wrapper/feedback tests pass.
- [x] `npm test` passes.
- [x] `openspec validate introduce-design-coordinator-worker --strict` passes.
- [x] Harness-name diff scan confirms Claude Code, opencode, and GitHub Copilot are all addressed.

*(No browser Human checks - this step activates command routing and is verified through harness smokes.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all checks and both activated harness smokes before stopping.

**STOP & COMMIT:** Stage only Step 2 files and commit after routing parity is verified.

#### Step 3: Document the active compatibility boundary

*(Documentation-only step; no RED/GREEN block.)*

- [x] Update `README.md` so `/sai-2-design` mirrors the implementation coordinator section: Claude Code low/high Opus roles, opencode GLM 5.2 high coordinator/worker roles, fixed notice acknowledgement and continuation, Copilot inline portability boundary, unchanged artifacts, and Proposal Complexity remaining descriptive. Correct model tables and customization prose so routed opencode wrappers are customized through named agent config rather than a command `model` field.
- [x] Update `AGENTS.md` repository maps and conventions with `sai-2-design-inline.md`, `design-invocation-core.md`, `design-worker.md`, the Claude design agent, both design binding skills, routed ownership, Continue-now fresh namespace, and Copilot adapter carve-out.
- [x] Update `INSTALL.claude.md` with both design skill/agent copy commands, `.sai-design-planning-worker.owner.json`, collision/non-adoption/guarded-uninstall behavior, coordinator low effort, worker high effort, and restart/reinstall guidance.
- [x] Update `INSTALL.opencode.md` with both design entries and both design/implementation binding skill copies; document modes, GLM 5.2 `variant: high`, permissions, wrapper `agent`/`subtask` fields, absent `model`, collision preservation, config exclusion on uninstall, and restart requirement.
- [x] Update `INSTALL.copilot.md` to state that design remains inline because no portable cross-turn continuation contract spans supported surfaces; explicitly preserve its budget-explorer delegation and avoid claiming missing subagent support.
- [x] Extend documentation assertions in `test/design-coordinator-worker.test.js` for every named harness, managed path, model/variant, ownership rule, artifact path, and Stop/Continue semantic.
- [x] Run `node --test test/design-coordinator-worker.test.js`; expected: PASS.
- [x] Run `npm test`; expected: PASS.

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [x] Documentation assertions pass.
- [x] `npm test` passes.
- [x] `openspec validate introduce-design-coordinator-worker --strict` passes.
- [x] Markdown links and every documented source/destination path resolve.

*(No browser Human checks - documentation has no browser application behavior.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all automated checks before stopping.

**STOP & COMMIT:** Stage only Step 3 files and commit after documentation matches the activated surfaces.

## Appendix: Plan vs Final Implementation

This section documents deviations between the original plan and the code that was actually merged.

### Step 1 — Correct inactive-boundary test expectations

**Plan:** Keep all three design wrappers on the explicit inline entry while the coordinator-worker infrastructure remains inactive.

**Final:** Updated the new coordinator tests and canonical design specs to assert the explicit inline entry and the intended inactive lifecycle semantics.

**Reason:** The initial RED fixtures contained intentionally contradictory stub requirements and one stale assertion expected the old shared command path.

### Step 1 — Repair legacy opencode configuration merge

**Plan:** Add the design coordinator and planning-worker entries while preserving existing user configuration, comments, and idempotent merge behavior.

**Final:** Removed the legacy three-agent placeholder early return and added regression coverage for migration, comment preservation, notices, and idempotence.

**Reason:** The live temporary opencode probe exposed that the early return prevented managed entries from being added to an existing legacy placeholder configuration.

### Step 1 — Align Continue-now handoff assertion

**Plan:** Continue now starts the existing implementation-worker binding with a fresh envelope containing only the resolved change name.

**Final:** Updated the lifecycle test to assert the binding handoff and envelope instead of a direct `implement-invocation.md` fetch from the routed coordinator.

**Reason:** The routed coordinator owns lifecycle navigation; implementation invocation content remains owned by the implementation-worker binding.

### Step 2 — Accept authenticated smoke result

**Plan:** Activated Claude Code and opencode end-to-end smokes must be run and pass before Step 2 completion.

**Final:** Automated Step 2 verification passed in an isolated copy; the user directed the coordinator to accept the activated smoke gate after the Claude subagent exhausted its token budget.

**Reason:** The remaining live smoke result was unavailable in the execution subagent, while the user explicitly authorized proceeding as if it had passed.

### Step 3 — Exclude user-owned implementation model change

**Plan:** The complete test suite passes after documentation updates.

**Final:** Documentation tests and strict validation pass; the full suite is accepted against the intended committed version while the working-tree `model: opus` change in `commands/claude/sai-3-implement.md` remains excluded.

**Reason:** The user is managing that implementation-wrapper model change in a separate commit.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | writer | red | 1 | assertion | |
