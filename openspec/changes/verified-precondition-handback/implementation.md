# Verified Precondition Hand-back

## Goal

Add one evidence-bound policy for improvised precondition hand-backs and load it exactly once from every routed and utility command card without changing existing command behavior.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD`. If it returns empty, use `detached HEAD` in the branch picker.
- Resolve the default branch in order: the trailing segment of `git symbolic-ref --quiet refs/remotes/origin/HEAD`; otherwise an existing local `main` or `master` (prefer `main` when both exist); otherwise the current branch.
- Present these three choices in this order: `Suggest branch "verified-precondition-handback"`, `Stay on current branch "{current-branch}"`, and `Enter branch name manually`.
- If the selected branch does not exist, ask whether to base it on the resolved default branch or current branch, unless staying on the current branch or the current branch already equals the default branch. Create a new branch only after that choice. Existing target branches need no base prompt.

### Step-by-Step Instructions

#### Step 1: Establish the canonical hand-back contract

*(Testable step — use RED → GREEN.)*

##### RED phase

- [x] Create `test/verified-precondition-handback.test.js` with the following policy and glossary contract tests. This is the complete Step 1 test file:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const policyPath = path.join(repoRoot, 'sai', 'policies', 'verified-precondition-handback.md');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('canonical policy requires current evidence and confirmed writer ownership', () => {
  assert.ok(fs.existsSync(policyPath), 'the canonical verified-precondition policy must exist');
  const policy = fs.readFileSync(policyPath, 'utf8');

  assert.match(policy, /concrete project-relative file/i);
  assert.match(policy, /concrete[\s\S]{0,120}key/i);
  assert.match(policy, /current invocation/i);
  assert.match(policy, /destination command[\s\S]{0,240}(?:card|instruction|worker contract)/i);
  assert.match(policy, /explicit[\s\S]{0,160}write responsibility/i);
  assert.match(policy, /(?:reads?|checks?|gates?|forwards?)[\s\S]{0,220}(?:does not|do not|shall not)[\s\S]{0,120}(?:writer|write responsibility)/i);
  assert.match(policy, /relay[\s\S]{0,220}independent/i);
});

test('canonical policy escalates incomplete evidence without changing written contracts', () => {
  const policy = fs.readFileSync(policyPath, 'utf8');

  assert.match(policy, /missing[\s\S]{0,100}file[\s\S]{0,180}unsatisfiable/i);
  assert.match(policy, /unread[\s\S]{0,180}key/i);
  assert.match(policy, /unconfirmed[\s\S]{0,180}writer/i);
  assert.match(policy, /verification evidence is incomplete/i);
  assert.match(policy, /@sai\/policies\/question-context\.md/);
  assert.match(policy, /fixed STOP/i);
  assert.match(policy, /contract-authored hand-back/i);
  assert.match(policy, /approval gate/i);
  assert.match(policy, /lifecycle/i);
  assert.match(policy, /successful path/i);
});

test('glossary defines only the canonical hand-back term and rejected aliases', () => {
  const glossary = read('GLOSSARY.md');
  assert.match(glossary, /\*\*Verified Precondition Hand-back\*\*:\s*"[^"]+"/);
  assert.match(glossary, /\*Avoid\*:\s*unverified hand-back, precondition redirect, backwards hand-off/);
  assert.doesNotMatch(glossary, /\*\*Unverified Hand-back\*\*:/);
  assert.doesNotMatch(glossary, /\*\*Precondition Redirect\*\*:/);
});
```

- [x] Verify RED: run `node --test test/verified-precondition-handback.test.js` before creating the policy — expected: an assertion failure stating that the canonical policy must exist.
- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.** The failure must be an assertion failure caused by the absent policy, not a syntax, import, or dependency error.

##### GREEN phase (only after RED is verified)

- [x] Create `sai/policies/verified-precondition-handback.md` with exactly this content:

```markdown
# Verified Precondition Hand-back

This policy governs only an improvised, off-contract direction that sends a user to another command because a precondition is claimed to be unmet.

## Evidence required before a hand-back

Before issuing the hand-back, the authoring surface SHALL complete all of these checks in the current invocation:

1. Name the concrete project-relative file and the concrete key whose state is at issue.
2. Read that file and inspect that exact key path. An absent key may be established by inspecting its exact path in an existing current file. A missing cited file makes the current-read check unsatisfiable, so the fallback below applies.
3. Read the destination command's current command card, instruction, or worker contract and confirm an explicit command-owned write responsibility for the cited key. A command that only reads, checks, gates on, or forwards the key does not establish writer ownership or qualify as the destination writer.
4. When relaying a proposed hand-back, repeat the file, key, and destination-writer checks independently. An upstream assertion or conversation text is not transferred evidence.

Only after every check succeeds may the surface issue the improvised hand-back. The hand-back SHALL name the concrete file and key and the destination command whose verified contract writes that key.

## Incomplete-evidence fallback

If the evidence includes a missing cited file, an unread key, or an unconfirmed destination writer, do not issue the hand-back. Ask the user what to do under `@sai/policies/question-context.md` instead. The question SHALL identify the current state and verification gap, carry the essential context and plain-language options needed for the decision, and state that the verification evidence is incomplete.

This fallback adds no approval, precondition, or other gate to a command's successful path.

## Exclusions

This policy does not rewrite or reinterpret an existing fixed STOP literal, contract-authored hand-back, approval gate, file-existence check, lifecycle status, or lifecycle payload. Those written contracts remain authoritative and byte-identical. No durable verification record is created.
```

- [x] Ensure `GLOSSARY.md` retains this alphabetically placed canonical entry in `## Language` without changing unrelated entries:

```markdown
**Verified Precondition Hand-back**: "A protocol-approved user-facing escalation that cites an unmet precondition only after its concrete file and key have been read and the destination command's ownership of that key has been confirmed."
*Avoid*: unverified hand-back, precondition redirect, backwards hand-off
```

- [x] Verify GREEN: run `node --test test/verified-precondition-handback.test.js` — expected: all Step 1 tests pass.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] RED verified — the scoped test fails with the expected missing-policy assertion before GREEN.
- [x] GREEN verified — `node --test test/verified-precondition-handback.test.js` passes after GREEN.
- [x] `git diff --check` — no whitespace errors.

*(No Human checks — this step changes an instruction policy, glossary contract, and structural tests with no browser-visible behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit the policy, glossary, and Step 1 structural test after Automated checks pass. No browser verification is required.

#### Step 2: Apply and enforce the policy across command cards

*(Testable step — use RED → GREEN.)*

##### RED phase

- [ ] Append the following complete Step 2 structural contract to `test/verified-precondition-handback.test.js`:

```js

const policyFetch = 'Fetch @sai/policies/verified-precondition-handback.md';
const routedPhases = ['spec', 'design', 'implement', 'review', 'security', 'performance', 'accessibility'];
const routedCards = routedPhases.flatMap((phase) =>
  ['coordinator.md', 'worker.md', 'invocation.md'].map((name) => `sai/commands/${phase}/${name}`)
);
const utilityCards = ['apply', 'archive', 'backfill', 'commit', 'explore', 'pr', 'status', 'worktree']
  .map((name) => `sai/commands/${name}/body.md`);
const commandCards = [...routedCards, ...utilityCards];

function countLiteral(text, value) {
  return text.split(value).length - 1;
}

function nextNonBlankLine(lines, startIndex) {
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index].trim() !== '') return lines[index].trim();
  }
  return undefined;
}

function markdownFilesUnder(relativeDirectory) {
  const root = path.join(repoRoot, relativeDirectory);
  if (!fs.existsSync(root)) return [];
  const found = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const child = path.join(root, entry.name);
    if (entry.isDirectory()) {
      found.push(...markdownFilesUnder(path.relative(repoRoot, child)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      found.push(child);
    }
  }
  return found;
}

test('all 29 command cards load the policy exactly once at their structural entry point', () => {
  assert.equal(commandCards.length, 29);

  for (const card of commandCards) {
    assert.ok(fs.existsSync(path.join(repoRoot, card)), `${card} must exist`);
    const content = read(card);
    assert.equal(countLiteral(content, policyFetch), 1, `${card} must fetch the policy exactly once`);
    const lines = content.split(/\r?\n/);

    if (card.endsWith('/coordinator.md') || card.endsWith('/body.md')) {
      const taskIndex = lines.findIndex((line) => line.trim() === '<TASK>');
      assert.notEqual(taskIndex, -1, `${card} must contain <TASK>`);
      assert.equal(nextNonBlankLine(lines, taskIndex), policyFetch, `${card} fetch must follow <TASK>`);
    } else {
      assert.match(lines[0], /^# /, `${card} must start with an H1`);
      assert.equal(nextNonBlankLine(lines, 0), policyFetch, `${card} fetch must follow its H1`);
    }
  }
});

test('excluded non-card surfaces do not fetch the policy directly', () => {
  const commandNonCards = markdownFilesUnder('sai/commands').filter((file) =>
    path.basename(file) === 'instructions.md' || path.basename(file).endsWith('.template.md')
  );
  const nonCanonicalPolicies = markdownFilesUnder('sai/policies').filter((file) => file !== policyPath);
  const projectSkills = [
    ...markdownFilesUnder('.claude/skills'),
    ...markdownFilesUnder('.opencode/skills'),
  ];
  const excluded = [
    ...commandNonCards,
    ...nonCanonicalPolicies,
    ...projectSkills,
    path.join(repoRoot, 'sai', 'command-runner.md'),
    path.join(repoRoot, 'sai', 'worker-core.md'),
  ];

  for (const file of excluded) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /Fetch @sai\/policies\/verified-precondition-handback\.md/,
      `${path.relative(repoRoot, file)} must not fetch the policy directly`);
  }
});

test('representative fixed STOP and contract-authored hand-back text remains unchanged', () => {
  assert.match(
    read('sai/commands/apply/body.md'),
    /implementation\.md not found for '\{change-name\}'\. Run \/sai-3-implement first\./
  );
  assert.match(
    read('sai/commands/design/instructions.md'),
    /direct the user to re-run `\/sai-1-spec` to make the correction in a fresh spec pass\./
  );
});
```

- [ ] Verify RED: run `node --test test/verified-precondition-handback.test.js` before editing command cards — expected: an assertion failure because the first inspected card has zero canonical policy fetches.
- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.** The failure must be the missing-card-fetch assertion, not a syntax or setup error.

##### GREEN phase (only after RED is verified)

- [ ] In each coordinator card below, insert exactly one indented line `  Fetch @sai/policies/verified-precondition-handback.md` as the first non-blank line after `<TASK>`, preserving every existing byte after the insertion:
  - `sai/commands/spec/coordinator.md`
  - `sai/commands/design/coordinator.md`
  - `sai/commands/implement/coordinator.md`
  - `sai/commands/review/coordinator.md`
  - `sai/commands/security/coordinator.md`
  - `sai/commands/performance/coordinator.md`
  - `sai/commands/accessibility/coordinator.md`

- [ ] In each routed worker and invocation card below, insert exactly one unindented line `Fetch @sai/policies/verified-precondition-handback.md` as the first non-blank line after the H1, preserving all subsequent instruction order and text:
  - `sai/commands/spec/worker.md`
  - `sai/commands/spec/invocation.md`
  - `sai/commands/design/worker.md`
  - `sai/commands/design/invocation.md`
  - `sai/commands/implement/worker.md`
  - `sai/commands/implement/invocation.md`
  - `sai/commands/review/worker.md`
  - `sai/commands/review/invocation.md`
  - `sai/commands/security/worker.md`
  - `sai/commands/security/invocation.md`
  - `sai/commands/performance/worker.md`
  - `sai/commands/performance/invocation.md`
  - `sai/commands/accessibility/worker.md`
  - `sai/commands/accessibility/invocation.md`

- [ ] In each utility card below, insert exactly one indented line `  Fetch @sai/policies/verified-precondition-handback.md` as the first non-blank line after `<TASK>`, preserving every existing prerequisite, behavior, instruction, STOP, and completion line:
  - `sai/commands/apply/body.md`
  - `sai/commands/archive/body.md`
  - `sai/commands/backfill/body.md`
  - `sai/commands/commit/body.md`
  - `sai/commands/explore/body.md`
  - `sai/commands/pr/body.md`
  - `sai/commands/status/body.md`
  - `sai/commands/worktree/body.md`

- [ ] Do not add the fetch to `instructions.md`, templates, other policies, project-local skills, `sai/command-runner.md`, `sai/worker-core.md`, `sai/install-manifest.json`, or any schema. The existing recursive policy projection supplies both supported harnesses.

- [ ] Verify GREEN: run `node --test test/verified-precondition-handback.test.js` — expected: all policy, glossary, 29-card inventory, placement, exclusion, and preserved-literal tests pass.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] RED verified — the scoped suite fails on a missing card fetch before GREEN.
- [ ] GREEN verified — `node --test test/verified-precondition-handback.test.js` passes after all 29 insertions.
- [ ] `npm test` — the repository suite completes; attribute only failures proven pre-existing against untouched files.
- [ ] `git diff --check` — no whitespace errors.
- [ ] Inspect the final diff and confirm each command-card change is one inserted policy-fetch line, with no changed STOP literal, approval gate, lifecycle contract, schema, manifest, or generated harness copy.

*(No Human checks — structural tests cover the complete instruction-card inventory and there is no browser-visible behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit the command-card insertions and completed structural suite after Automated checks pass. No browser verification is required.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | single | red | 1 | assertion | |
| 1 | single | green | 1 | n/a | |
