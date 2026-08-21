# single-source-design-artifact-contracts

## Goal

Make `sai/commands/design/instructions.md` the sole write-time authority for design, tasks, and interfaces formatting contracts by reducing schema `instruction:` blocks to authority pointers, reducing the three templates to heading-preserving skeletons, removing the dead Endpoint Map surface, and retargeting semantic contract tests to the command instruction.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "single-source-design-artifact-contracts"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
  Record the chosen base. **Skip this prompt entirely** (surface no base choice) when any of these holds: option 2 (stay on current branch) was chosen; the selected target branch already exists; or the current branch already equals the resolved default branch — in that last case create the new branch from the default branch without prompting.
- If the selected branch does not exist, create it from the chosen base branch — the resolved default branch or the current branch as determined by the base prompt (or the default branch directly when the prompt was skipped because the current branch already equals the default) — before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Retarget semantic design-contract tests to the command instruction

*(Non-testable step — test-suite retarget only. Production schema/templates stay full; new assertions already hold on `sai/commands/design/instructions.md`, so there is no failing RED against production code. Steps 2–3 own the failing pointer/skeleton oracles.)*

- [x] In `test/change-overview-contract.test.js`, replace the test `sentinel emitted when no step admits a contract` so the semantic sentinel is asserted **only** against `sai/commands/design/instructions.md` (remove `schema.yaml` and `templates/interfaces.md` from the semantic loop):

```js
test('sentinel emitted when no step admits a contract', () => {
  const instruction = artifact('sai/commands/design/instructions.md');

  assert.match(instruction, /None — no step contracts/,
    'the command instruction should define the exact None — no step contracts sentinel');
});
```

- [x] In the same file, replace `Target State present in design surfaces, absent from interfaces template` so semantic Target State ownership is asserted on the command instruction only, while the design template keeps a **structural** first-heading check and the interfaces template keeps absence checks:

```js
test('Target State present in design surfaces, absent from interfaces template', () => {
  const instruction = artifact('sai/commands/design/instructions.md');
  const designTemplate = artifact('openspec/schemas/sai-workflow/templates/design.md');
  const interfacesTemplate = artifact('openspec/schemas/sai-workflow/templates/interfaces.md');

  assert.match(instruction, /## Target State/);
  assert.match(instruction, /### Architecture Snapshot/);
  assert.match(instruction, /### File Manifest/);

  const firstTopLevel = designTemplate.search(/^## /m);
  assert.ok(firstTopLevel !== -1, 'design template should have a top-level heading');
  assert.match(designTemplate.slice(firstTopLevel), /^## Target State/,
    'design template should begin with ## Target State');

  assert.doesNotMatch(interfacesTemplate, /## Target State/);
  assert.doesNotMatch(interfacesTemplate, /### Architecture Snapshot/);
  assert.doesNotMatch(interfacesTemplate, /### File Manifest/);
});
```

- [x] Keep `Target State is the first section of design.md` as a **structural** design-template heading-order check (Target State → Architecture Snapshot → File Manifest → Context). Do not require schema instruction prose for those headings.

- [x] In `test/design-coordinator-worker.test.js`, replace `Target State contract lives in the design instruction, schema, and design template` so semantic Architecture Snapshot / File Manifest / Target State-before-Context rules are asserted on the command instruction only; keep structural template heading checks and interfaces absence checks; stop requiring schema bodies to carry those semantic rules:

```js
test('Target State contract lives in the design instruction; templates keep structural markers', () => {
  const instruction = artifact('sai/commands/design/instructions.md');
  const designTemplate = artifact('openspec/schemas/sai-workflow/templates/design.md');
  const interfacesTemplate = artifact('openspec/schemas/sai-workflow/templates/interfaces.md');

  assert.match(instruction, /### Architecture Snapshot/);
  assert.match(instruction, /### File Manifest/);

  const targetStateIndex = instruction.indexOf('## Target State');
  const contextIndex = instruction.indexOf('## Context');
  assert.ok(targetStateIndex !== -1, 'design instruction should contain ## Target State');
  assert.ok(contextIndex !== -1, 'design instruction should contain ## Context');
  assert.ok(targetStateIndex < contextIndex,
    '## Target State should be placed before other top-level design sections in the instruction');

  for (const marker of ['## Target State', '### Architecture Snapshot', '### File Manifest', '## Context']) {
    assert.match(designTemplate, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `design template should retain structural marker ${marker}`);
  }
  const templateTarget = designTemplate.indexOf('## Target State');
  const templateContext = designTemplate.indexOf('## Context');
  assert.ok(templateTarget !== -1 && templateContext !== -1 && templateTarget < templateContext,
    'design template should keep ## Target State before ## Context');

  assert.doesNotMatch(interfacesTemplate, /## Target State/);
  assert.doesNotMatch(interfacesTemplate, /### Architecture Snapshot/);
  assert.doesNotMatch(interfacesTemplate, /### File Manifest/);
});
```

- [ ] Leave `architecture snapshot display compares the extracted Target State block and defines the no-step-contracts sentinel` unchanged — it already asserts the command instruction only.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `node --test test/change-overview-contract.test.js test/design-coordinator-worker.test.js` — expected: PASS (schema and templates still full; instruction already holds semantic rules)

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 2: Replace design/tasks/interfaces schema instructions with authority pointers

*(Testable step — use RED → GREEN)*

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports. Do NOT paste the full implementation here.

- [ ] Append the following new tests to `test/change-overview-contract.test.js` (place after the Step 1 retargeted tests). These MUST fail against the current full schema instruction bodies:

```js
function schemaEntryBlock(schema, id) {
  const lines = schema.split(/\r?\n/);
  const idPattern = new RegExp('^([ \\t]*)-?\\s*id:\\s*' + id + '\\s*$');
  const start = lines.findIndex(line => idPattern.test(line));
  assert.notEqual(start, -1, `schema.yaml should declare id: ${id}`);
  const entryIndent = lines[start].match(/^[ \\t]*/)[0].length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const indent = line.match(/^[ \\t]*/)[0].length;
    if (indent <= entryIndent && (/^-?\s*id:\s*/.test(line.trim()) || line.trim() === 'apply:')) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function schemaInstruction(schema, id) {
  const block = schemaEntryBlock(schema, id);
  const lines = block.split(/\r?\n/);
  const instructionIndex = lines.findIndex(line => /^\s*instruction:\s*\|/.test(line));
  assert.notEqual(instructionIndex, -1, `${id} should declare a literal instruction block`);
  const instructionIndent = lines[instructionIndex].match(/^[ \\t]*/)[0].length;
  const body = [];
  for (let index = instructionIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim()) {
      const indent = line.match(/^[ \\t]*/)[0].length;
      if (indent <= instructionIndent) break;
    }
    body.push(line.slice(Math.min(line.length, instructionIndent + 2)));
  }
  return body.join('\n').replace(/\n+$/, '');
}

function schemaFieldList(schema, id, field) {
  const block = schemaEntryBlock(schema, id);
  const lines = block.split(/\r?\n/);
  const fieldIndex = lines.findIndex(line => new RegExp('^\\s*' + field + ':\\s*$').test(line)
    || new RegExp('^\\s*' + field + ':\\s+\\S').test(line));
  if (fieldIndex === -1) return null;
  const inline = lines[fieldIndex].match(new RegExp('^\\s*' + field + ':\\s*(.+)$'));
  if (inline && inline[1].trim() && !inline[1].trim().startsWith('|')) {
    const value = inline[1].trim();
    if (value.startsWith('[')) {
      return value.replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
    }
    return value;
  }
  const fieldIndent = lines[fieldIndex].match(/^[ \\t]*/)[0].length;
  const items = [];
  for (let index = fieldIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const indent = line.match(/^[ \\t]*/)[0].length;
    if (indent <= fieldIndent) break;
    const item = line.trim().match(/^-\s+(.+)$/);
    if (item) items.push(item[1].trim());
  }
  return items;
}

const DESIGN_PHASE_IDS = ['design', 'tasks', 'interfaces'];
const POINTER_ANCHORS = {
  design: '### Generate design.md',
  tasks: '### Generate tasks.md',
  interfaces: '### Generate interfaces.md',
};
const POINTER_FORBIDDEN = [
  'ADR/DDR',
  'Record family',
  'Provenance',
  'Verify-first',
  'Architecture Snapshot',
  'File Manifest',
  'None — no step contracts',
  'Endpoint Map',
  '**Routing**',
  '**Files Affected**',
  '**Testing Strategy**',
];

// Fixed pre-change graph baseline for design/tasks/interfaces (captured from the
// pre-edit schema; MUST NOT be re-derived from the post-edit file at assertion time).
const GRAPH_BASELINE = Object.freeze({
  design: Object.freeze({
    generates: 'design.md',
    requires: Object.freeze(['proposal', 'specs']),
  }),
  tasks: Object.freeze({
    generates: 'tasks.md',
    requires: Object.freeze(['specs', 'design']),
  }),
  interfaces: Object.freeze({
    generates: 'interfaces.md',
    requires: Object.freeze(['tasks']),
  }),
  apply: Object.freeze({
    requires: Object.freeze(['tasks', 'implementation']),
    tracks: 'implementation.md',
  }),
});

test('design/tasks/interfaces schema instructions are authority pointers', () => {
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');

  for (const id of DESIGN_PHASE_IDS) {
    const instruction = schemaInstruction(schema, id);
    assert.ok(instruction.trim().length > 0, `${id}.instruction must be non-empty`);
    assert.match(instruction, /sai\/commands\/design\/instructions\.md/,
      `${id}.instruction must name sai/commands/design/instructions.md`);
    assert.match(instruction, new RegExp(POINTER_ANCHORS[id].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `${id}.instruction must name ${POINTER_ANCHORS[id]}`);
    for (const forbidden of POINTER_FORBIDDEN) {
      assert.ok(!instruction.includes(forbidden),
        `${id}.instruction must not restate generation rules (forbidden: ${forbidden})`);
    }
  }
});

test('design schema description does not advertise Endpoint Map; graph fields unchanged', () => {
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  const designBlock = schemaEntryBlock(schema, 'design');
  const descriptionLine = designBlock.split(/\r?\n/).find(line => /^\s*description:/.test(line)) || '';
  assert.doesNotMatch(descriptionLine, /endpoint map/i,
    'design.description must not contain endpoint map');

  for (const id of DESIGN_PHASE_IDS) {
    assert.equal(schemaFieldList(schema, id, 'generates') ?? schemaEntryBlock(schema, id).match(/generates:\s*(\S+)/)?.[1],
      GRAPH_BASELINE[id].generates,
      `${id}.generates must match pre-change baseline`);
    assert.deepEqual(schemaFieldList(schema, id, 'requires'), GRAPH_BASELINE[id].requires,
      `${id}.requires must match pre-change baseline`);
  }

  const applySection = schema.slice(schema.indexOf(/^apply:\s*$/m));
  assert.match(applySection, /requires:\s*\[\s*tasks\s*,\s*implementation\s*\]/);
  assert.match(applySection, /tracks:\s*implementation\.md/);
});
```

- [ ] Mirror the same two tests (helpers may be local or duplicated) into `test/design-coordinator-worker.test.js` so both contract files pin the pointer-shape and graph-field baseline oracles.

- [ ] Verify RED: run `node --test test/change-overview-contract.test.js test/design-coordinator-worker.test.js` — expected: **assertion failure** on the new pointer-shape tests (current schema instructions still restate full generation rules and lack the short pointer form). Failure must be assertion mismatch, not import/syntax error.
- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase (only after RED is verified)

- [ ] In `openspec/schemas/sai-workflow/schema.yaml`, replace the `design` artifact `description` and `instruction:` body. Preserve YAML block-scalar indentation (two spaces under `instruction: |`). Keep `generates`, `requires`, `template` unchanged:

```yaml
  - id: design
    generates: design.md
    description: Technical design — decisions, trade-offs, Target State, and ADR/DDR evaluation with the record family resolved by the ordered routing test
    template: design.md
    instruction: |
      Fetch and follow sai/commands/design/instructions.md section ### Generate design.md exactly. This instruction is an informative reference only; it does not restate the design generation contract.
    requires:
      - proposal
      - specs
```

- [ ] Replace the `tasks` artifact `instruction:` body only (leave `description`, `generates`, `requires`, `template` unchanged):

```yaml
    instruction: |
      Fetch and follow sai/commands/design/instructions.md section ### Generate tasks.md exactly. This instruction is an informative reference only; it does not restate the task generation contract.
```

- [ ] Replace the `interfaces` artifact `instruction:` body only (leave `description`, `generates`, `requires`, `template` unchanged):

```yaml
    instruction: |
      Fetch and follow sai/commands/design/instructions.md section ### Generate interfaces.md exactly. This instruction is an informative reference only; it does not restate the interface generation contract.
```

- [ ] Remove or update any residual assertions in the two test files that still expect long design/tasks/interfaces schema instruction prose (ADR criteria lists, full Required Documentation rules, endpoint-map promises inside instruction bodies). Do **not** weaken graph-field or pointer-shape checks added in RED.
- [ ] If `schemaFieldList` for `generates` is awkward with inline scalars, simplify the graph assertion to read `generates:` via a direct regex on `schemaEntryBlock` while keeping `requires` deep-equal to `GRAPH_BASELINE`.
- [ ] Verify GREEN: run `node --test test/change-overview-contract.test.js test/design-coordinator-worker.test.js` — expected: PASS

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] RED verified — pointer-shape tests fail against pre-edit schema with assertion failures
- [ ] GREEN verified — `node --test test/change-overview-contract.test.js test/design-coordinator-worker.test.js` passes
- [ ] Confirm by inspection that `design.description` has no case-insensitive `endpoint map` and each of the three `instruction` bodies contains path + matching `### Generate …` anchor only

*(No Human checks — service-side step with no observable browser behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

#### Step 3: Reduce design, tasks, and interfaces templates to structural skeletons

*(Testable step — use RED → GREEN)*

##### RED phase

- **Rule:** RED may only contain the failing test + minimal stubs/imports. Do NOT paste the full implementation here.

- [ ] Append skeleton-oracle tests to both `test/change-overview-contract.test.js` and `test/design-coordinator-worker.test.js`. These MUST fail against the current full templates (Endpoint Map present, forbidden ADR criteria prose, missing Spec files subsection, `None — no step contracts` retained on interfaces template):

```js
const DESIGN_HEADINGS = [
  '## Target State',
  '## Context',
  '## Goals / Non-Goals',
  '## Decisions',
  '## Risks / Trade-offs',
  '## Migration Plan',
  '## Open Questions',
  '## Deferred',
  '## Manual Verification',
];

const TASK_FIELD_MARKERS = [
  '**Routing**',
  '**Files Affected**',
  '**What Will Be Done**',
  '**Testing Strategy**',
  '**Existing Tests Broken**',
];

const TEMPLATE_FORBIDDEN = [
  'Endpoint Map',
  'None — no step contracts',
  'Hard to reverse',
  'Surprising without context',
  'Real trade-off',
  'domain invariant',
  'ordered routing test',
];

function assertHeadingOrder(content, headings, label) {
  let cursor = -1;
  for (const heading of headings) {
    const index = content.indexOf(heading, cursor + 1);
    assert.ok(index !== -1, `${label} must contain ${heading}`);
    assert.ok(index > cursor, `${label}: ${heading} must follow previous required heading`);
    cursor = index;
  }
}

function countOccurrences(content, substring) {
  let count = 0;
  let from = 0;
  while (true) {
    const index = content.indexOf(substring, from);
    if (index === -1) return count;
    count += 1;
    from = index + substring.length;
  }
}

test('design/tasks/interfaces templates are structural skeletons with authority pointers', () => {
  const designTemplate = artifact('openspec/schemas/sai-workflow/templates/design.md');
  const tasksTemplate = artifact('openspec/schemas/sai-workflow/templates/tasks.md');
  const interfacesTemplate = artifact('openspec/schemas/sai-workflow/templates/interfaces.md');

  assertHeadingOrder(designTemplate, DESIGN_HEADINGS, 'design template');
  assert.ok(designTemplate.indexOf('### Architecture Snapshot') > designTemplate.indexOf('## Target State'));
  assert.ok(designTemplate.indexOf('### File Manifest') > designTemplate.indexOf('### Architecture Snapshot'));
  assert.doesNotMatch(designTemplate, /^##\s*Endpoint Map\b/m);
  assert.equal(countOccurrences(designTemplate, 'sai/commands/design/instructions.md'), 1);
  assert.equal(countOccurrences(designTemplate, '### Generate design.md'), 1);
  assert.match(designTemplate, /\*\*Provenance\*\*:/);
  assert.match(designTemplate, /\*\*Record family\*\*:/);

  for (const marker of TASK_FIELD_MARKERS) {
    assert.match(tasksTemplate, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assertHeadingOrder(tasksTemplate, [
    '## Required Documentation',
    '### Local files',
    '### Spec files',
    '### External URLs',
    '## Implementation Context',
  ], 'tasks template trailing sections');
  assert.equal(countOccurrences(tasksTemplate, 'sai/commands/design/instructions.md'), 1);
  assert.equal(countOccurrences(tasksTemplate, '### Generate tasks.md'), 1);

  assert.match(interfacesTemplate, /\*\*Interfaces\*\*/);
  assert.match(interfacesTemplate, /\*\*Test assertions\*\*/);
  assert.match(interfacesTemplate, /## Step /);
  assert.equal(countOccurrences(interfacesTemplate, 'sai/commands/design/instructions.md'), 1);
  assert.equal(countOccurrences(interfacesTemplate, '### Generate interfaces.md'), 1);

  for (const [label, content] of [
    ['design', designTemplate],
    ['tasks', tasksTemplate],
    ['interfaces', interfacesTemplate],
  ]) {
    for (const forbidden of TEMPLATE_FORBIDDEN) {
      if (forbidden === 'None — no step contracts' && label !== 'interfaces') continue;
      if (forbidden === 'Endpoint Map' && label !== 'design') continue;
      assert.ok(!content.includes(forbidden),
        `${label} template must not contain forbidden residual: ${forbidden}`);
    }
  }

  assert.doesNotMatch(designTemplate, /\|\s*Method\s*\|/i);
  assert.doesNotMatch(designTemplate, /\|\s*Path\s*\|/i);
});
```

- [ ] Verify RED: run `node --test test/change-overview-contract.test.js test/design-coordinator-worker.test.js` — expected: **assertion failure** on skeleton oracle (Endpoint Map still present; Spec files missing; forbidden prose still present).
- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.**

##### GREEN phase (only after RED is verified)

- [ ] Replace `openspec/schemas/sai-workflow/templates/design.md` entirely with this heading-preserving skeleton (exactly one authority pointer pair; no Endpoint Map; bare Provenance/Record family labels only):

```markdown
## Target State

<!-- Finished shape the change converges on (one concrete artifact). -->

### Architecture Snapshot

<!-- Planned public surfaces, or exactly: None — no planned public surfaces -->

### File Manifest

<!-- Net fold of tasks.md Files Affected, or exactly: None — no files affected -->

## Context

<!-- Background, current state, constraints. -->

## Goals / Non-Goals

**Goals:**
<!-- What this design achieves -->

**Non-Goals:**
<!-- What is explicitly out of scope -->

## Decisions

### D1: <!-- Decision title -->
**Provenance**: <!-- user | codebase-forced | derived -->
**Record family**: <!-- adr | ddr when criteria apply -->
**Alternatives considered**:
- <!-- Alternative rejected and why -->

## Risks / Trade-offs

<!-- [Risk] → Mitigation -->

## Migration Plan

<!-- Deploy steps and rollback. -->

## Open Questions

<!-- Outstanding unknowns. -->

## Deferred

<!-- Postponed decisions with cost and recommendation, or None. -->

## Manual Verification

<!-- Hand-cheap checks, or None + one-line reason. -->

<!-- Write-time authority: sai/commands/design/instructions.md ### Generate design.md -->
```

- [ ] Replace `openspec/schemas/sai-workflow/templates/tasks.md` entirely with this skeleton (five ordered step fields; Required Documentation with Local files → Spec files → External URLs; Implementation Context; exactly one authority pointer):

```markdown
## Step 1: <!-- Title -->

**Routing**: layer=<!-- frontend|backend|infra|cross-cutting --> · discipline=<!-- ui-ux|app-code|service|data|config --> · complexity=<!-- low|medium|high -->

**Files Affected**:
<!-- A|M|D|R entries, one per line -->

**What Will Be Done**: <!-- prose description -->

**Testing Strategy**: <!-- verification approach -->

**Existing Tests Broken**: <!-- compile|runtime list, or None -->

## Required Documentation

### Local files

<!-- one path per line, or None -->

### Spec files

<!-- one path per line, or None -->

### External URLs

<!-- one URL per line, or None -->

## Implementation Context

**Stack**: <!-- language/framework + versions -->

**Conventions**:
<!-- 2-5 project-specific bullets -->

**Avoid**:
<!-- stack-specific anti-patterns -->

**Test Command**:
<!-- suite command + parameterised scoping idiom, or None — no test runner in this project -->

<!-- Write-time authority: sai/commands/design/instructions.md ### Generate tasks.md -->
```

- [ ] Replace `openspec/schemas/sai-workflow/templates/interfaces.md` entirely with this skeleton (no semantic `None — no step contracts` literal; exactly one authority pointer):

```markdown
## Step 1: <!-- Title (mirror tasks.md Step N) -->

**Interfaces**: <!-- new/modified public signatures only -->

**Test assertions**: <!-- exact assertions anchored to specs/**/*.md -->

<!-- Write-time authority: sai/commands/design/instructions.md ### Generate interfaces.md -->
```

- [ ] Adjust any remaining template prose assertions in the two test files that still require normative body text (ADR criteria paragraphs, endpoint tables, long instruction comments). Keep structural heading/order/pointer checks and the Step 1 instruction-only semantic checks.
- [ ] Verify GREEN: run `node --test test/change-overview-contract.test.js test/design-coordinator-worker.test.js` — expected: PASS
- [ ] Optional full suite: `npm test` — expected: PASS (or only pre-existing unrelated failures)

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] RED verified — skeleton oracle fails against pre-reduction templates with assertion failures
- [ ] GREEN verified — `node --test test/change-overview-contract.test.js test/design-coordinator-worker.test.js` passes
- [ ] `openspec/schemas/sai-workflow/templates/design.md` has no `## Endpoint Map` and retains ordered live headings
- [ ] Each of the three templates contains exactly one `sai/commands/design/instructions.md` and exactly one matching `### Generate …` anchor

*(No Human checks — service-side step with no observable browser behavior. Manual spot-checks from design.md Manual Verification are optional human follow-up after apply, not plan checkboxes.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

## ADRs created this run

- `docs/adr/0166-schema-design-tasks-interfaces-instructions-are-authority-pointers.md` (D1) — Pair with 0167, Refs 0155, Refs 0162
- `docs/adr/0167-design-tasks-interfaces-templates-are-structural-skeletons.md` (D2) — Pair with 0166, Refs 0162
- Warm-spliced both into `docs/adr/0000-INDEX.md` under `/sai-2-design` and Fetch resolution & path conventions

## Decision records not created

- D3 (semantic tests assert command instruction) — does not meet all three ADR criteria
- D4 (remove Endpoint Map) — straightforward cleanup; does not meet all three ADR criteria
