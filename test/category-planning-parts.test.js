'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CATEGORY_AGENTS, taskSteps, start, assemble, publish } = require('../sai/tools/planning-parts');

function fixture(categories = ['backend', 'frontend-ui', 'data', 'docs']) {
  const temporaryRoot = fs.existsSync('/tmp/opencode') ? '/tmp/opencode' : os.tmpdir();
  const cwd = fs.mkdtempSync(path.join(temporaryRoot, 'sai-category-test-'));
  const dir = path.join(cwd, 'openspec', 'changes', 'example');
  fs.mkdirSync(dir, { recursive: true });
  for (const file of ['proposal.md', 'design.md']) fs.writeFileSync(path.join(dir, file), '# Input\n');
  fs.writeFileSync(path.join(dir, 'implementation.md'), 'previous plan\n');
  fs.writeFileSync(path.join(dir, 'tasks.md'), categories.map((category, index) => `## Step ${index + 1}: Task\n**Routing**: category=${category} · context=small · difficulty=low\n`).join('\n'));
  const result = start(cwd, 'example');
  const run = JSON.parse(fs.readFileSync(path.join(cwd, result.run, 'run.json'), 'utf8'));
  const part = assignment => ({ run: result.run, agent: assignment.agent, inputs: run.inputs, steps: assignment.steps.map(number => ({ number, content: `#### Step ${number}: Task\n\n##### Step ${number} Verification Checklist\n\n**Automated (agent runs before stopping):**\n- [ ] \`node --version\` — PASS\n\n*(No Functional checks — service-side step.)*\n\n#### Step ${number} STOP & COMMIT\n` })) });
  for (const assignment of result.assignments) fs.writeFileSync(path.join(cwd, assignment.artifact), JSON.stringify(part(assignment)));
  fs.writeFileSync(path.join(cwd, result.run, 'header.md'), '# Example\n\n## Verification commands\n\n**Full-suite command:** `npm test`\n\n### Step-by-Step Instructions\n');
  return { cwd, dir, result };
}

test('the fixed category mapping combines backend/data and docs/other without path inference', () => {
  assert.deepEqual(Object.values(CATEGORY_AGENTS), ['ui', 'frontend', 'backend', 'backend', 'infra', 'other', 'other']);
  for (const text of ['## Step 1: Task\n', '## Step 1: Task\n**Routing**: category=unknown\n', '## Step 1: Task\n**Routing**: category=backend · category=data\n', '## Step 1: Task\n**Routing**: category=backend,\n']) assert.throws(() => taskSteps(text), /Step 1: missing or invalid category/);
  assert.throws(() => taskSteps('## Step 1\n**Routing**: category=docs\n## Step 1\n**Routing**: category=data'), /Duplicate/);
});

test('one complete assignment per needed agent and integration preserves tasks ordering', () => {
  const { cwd, result } = fixture();
  assert.deepEqual(result.assignments.map(({ agent, steps }) => ({ agent, steps })), [{ agent: 'ui', steps: [2] }, { agent: 'backend', steps: [1, 3] }, { agent: 'other', steps: [4] }]);
  const candidate = assemble(cwd, result.run);
  const text = fs.readFileSync(path.join(cwd, candidate.candidate), 'utf8');
  assert.deepEqual([...text.matchAll(/^#### Step (\d+):/gm)].map(match => Number(match[1])), [1, 2, 3, 4]);
});

test('missing sibling and incorrect ownership retain good parts and the previous plan', () => {
  const { cwd, dir, result } = fixture();
  const bad = result.assignments.find(assignment => assignment.agent === 'backend');
  const file = path.join(cwd, bad.artifact);
  const original = fs.readFileSync(file, 'utf8');
  fs.renameSync(file, `${file}.retained`);
  assert.throws(() => assemble(cwd, result.run), /ENOENT/);
  assert.ok(fs.existsSync(path.join(cwd, result.assignments[0].artifact)));
  const part = JSON.parse(original);
  part.steps[0].number = 2;
  fs.writeFileSync(file, JSON.stringify(part));
  assert.throws(() => assemble(cwd, result.run), /ownership/);
  assert.equal(fs.readFileSync(path.join(dir, 'implementation.md'), 'utf8'), 'previous plan\n');
});

test('stale inputs and another run identity cannot be accepted by filename', () => {
  const { cwd, dir, result } = fixture();
  const file = path.join(cwd, result.assignments[0].artifact);
  const part = JSON.parse(fs.readFileSync(file, 'utf8'));
  part.run += '-foreign';
  fs.writeFileSync(file, JSON.stringify(part));
  assert.throws(() => assemble(cwd, result.run), /identity/);
  fs.appendFileSync(path.join(dir, 'design.md'), 'changed');
  assert.throws(() => assemble(cwd, result.run), /inputs changed/);
});

test('verified publication replaces the plan, cleans exact owned files and retains unrelated files', () => {
  const { cwd, dir, result } = fixture();
  const unknown = path.join(cwd, result.run, 'unrelated.md');
  fs.writeFileSync(unknown, 'keep');
  const candidate = assemble(cwd, result.run);
  assert.throws(() => publish(cwd, result.run, 'wrong hash'), /candidate changed/);
  assert.equal(fs.readFileSync(path.join(dir, 'implementation.md'), 'utf8'), 'previous plan\n');
  publish(cwd, result.run, candidate.sha256);
  assert.match(fs.readFileSync(path.join(dir, 'implementation.md'), 'utf8'), /^# Example/);
  assert.equal(fs.readFileSync(unknown, 'utf8'), 'keep');
  assert.equal(fs.existsSync(path.join(cwd, result.run, 'run.json')), false);
});

test('executable-plan validation failure leaves all parts and the previous final plan untouched', () => {
  const { cwd, dir, result } = fixture();
  const file = path.join(cwd, result.assignments[0].artifact);
  const part = JSON.parse(fs.readFileSync(file, 'utf8'));
  part.steps[0].content = '#### Step 2: Invalid\n';
  fs.writeFileSync(file, JSON.stringify(part));
  const candidate = assemble(cwd, result.run);
  assert.throws(() => publish(cwd, result.run, candidate.sha256), /preflight failed/);
  assert.equal(fs.readFileSync(path.join(dir, 'implementation.md'), 'utf8'), 'previous plan\n');
  assert.ok(fs.existsSync(file));
});

test('invalid category rejects before creating a run or changing the durable plan', () => {
  const { cwd, dir } = fixture(['backend']);
  fs.writeFileSync(path.join(dir, 'tasks.md'), '## Step 1: Task\n**Routing**: category=invalid\n');
  const parent = path.join(dir, '.planning-parts');
  const before = fs.readdirSync(parent);
  assert.throws(() => start(cwd, 'example'), /Step 1: missing or invalid category/);
  assert.deepEqual(fs.readdirSync(parent), before);
  assert.equal(fs.readFileSync(path.join(dir, 'implementation.md'), 'utf8'), 'previous plan\n');
});

test('all seven categories map to exactly five complete assignments without renumbering', () => {
  const { result } = fixture(['other', 'infra', 'frontend-code', 'backend', 'frontend-ui', 'data', 'docs']);
  assert.deepEqual(result.assignments.map(({ agent, steps }) => ({ agent, steps })), [
    { agent: 'ui', steps: [5] }, { agent: 'frontend', steps: [3] },
    { agent: 'backend', steps: [4, 6] }, { agent: 'infra', steps: [2] },
    { agent: 'other', steps: [1, 7] },
  ]);
  const nonconsecutive = '## Step 9: Nine\n**Routing**: category=data\n## Step 2: Two\n**Routing**: category=backend\n';
  assert.deepEqual(taskSteps(nonconsecutive).map(step => step.number), [9, 2]);
});

test('duplicate, missing, reordered and extra assigned Steps all block integration without losing sibling parts', () => {
  for (const alter of [
    steps => [steps[0], steps[0]],
    steps => steps.slice(1),
    steps => [...steps].reverse(),
    steps => [...steps, { number: 99, content: '#### Step 99: Foreign\n' }],
  ]) {
    const { cwd, dir, result } = fixture();
    const assignment = result.assignments.find(item => item.agent === 'backend');
    const file = path.join(cwd, assignment.artifact);
    const part = JSON.parse(fs.readFileSync(file, 'utf8'));
    part.steps = alter(part.steps);
    fs.writeFileSync(file, JSON.stringify(part));
    assert.throws(() => assemble(cwd, result.run), /ownership/);
    for (const sibling of result.assignments.filter(item => item.agent !== 'backend')) assert.ok(fs.existsSync(path.join(cwd, sibling.artifact)));
    assert.equal(fs.readFileSync(path.join(dir, 'implementation.md'), 'utf8'), 'previous plan\n');
  }
});

test('input identity covers interfaces, prior plan, audits and nested specification evidence', () => {
  for (const file of ['interfaces.md', 'implementation.md', 'review.md', 'specs/example/spec.md']) {
    const { cwd, dir, result } = fixture();
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'new input\n');
    assert.throws(() => assemble(cwd, result.run), /inputs changed/);
    for (const assignment of result.assignments) assert.ok(fs.existsSync(path.join(cwd, assignment.artifact)));
  }
});

test('verification-copy tampering blocks publication and preserves the prior plan and run evidence', () => {
  const { cwd, dir, result } = fixture();
  const candidate = assemble(cwd, result.run);
  fs.appendFileSync(path.join(cwd, candidate.validation_cwd, 'openspec/changes/example/implementation.md'), '\nchanged\n');
  assert.throws(() => publish(cwd, result.run, candidate.sha256), /Validation candidate mismatch/);
  assert.equal(fs.readFileSync(path.join(dir, 'implementation.md'), 'utf8'), 'previous plan\n');
  assert.ok(fs.existsSync(path.join(cwd, result.run, 'run.json')));
  for (const assignment of result.assignments) assert.ok(fs.existsSync(path.join(cwd, assignment.artifact)));
});

test('successful cleanup retains other runs and undeclared validation files', () => {
  const { cwd, result } = fixture();
  const otherRun = start(cwd, 'example');
  const candidate = assemble(cwd, result.run);
  const foreign = path.join(cwd, candidate.validation_cwd, 'unrelated.txt');
  fs.writeFileSync(foreign, 'keep\n');
  publish(cwd, result.run, candidate.sha256);
  assert.ok(fs.existsSync(path.join(cwd, otherRun.run, 'run.json')));
  assert.equal(fs.readFileSync(foreign, 'utf8'), 'keep\n');
});
