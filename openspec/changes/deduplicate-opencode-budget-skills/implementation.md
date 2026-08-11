# deduplicate-opencode-budget-skills

## Goal

Centralize the three OpenCode budget-skill behavior contracts behind their matching canonical policies while preserving harness-specific guidance and adding structural parity regression coverage.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do not assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment.
  2. Else whichever of `main` / `master` exists locally; if both exist, prefer `main`.
  3. If neither exists or there is no `origin`, treat the current branch as the resolved default branch.
- Present exactly three options in the user's input language (English fallback), in this fixed order:
  1. `Suggest branch "deduplicate-opencode-budget-skills"` — the change-name-derived branch (default).
  2. `Stay on current branch "the branch name returned by the detection command"` — use `detached HEAD` when applicable.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- When the selected branch does not already exist, present the two base-branch choices before creating it: `Base on default branch "the resolved default branch"` (default) and `Base on current branch "the detected branch name"`. Skip that prompt when staying on the current branch, when the target already exists, or when the current branch already equals the resolved default branch.
- Create a selected new branch from the chosen base before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Reconcile the executor capability contract

*(Non-testable step — documentation and capability specifications only; no observable browser behavior applies.)*

- [x] Preserve the proposal's `executor-opencode-skill` entry under `### Modified Capabilities` and its canonical Fetch boundary in `openspec/changes/deduplicate-opencode-budget-skills/proposal.md`.
- [x] Preserve the matching `## MODIFIED Requirements` entry in `openspec/changes/deduplicate-opencode-budget-skills/specs/opencode-budget-skill-contract-parity/spec.md`, including the exact requested-command/error raw-output boundary and prohibitions on unrequested full-file dumps and unfiltered log streams.
- [x] Replace the existing `### Requirement: Universal Behavior section inlined` body in `openspec/specs/executor-opencode-skill/spec.md` with the following complete requirement and scenario:

```markdown
### Requirement: Universal Behavior section inlined

The OpenCode executor skill SHALL consume the canonical executor behavior policy through exactly one `Fetch @sai/policies/executor-agent.md` directive. It SHALL NOT inline a `## Universal Behavior` section or duplicate the rules supplied by that policy. It SHALL retain `## OpenCode Binding`, `## Dispatch mode`, `## Model resolution`, and `## Cost model` as skill-local sections, including the lowercase `executor` binding, synchronous dispatch, agent-file model resolution, no tool-call cap, structured failure-report guidance, and the requested-command/error raw-output boundary. The local raw-output guidance SHALL prohibit unrequested full-file dumps and unfiltered log streams.

#### Scenario: Executor skill uses the canonical behavior boundary

- **WHEN** an agent reads `skills/opencode/budget-executor/SKILL.md`
- **THEN** it finds exactly one `Fetch @sai/policies/executor-agent.md` directive
- **AND** it finds no `## Universal Behavior` section
- **AND** it finds the OpenCode-specific binding, dispatch, model-resolution, cost, no-cap, structured-failure, and constrained raw-output guidance
```

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**

- [x] Run `node -e 'const fs=require("node:fs"); const proposal=fs.readFileSync("openspec/changes/deduplicate-opencode-budget-skills/proposal.md","utf8"); const delta=fs.readFileSync("openspec/changes/deduplicate-opencode-budget-skills/specs/opencode-budget-skill-contract-parity/spec.md","utf8"); const active=fs.readFileSync("openspec/specs/executor-opencode-skill/spec.md","utf8"); if(!/executor-opencode-skill/.test(proposal)||!/## MODIFIED Requirements[\s\S]*Universal Behavior section inlined/.test(delta)||!/exactly one `Fetch @sai\/policies\/executor-agent\.md` directive/.test(active)||/## Universal Behavior/.test(active)) throw new Error("executor capability contract is not reconciled");'` — expected: exit 0.
- [x] Run `node --check test/canonical-opencode-agent-behavior.test.js` — expected: the existing regression file parses successfully.

*(No Human checks — this step changes only Markdown capability documentation.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit the reconciled capability documentation after Automated checks pass. No browser verification is required.

#### Step 2: Centralize OpenCode budget-skill behavior references

*(Non-testable step — Markdown policy wiring and skill documentation only; no observable browser behavior applies.)*

- [x] Replace `skills/opencode/budget-subagent/SKILL.md` with the following complete content:

```markdown
---
name: budget-subagent
description: >
  Binds cost-controlled task delegation to the OpenCode `budget` agent keyword. Model resolved via the budget agent file's model frontmatter (installed under ~/.config/opencode/agents/budget.md) — not hardcoded in here. Use for general-purpose task delegation (file operations, searches, writes, code analysis).
  TRIGGER when: "budget subagent", "cheap subagent", "budget task", "cheap task", "budget mode", "cheap mode", "low-cost mode", "economy mode"
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Fetch @sai/policies/budget-agent.md

## OpenCode Binding

- **Agent keyword**: `budget` (lowercase)
- **Model resolution**: controlled by the `model` frontmatter of the budget agent file (`~/.config/opencode/agents/budget.md`) — not hardcoded in this file.
- **Tool-call cap**: none enforced by the harness; the fetched policy's approximately 30-call behavioral limit governs the task.
- **Raw output**: not allowed — the fetched policy owns the bounded completion-report output contract.

## Dispatch mode

The opencode `task` tool has no `run_in_background` parameter; this binding runs synchronously by default. The dispatch-safety invariant defined in `openspec/specs/dispatch-safety-invariant/spec.md` is the containing rule for this case.

## Cost model

This subagent runs on a commodity model. Its tier is controlled by the `model` frontmatter of the budget agent file (`~/.config/opencode/agents/budget.md`) — that setting is the only lever to change the cost of delegation.

**Why delegate:**
- **Cost:** Bulk I/O (reads, searches, writes, and code analysis) is processed at a cheaper per-token rate than the main agent's model.
- **Context hygiene:** The subagent starts with a clean context — no task instructions or conversation history — and returns only a structured summary, keeping the main agent's reasoning context uncontaminated.

**Scope boundaries:**
- Clear task boundaries enable effective subagent delegation and cost control: one task per spawn, a declared output contract, and the behavioral cap keep the delegation cheap and the report parseable.
- The fetched `budget-agent.md` policy remains the source for the structured completion report, permission-block abort, no-self-correction, and approximately 30-call behavior.
```

- [x] Replace `skills/opencode/budget-executor/SKILL.md` with the following complete content:

```markdown
---
name: budget-executor
description: >
  Binds "executor subagent" to the OpenCode executor agent keyword. Model resolved via the executor agent file's model frontmatter (installed under ~/.config/opencode/agents/executor.md) — not hardcoded in here. Enforces execute-only, minimal-output, structured-failure-report discipline.
  TRIGGER when: "use executor", "spawn executor", "run command subagent", "delegate execution", "execute in subagent", "run cheap executor"
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Fetch @sai/policies/executor-agent.md

## OpenCode Binding

- **Agent keyword**: `executor` (lowercase)
- **Model resolution**: controlled by the `model` frontmatter of the executor agent file (`~/.config/opencode/agents/executor.md`) — not hardcoded in this file.
- **Tool-call cap**: none.
- **Raw output**: allowed for results of explicitly requested commands and relevant error or compiler messages. It does not authorize unrequested full-file dumps or unfiltered log streams.
- **Failure reporting**: the fetched policy supplies the structured failure report with exit code, one-line reason, applicable file and line locations, and test/build tallies when relevant.

## Dispatch mode

The opencode `task` tool has no `run_in_background` parameter; this binding runs synchronously by default. The dispatch-safety invariant defined in `openspec/specs/dispatch-safety-invariant/spec.md` is the containing rule for this case.

## Model resolution

The model for `executor` subagents is controlled by the `model` frontmatter of the executor agent file (`~/.config/opencode/agents/executor.md`), seeded by the installer under the `tunable-seed` lifecycle. This file contains no hardcoded model identifier.

## Cost model

This subagent runs on a commodity model. Its tier is controlled by the `model` frontmatter of the executor agent file (`~/.config/opencode/agents/executor.md`) — that setting is the only lever to change the cost of delegation.

**Why delegate:**
- **Cost:** Bulk execution output and command-running work are processed at a cheaper per-token rate than the main agent's model.
- **Context hygiene:** The subagent starts with a clean context — no task instructions or conversation history — and returns bounded execution results, keeping the main agent's reasoning context uncontaminated.

**Execution overhead:**
- Delegation reduces main-agent context pollution when running long-running or resource-intensive operations; the subagent absorbs the requested command output while retaining the policy's execute-only and failure-report boundaries.
```

- [x] Replace `skills/opencode/budget-explorer/SKILL.md` with the following complete content:

```markdown
---
name: budget-explorer
description: >
  Binds cheap research subagent to the opencode explore agent keyword. Model resolved via the explore agent file's model frontmatter (installed under ~/.config/opencode/agents/explore.md) — not hardcoded in here.
  TRIGGER when: "use explorer", "use cheap subagent", "delegate research", "run cheap subagent", "spawn explore subagent", "cheap research agent", "use explore agent", "delegate lookup"
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Fetch @sai/policies/explore-agent.md

## Subagent binding

"cheap research subagent" → `explore` (lowercase) when invoked as an OpenCode agent keyword.

Callers must declare an output contract in every spawn prompt with exact response fields, a hard word-or-line length cap, and an explicit no raw file contents rule; the fetched `explore-agent.md` policy supplies the effective output-contract behavior.

## Dispatch mode

The opencode `task` tool has no `run_in_background` parameter; this binding runs synchronously by default. The dispatch-safety invariant defined in `openspec/specs/dispatch-safety-invariant/spec.md` is the containing rule for this case.

## Model resolution

The model for `explore` subagents is controlled by the `model` frontmatter of the explore agent file (`~/.config/opencode/agents/explore.md`), seeded by the installer under the `tunable-seed` lifecycle. This file contains no hardcoded model identifier.

## Cost model

This subagent runs on a commodity model. Its tier is controlled by the `model` frontmatter of the explore agent file (`~/.config/opencode/agents/explore.md`) — that setting is the only lever to change the cost of delegation.

**Why delegate:**
- **Cost:** Bulk I/O (reads, searches, and documentation lookup) is processed at a cheaper per-token rate than the main agent's model.
- **Context hygiene:** The subagent starts with a clean context — no task instructions or conversation history — and returns only a structured summary, keeping the main agent's reasoning context uncontaminated.

**When to use:**
- Use `explore` for read-only lookups, searches, and documentation reads that fit the caller-declared output contract. Reserve synthesis and judgment for the main agent.

## Tool-call caps

Per-spawn cap for `explore` subagents: ≤30 tool calls. If a task exceeds the cap, spawn an additional subagent rather than raising the cap.
```

- [x] Keep the exact matching Fetch targets, lowercase OpenCode keywords, synchronous dispatch wording, agent-file model-resolution wording, and no hardcoded model identifiers in all three skills.
- [x] Keep the executor's requested-command/error raw-output allowance while explicitly prohibiting unrequested full-file dumps and unfiltered logs; keep the explorer's caller-declared output-contract marker while removing its copied `## Output contract` rule block.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**

- [x] Run `node --test test/canonical-opencode-agent-behavior.test.js` — expected: all existing canonical-policy and generic-agent tests pass.
- [x] Run `node -e 'const fs=require("node:fs"); const expected={"budget-subagent":["@sai/policies/budget-agent.md","## OpenCode Binding"],"budget-executor":["@sai/policies/executor-agent.md","## OpenCode Binding"],"budget-explorer":["@sai/policies/explore-agent.md","## Subagent binding"]}; for(const [name,[target,heading]] of Object.entries(expected)){const text=fs.readFileSync("skills/opencode/"+name+"/SKILL.md","utf8"); const fetches=text.split(/\r?\n/).map(line=>line.trim()).filter(line=>/^Fetch @sai\/policies\/[^ ]+$/.test(line)); if(fetches.length!==1||fetches[0]!=="Fetch "+target||!text.includes(heading)||/native OpenCode import/i.test(text)||/^## Universal Behavior$/m.test(text)||(name==="budget-explorer"&&/^## Output contract$/m.test(text))) throw new Error(name+" does not satisfy the centralized skill boundary");}'` — expected: exit 0.

*(No Human checks — this step changes only Markdown skill documents.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit the centralized skill documents after Automated checks pass. No browser verification is required.

#### Step 3: Add skill-agent parity regression coverage

*(Non-testable step — this adds structural regression assertions for documentation contracts and has no observable browser behavior.)*

- [ ] Append the following complete table-driven regression block to `test/canonical-opencode-agent-behavior.test.js` after the existing tests:

```javascript
const OPENCODE_BUDGET_SKILL_CONTRACTS = [
  {
    skillName: 'budget-subagent',
    agentName: 'budget',
    fetchTarget: '@sai/policies/budget-agent.md',
    forbidden: [/^## Universal Behavior$/m],
    markers: [
      /`budget` \(lowercase\)[\s\S]{0,100}keyword/i,
      /synchronously/i,
      /model frontmatter of the budget agent file/i,
      /structured completion report/i,
      /permission-block abort/i,
      /approximately 30-call behavioral limit/i,
      /scope boundaries/i,
      /## Cost model/i,
    ],
  },
  {
    skillName: 'budget-executor',
    agentName: 'executor',
    fetchTarget: '@sai/policies/executor-agent.md',
    forbidden: [/^## Universal Behavior$/m],
    markers: [
      /`executor` \(lowercase\)[\s\S]{0,100}keyword/i,
      /synchronously/i,
      /model frontmatter of the executor agent file/i,
      /no tool-call cap/i,
      /structured failure report/i,
      /results of explicitly requested commands and relevant error or compiler messages/i,
      /unrequested full-file dumps/i,
      /unfiltered log streams/i,
      /## Cost model/i,
    ],
  },
  {
    skillName: 'budget-explorer',
    agentName: 'explore',
    fetchTarget: '@sai/policies/explore-agent.md',
    forbidden: [/^## Output contract$/m, /Every subagent spawn MUST declare/i],
    markers: [
      /`explore` \(lowercase\)[\s\S]{0,100}keyword/i,
      /synchronously/i,
      /model frontmatter of the explore agent file/i,
      /30 tool calls/i,
      /output contract/i,
      /explore-agent\.md/i,
      /## Cost model/i,
    ],
  },
];

function extractSkillFetchTargets(content) {
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^Fetch @sai\/policies\/(?:budget|executor|explore)-agent\.md$/.test(line));
}

test('OpenCode budget skills match their generic-agent policy targets and local contracts', () => {
  for (const contract of OPENCODE_BUDGET_SKILL_CONTRACTS) {
    const skillPath = path.join(REPO_ROOT, 'skills', 'opencode', contract.skillName, 'SKILL.md');
    const agentPath = path.join(REPO_ROOT, 'agents', 'opencode', `${contract.agentName}.md`);
    const skill = fs.readFileSync(skillPath, 'utf8');
    const agent = fs.readFileSync(agentPath, 'utf8');
    const skillTargets = extractSkillFetchTargets(skill);
    const agentTargets = extractSkillFetchTargets(agent);

    assert.deepEqual(skillTargets, [`Fetch ${contract.fetchTarget}`],
      `${contract.skillName} must contain exactly one matching canonical Fetch target`);
    assert.deepEqual(agentTargets, [`Fetch ${contract.fetchTarget}`],
      `${contract.agentName} must contain exactly one matching canonical Fetch target`);
    assert.doesNotMatch(skill,
      /(?:import|require)\s+(?:[^\n]*\b)?(?:open\s*code|opencode)\b|from\s+['"](?:open\s*code|opencode)/i,
      `${contract.skillName} must not use a native OpenCode policy import`);

    for (const forbidden of contract.forbidden) {
      assert.doesNotMatch(skill, forbidden,
        `${contract.skillName} must not retain policy-owned duplicated behavior`);
    }
    for (const marker of contract.markers) {
      assert.match(skill, marker,
        `${contract.skillName} must retain its skill-specific OpenCode contract marker ${marker}`);
    }
  }
});
```

- [ ] Run `node --test test/canonical-opencode-agent-behavior.test.js` — expected: the focused suite passes, including the new three-pair parity assertions.
- [ ] Run `npm test` sequentially after the focused run — expected: the final summary reports `fail 0` and the `pass` count equals the `tests` count.

*(No Human checks — regression coverage validates Markdown and installer-facing contracts through automated tests.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit the parity regression coverage after Automated checks pass. No browser verification is required.

## Appendix: Plan vs Final Implementation

This section documents deviations between the original plan and the code that was actually merged.

### Step 1 — Verification checklist condition 4 cannot pass with the plan's own required content

**Plan:** Step 1's automated `node -e` check required `/## Universal Behavior/.test(active)` to be falsy — the active executor spec must not contain the literal `## Universal Behavior` string anywhere.
**Final:** The check was evaluated by its intended meaning. The plan's own replacement content itself contains the backtick-quoted literal `` `## Universal Behavior` `` in two places (the requirement paragraph and the scenario's AND line), so the raw substring condition can never pass after a correct application. The executor spec contains no actual `## Universal Behavior` heading section, only the required backtick-quoted references. The user approved this interpretation; condition 4 was treated as satisfied.
**Reason:** The plan's verification command is self-contradictory with its own required content. The file was reconciled byte-for-byte to the plan's replacement block and all other conditions passed.

### Step 2 — Step-execution dispatch used the general agent binding instead of budget

**Plan:** The apply pipeline dispatches Step-execution subagents through the `budget-subagent` binding.
**Final:** Step 2 was dispatched through the opencode `general` agent after three consecutive budget-binding dispatches reported they could not perform full-file writes ("Required full-file Write operation could not be performed; only prohibited patch tooling is available").
**Reason:** The budget binding is write-incapable for whole-file overwrites in this environment. The general binding completed the replacement; the resulting skill files match the plan's content exactly (verified by the focused suite and the structure check).

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | single | green | 1 | other | PowerShell mangled the node -e quoting on the first attempt; coordinator re-ran the check via a script file and it passed |
| 2 | single | green | 1 | n/a | |
