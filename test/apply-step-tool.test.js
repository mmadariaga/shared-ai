'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'apply-step.js');
const { statusLetter, classifyAutomated, parseStep, parseFilesAffected, INSTRUCTION_VERBS, attemptReceiptFile } = require(TOOL);
const receiptOf = (repo, step = 1) => attemptReceiptFile({ cwd: repo, change: 'demo' }, String(step));
const baselines = new Map();
const records = new Map();

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}

function childEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

function tool(args, cwd, stdin = '') {
  if (args[0] === 'baseline' && !args.includes('--run-id')) args = [...args, '--run-id', require('crypto').randomUUID()];
  if (args[0] === 'verify' && !args.includes('--checkpoint')) args = [...args, '--baseline-only'];
  if (args[0] === 'close' && !args.includes('--guard-base')) args = [...args, '--guard-base', 'n/a'];
  if (['verify', 'close', 'dispatch-check', 'checkpoint-plan'].includes(args[0]) && !args.includes('--baseline') && baselines.has(cwd)) args = [...args, '--baseline', baselines.get(cwd)];
  const result = spawnSync(process.execPath, [TOOL, ...args, '--json', '--cwd', cwd], { cwd, encoding: 'utf8', input: stdin, env: childEnv() });
  let payload = null;
  try {
    payload = JSON.parse(result.stdout);
  } catch (err) {
    payload = null;
  }
  for (const ref of [payload?.baseline, payload?.checkpoint, payload?.settled, payload?.plan_checkpoint].filter(Boolean)) {
    if (!records.has(cwd)) records.set(cwd, new Set());
    records.get(cwd).add(ref);
  }
  if (payload?.capture_claim) {
    if (!records.has(cwd)) records.set(cwd, new Set());
    records.get(cwd).add(`${payload.capture_claim}#claim`);
  }
  return { status: result.status, payload, stderr: result.stderr };
}

const PLAN = `# Demo

## Verification commands

**Full-suite command:** \`node --test\`

### Step-by-Step Instructions

#### Step 1: Add feature

##### RED phase

- **Retirements:** \`test/old.test.js\` retired
- **Step test command:** \`node --test test/feature.test.js\`

- [ ] Create a minimal stub at \`src/feature.js\`:
- [ ] Write the test into \`test/feature.test.js\`:
- [ ] Verify RED: run \`node --test test/feature.test.js\` — expected: assertion failure

##### GREEN phase (only after RED is verified)

- [ ] Copy and paste code below into \`src/feature.js\`:

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] RED verified — \`node --test test/feature.test.js\` failed by assertion during RED
- [ ] GREEN verified — \`node --test test/feature.test.js\` passes
- [ ] \`node -e "process.exit(0)"\` — exit 0
- [ ] Output reads sensibly — judge it

**Functional (verify in the browser):**
- [ ] Looks fine

#### Step 1 STOP & COMMIT

**STOP & COMMIT:** Stage and commit.

#### Step 2: Next

- [ ] Do the thing at \`src/other.js\`

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] \`node -e "process.exit(0)"\` — exit 0

#### Step 2 STOP & COMMIT
`;

const TASKS = `## Step 1: Add feature

**Routing**: layer=x

**Files Affected**:
A src/feature.js
A test/feature.test.js
M test/legacy.test.js

**What Will Be Done**: x

## Step 2: Next

**Files Affected**:
A src/other.js
`;

// A Step whose every file is a test/support file routes to green-exception-no-production, the mode that accepts the whole-Step `green-exception` dispatch.
const PLAN_X = PLAN.replaceAll('src/feature.js', 'test/support/feature.js');
const TASKS_X = TASKS.replaceAll('src/feature.js', 'test/support/feature.js');

const INTERFACES ='## Step 1: Add feature\n\nexact contract\n';

function makeRepo({ tasks = true, exception = false } = {}) {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-apply-step-'));
  const repo = path.join(parent, 'demo');
  fs.mkdirSync(repo);
  git(['init', '-b', 'main'], repo);
  git(['config', 'user.email', 't@example.com'], repo);
  git(['config', 'user.name', 'T'], repo);
  fs.mkdirSync(path.join(repo, 'test'));
  fs.writeFileSync(path.join(repo, 'test', 'legacy.test.js'), "require('node:test')('x', () => {});\n");
  const dir = path.join(repo, 'openspec', 'changes', 'demo');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'implementation.md'), exception ? PLAN_X : PLAN);
  if (tasks) fs.writeFileSync(path.join(dir, 'tasks.md'), exception ? TASKS_X : TASKS);
  fs.writeFileSync(path.join(dir, 'interfaces.md'), INTERFACES);
  git(['add', '.'], repo);
  git(['commit', '-m', 'chore: initial'], repo);
  const captured = tool(['baseline', '--change', 'demo'], repo);
  assert.equal(captured.status, 0, captured.stderr);
  baselines.set(repo, captured.payload.baseline);
  return { parent, repo, planPath: path.join(dir, 'implementation.md') };
}

function writeFeature(repo, { passing, dir = 'src' }) {
  fs.mkdirSync(path.join(repo, dir), { recursive: true });
  fs.writeFileSync(path.join(repo, dir, 'feature.js'), 'module.exports = 1;\n');
  fs.writeFileSync(
    path.join(repo, 'test', 'feature.test.js'),
    `const { test } = require('node:test');\nconst assert = require('node:assert');\ntest('f', () => { assert.strictEqual(require('../${dir}/feature'), ${passing ? 1 : 2}); });\n`,
  );
}

const cleanup = (parent) => {
  for (const [repo, refs] of records) if (repo.startsWith(parent + path.sep)) {
    for (const ref of refs) fs.rmSync(ref.slice(0, ref.lastIndexOf('#')), { force: true });
    records.delete(repo);
  }
  for (const [repo, ref] of baselines) if (repo.startsWith(parent + path.sep)) {
    fs.rmSync(ref.slice(0, ref.lastIndexOf('#')), { force: true });
    for (const step of [1, 2]) fs.rmSync(receiptOf(repo, step), { force: true });
    baselines.delete(repo);
  }
  fs.rmSync(parent, { recursive: true, force: true });
};

test('statusLetter precedence MISMATCH > DEVIATION > WARN > OK', () => {
  assert.equal(statusLetter({ mismatch: true, deviation: true, warn: true }), 'MISMATCH');
  assert.equal(statusLetter({ mismatch: false, deviation: true, warn: true }), 'DEVIATION');
  assert.equal(statusLetter({ mismatch: false, deviation: false, warn: true }), 'WARN');
  assert.equal(statusLetter({ mismatch: false, deviation: false, warn: false }), 'OK');
});

test('classifyAutomated runs plain commands and returns free text as unjudged', () => {
  assert.deepEqual(classifyAutomated('`npm run lint` — exit 0'), { kind: 'run', command: 'npm run lint', expect: 'pass' });
  assert.deepEqual(classifyAutomated('`cmd` — exit ≠ 0'), { kind: 'run', command: 'cmd', expect: 'fail' });
  assert.equal(classifyAutomated('`cmd` — prints three lines').kind, 'unjudged');
  assert.equal(classifyAutomated('Looks right').kind, 'unjudged');
  assert.equal(classifyAutomated('RED verified — `x` failed').kind, 'covered');
});

test('parseStep reads command, RED paths, retirements and Automated items', () => {
  const info = parseStep(PLAN, 1);
  assert.equal(info.stepTestCommand, 'node --test test/feature.test.js');
  assert.deepEqual(info.retirements, ['test/old.test.js']);
  assert.ok(info.redPaths.includes('src/feature.js'));
  assert.equal(info.automated.length, 4);
  assert.equal(parseFilesAffected(TASKS, 1).declared.length, 3);
});

test('E1: without a Step test command line verify falls back to the Verify RED command', () => {
  const info = parseStep(PLAN.replace(/- \*\*Step test command:\*\*.*\n/, ''), 1);
  assert.equal(info.stepTestCommand, 'node --test test/feature.test.js');
});

test('verify red: failing assertion is ok, scratch is swept and printed', () => {
  const { parent, repo } = makeRepo();
  try {
    writeFeature(repo, { passing: false });
    fs.mkdirSync(path.join(repo, '.tmp', 'demo'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.tmp', 'demo', 'x'), 'x');
    const out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red', '--parent-was-absent'], repo, 'src/feature.js\ntest/feature.test.js\n');
    assert.equal(out.status, 0);
    assert.equal(out.payload.ok, true);
    assert.notEqual(out.payload.commands[0].exit, 0);
    assert.deepEqual(out.payload.sweep.lines, ['> Scratch cleanup: removed .tmp/demo/, .tmp/']);
    assert.equal(fs.existsSync(path.join(repo, '.tmp')), false);
    assert.equal(out.payload.retirements[0].absent, true);
  } finally {
    cleanup(parent);
  }
});

test('verify red: a passing test or an undeclared change is not ok', () => {
  const { parent, repo } = makeRepo();
  try {
    writeFeature(repo, { passing: true });
    fs.writeFileSync(path.join(repo, 'stray.js'), 'x');
    const out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red'], repo, 'src/feature.js\ntest/feature.test.js\n');
    assert.equal(out.payload.ok, false);
    assert.deepEqual(out.payload.out_of_allowed, ['stray.js']);
    assert.deepEqual(out.payload.unreported, ['stray.js']);
  } finally {
    cleanup(parent);
  }
});

test('verify green: runs Automated commands and returns free-text items as unjudged', () => {
  const { parent, repo } = makeRepo();
  try {
    writeFeature(repo, { passing: true });
    const out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green'], repo, 'src/feature.js\ntest/feature.test.js\n');
    assert.equal(out.payload.ok, false); // test file is not allowed for GREEN
    assert.deepEqual(out.payload.out_of_allowed, ['test/feature.test.js']);
    assert.equal(out.payload.commands.length, 2);
    assert.equal(out.payload.commands.every((c) => c.exit === 0), true);
    assert.equal(out.payload.unjudged.length, 1);
    assert.equal(out.payload.unjudged[0].reason, 'no-command');
  } finally {
    cleanup(parent);
  }
});

const ADD = 'src/feature.js\ntest/feature.test.js\ntest/legacy.test.js\n';
const ADD_X = 'test/support/feature.js\ntest/feature.test.js\ntest/legacy.test.js\n';
const MSG = 'feat: add feature\n\nBody.\n';

function closeInput(add, msg) {
  return `${add}---\n${msg}`;
}

test('close --dry-run reports OK and touches nothing', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    const head = git(['rev-parse', 'HEAD'], repo);
    const out = tool(['close', '--change', 'demo', '--step', '1', '--dry-run', '--guard-base', head.trim()], repo, closeInput(ADD, ''));
    assert.equal(out.payload.status_letter, 'OK');
    assert.match(out.payload.report_text, /demo — Step 1 — OK/);
    assert.match(out.payload.report_text, /src\/feature.js  \+1 -0/);
    assert.match(out.payload.report_text, /Plan cross-check:\n  No deviations/);
    assert.match(out.payload.report_text, /In sync/);
    assert.equal(out.payload.committed, false);
    assert.equal(git(['rev-parse', 'HEAD'], repo), head);
    assert.equal(fs.readFileSync(planPath, 'utf8'), PLAN);
  } finally {
    cleanup(parent);
  }
});

test('close --mark-only marks the Automated boxes of a declined commit and touches git nothing', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    writeFeature(repo, { passing: true });
    const head = git(['rev-parse', 'HEAD'], repo);
    const out = tool(['close', '--change', 'demo', '--step', '1', '--mark-only'], repo, '');
    assert.equal(out.status, 0, out.stderr);
    assert.equal(out.payload.reason, 'mark-only');
    assert.equal(out.payload.committed, false);
    assert.equal(out.payload.marked, 4);
    const plan = fs.readFileSync(planPath, 'utf8');
    assert.match(plan, /- \[x\] RED verified/);
    assert.match(plan, /- \[ \] Looks fine/); // Functional untouched
    assert.match(plan, /- \[ \] `node -e "process.exit\(0\)"` — exit 0\n\n#### Step 2 STOP/); // Step 2 untouched
    assert.equal(git(['rev-parse', 'HEAD'], repo), head);
    assert.equal(git(['diff', '--cached', '--name-only'], repo), '');
  } finally {
    cleanup(parent);
  }
});

test('close --mark-only rejects --dry-run', () => {
  const { parent, repo } = makeRepo();
  try {
    const out = tool(['close', '--change', 'demo', '--step', '1', '--mark-only', '--dry-run'], repo, '');
    assert.equal(out.status, 2);
  } finally {
    cleanup(parent);
  }
});

test('close marks Automated boxes on disk, then commits only the add-list', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    const head = git(['rev-parse', 'HEAD'], repo).trim();
    const out = tool(['close', '--change', 'demo', '--step', '1', '--guard-base', head], repo, closeInput(ADD, MSG));
    assert.equal(out.status, 0, out.stderr);
    assert.equal(out.payload.committed, true);
    assert.equal(out.payload.subject, 'feat: add feature');
    assert.match(out.payload.sha, /^[0-9a-f]{7,}$/);
    const plan = fs.readFileSync(planPath, 'utf8');
    assert.match(plan, /- \[x\] RED verified/);
    assert.match(plan, /- \[x\] Output reads sensibly/);
    assert.match(plan, /- \[ \] Looks fine/); // Functional untouched
    assert.match(plan, /- \[ \] `node -e "process.exit\(0\)"` — exit 0\n\n#### Step 2 STOP/); // Step 2 untouched
    const shown = git(['show', '--name-only', '--pretty=format:%s', 'HEAD'], repo);
    assert.match(shown, /feat: add feature/);
    assert.match(shown, /src\/feature.js/);
    assert.doesNotMatch(shown, /implementation.md/);
  } finally {
    cleanup(parent);
  }
});

test('close raises MISMATCH / DEVIATION / WARN by precedence', () => {
  const { parent, repo } = makeRepo();
  try {
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    fs.writeFileSync(path.join(repo, 'extra.js'), 'x\n');
    // Add-list misses extra.js -> only-in-git -> MISMATCH
    let out = tool(['close', '--change', 'demo', '--step', '1', '--dry-run'], repo, closeInput(ADD, ''));
    assert.equal(out.payload.status_letter, 'MISMATCH');
    assert.match(out.payload.report_text, /only-in-git: extra.js/);
    // Add-list includes extra.js -> in sync, but Extra vs Files Affected -> DEVIATION
    out = tool(['close', '--change', 'demo', '--step', '1', '--dry-run'], repo, closeInput(`${ADD}extra.js\n`, ''));
    assert.equal(out.payload.status_letter, 'DEVIATION');
    assert.match(out.payload.report_text, /Extra: extra.js/);
    // Declared but absent from the add-list: only-in-git -> MISMATCH wins; without tasks.md -> not available
  } finally {
    cleanup(parent);
  }
});

test('E8: without tasks.md the cross-check is not available and does not raise DEVIATION', () => {
  const { parent, repo } = makeRepo({ tasks: false });
  try {
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    const out = tool(['close', '--change', 'demo', '--step', '1', '--dry-run'], repo, closeInput(ADD, ''));
    assert.equal(out.payload.status_letter, 'OK');
    assert.match(out.payload.report_text, /Plan cross-check:\n  not available/);
    assert.match(out.payload.report_text, /Add-list matches the working tree; plan cross-check not available\./);
    assert.doesNotMatch(out.payload.report_text, /matches the working tree and the plan/);
  } finally {
    cleanup(parent);
  }
});

test('WARN when only the plan-external unrelated path stays out of the add-list', () => {
  const { parent, repo } = makeRepo({ tasks: false });
  try {
    writeFeature(repo, { passing: true });
    fs.writeFileSync(path.join(repo, 'notes.txt'), 'n\n');
    const out = tool(['close', '--change', 'demo', '--step', '1', '--dry-run'], repo, closeInput('src/feature.js\ntest/feature.test.js\n', ''));
    // notes.txt is changed but not in the add-list -> only-in-git -> MISMATCH outranks WARN
    assert.equal(out.payload.status_letter, 'MISMATCH');
    assert.match(out.payload.report_text, /Will NOT be committed:\n  notes.txt/);
  } finally {
    cleanup(parent);
  }
});

test('E5: a guard violation is reported, nothing is marked or committed', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    const base = git(['rev-parse', 'HEAD'], repo).trim();
    writeFeature(repo, { passing: true });
    git(['add', '.'], repo);
    git(['commit', '-m', 'feat: sneaky'], repo);
    const out = tool(['close', '--change', 'demo', '--step', '1', '--guard-base', base], repo, closeInput('src/feature.js\n', MSG));
    assert.equal(out.status, 1);
    assert.equal(out.payload.reason, 'guard-violation');
    assert.equal(out.payload.guard.verdict, 'violation');
    assert.equal(out.payload.committed, false);
    assert.equal(fs.readFileSync(planPath, 'utf8'), PLAN);
  } finally {
    cleanup(parent);
  }
});

test('E6: an empty add-list makes no commit', () => {
  const { parent, repo } = makeRepo();
  try {
    const out = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput('', MSG));
    assert.equal(out.payload.committed, false);
    assert.equal(out.payload.reason, 'empty-add-list');
  } finally {
    cleanup(parent);
  }
});

test('E6: a declared path with no change shows +0 -0 and a removal is staged as a deletion', () => {
  const { parent, repo } = makeRepo({ tasks: false });
  try {
    fs.appendFileSync(path.join(repo, 'openspec', 'changes', 'demo', 'implementation.md'), '\n');
    const planPath = path.join(repo, 'openspec', 'changes', 'demo', 'implementation.md');
    fs.writeFileSync(planPath, PLAN.replace('`src/feature.js`:', '`test/legacy.test.js`:'));
    replaceBaseline(repo, 'openspec/changes/demo/implementation.md\n');
    fs.rmSync(path.join(repo, 'test', 'legacy.test.js'));
    const dry = tool(['close', '--change', 'demo', '--step', '1', '--dry-run'], repo, closeInput('test/legacy.test.js\nghost.js\n', ''));
    assert.match(dry.payload.report_text, /ghost.js  \+0 -0/);
    const out = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput('test/legacy.test.js\n', 'refactor: drop legacy test\n'));
    assert.equal(out.payload.committed, true);
    assert.match(git(['show', '--name-status', '--pretty=format:', 'HEAD'], repo), /D\s+test\/legacy.test.js/);
  } finally {
    cleanup(parent);
  }
});

test('E7: a failing commit hook is reported, marks are reverted, no --no-verify retry', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    const hook = path.join(repo, '.git', 'hooks', 'pre-commit');
    fs.writeFileSync(hook, '#!/bin/sh\necho hook-says-no >&2\nexit 1\n', { mode: 0o755 });
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// adaptation\n');
    const out = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput(ADD, MSG));
    assert.equal(out.status, 1);
    assert.equal(out.payload.reason, 'commit-failed');
    assert.match(out.payload.error, /hook-says-no/);
    assert.equal(out.payload.committed, false);
    assert.equal(fs.readFileSync(planPath, 'utf8'), PLAN);
  } finally {
    cleanup(parent);
  }
});

test('an invalid commit message is refused before any mark or add', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    writeFeature(repo, { passing: true });
    const out = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput('src/feature.js\n', 'not conventional\n'));
    assert.equal(out.payload.reason, 'invalid-message');
    assert.equal(fs.readFileSync(planPath, 'utf8'), PLAN);
  } finally {
    cleanup(parent);
  }
});

test('usage errors exit 2', () => {
  const out = tool(['verify', '--change', 'demo', '--step', 'x'], os.tmpdir());
  assert.equal(out.status, 2);
});

function withUpdateLine(planPath) {
  const plan = fs.readFileSync(planPath, 'utf8').replace(
    '- **Step test command:**',
    '- **Existing tests to update:** `test/legacy.test.js` (`runtime`)\n- **Step test command:**',
  );
  fs.writeFileSync(planPath, plan);
  const repo = path.resolve(path.dirname(planPath), '..', '..', '..');
  replaceBaseline(repo, 'openspec/changes/demo/implementation.md\n');
}

test('verify red: a plan-named existing test to update is allowed', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    withUpdateLine(planPath);
    writeFeature(repo, { passing: false });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// updated\n');
    const out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red'], repo, 'src/feature.js\ntest/feature.test.js\ntest/legacy.test.js\n');
    assert.equal(out.payload.ok, true);
    assert.equal(out.payload.out_of_allowed.includes('test/legacy.test.js'), false);
  } finally {
    cleanup(parent);
  }
});

test('verify red: modifying an existing test the plan does not name is out of the allowed set', () => {
  const { parent, repo } = makeRepo();
  try {
    writeFeature(repo, { passing: false });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// sneaky\n');
    const out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red'], repo, 'src/feature.js\ntest/feature.test.js\ntest/legacy.test.js\n');
    assert.equal(out.payload.ok, false);
    assert.ok(out.payload.out_of_allowed.includes('test/legacy.test.js'));
  } finally {
    cleanup(parent);
  }
});

test('verify green: a plan-named existing test to update stays forbidden for GREEN', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    withUpdateLine(planPath);
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// updated\n');
    const out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green'], repo, 'src/feature.js\ntest/legacy.test.js\n');
    assert.equal(out.payload.ok, false);
    assert.ok(out.payload.out_of_allowed.includes('test/legacy.test.js'));
  } finally {
    cleanup(parent);
  }
});

function replaceBaseline(repo, planning = '') {
  const previous = baselines.get(repo);
  const captured = tool(['baseline', '--change', 'demo'], repo, planning);
  assert.equal(captured.status, 0, captured.stderr);
  baselines.set(repo, captured.payload.baseline);
  fs.rmSync(previous.slice(0, previous.lastIndexOf('#')), { force: true });
  return captured.payload.baseline;
}

function checkpoint(repo, dispatch, step = 1) {
  const out = tool(['dispatch-check', '--change', 'demo', '--step', String(step), '--dispatch', dispatch], repo);
  assert.equal(out.status, 0, out.stderr);
  return out.payload.checkpoint;
}

test('preflight is read-only, reuses parser and reports Step/line errors before execution', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    const valid = PLAN.replace('- [ ] Output reads sensibly — judge it\n', '');
    fs.writeFileSync(planPath, valid);
    const before = git(['status', '--porcelain'], repo);
    const out = tool(['preflight', '--change', 'demo'], repo);
    assert.equal(out.payload.ok, true, JSON.stringify(out.payload));
    assert.equal(git(['status', '--porcelain'], repo), before);
    assert.equal(fs.readFileSync(planPath, 'utf8'), valid);
    fs.writeFileSync(planPath, valid.replace('##### RED phase', '##### RED tests').replace('`src/feature.js`:', '`../../escape.js`:'));
    const bad = tool(['preflight', '--change', 'demo'], repo);
    assert.equal(bad.status, 1);
    assert.ok(bad.payload.errors.some((e) => e.step === 1 && e.line > 0));
    assert.equal(fs.existsSync(path.join(repo, 'src', 'feature.js')), false);
  } finally { cleanup(parent); }
});

test('preflight checks RED carry-through of existing tests and fixtures', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    fs.writeFileSync(planPath, PLAN.replace('- [ ] Output reads sensibly — judge it\n', ''));
    const tasksPath = path.join(repo, 'openspec', 'changes', 'demo', 'tasks.md');
    fs.writeFileSync(tasksPath, TASKS.replace('**What Will Be Done**: x', '**Existing Tests Broken**: `test/legacy.test.js` (`runtime`)'));
    assert.ok(tool(['preflight', '--change', 'demo'], repo).payload.errors.some((e) => e.reason.includes('not assigned to RED')));
    withUpdateLine(planPath);
    assert.equal(tool(['preflight', '--change', 'demo'], repo).payload.ok, true);
  } finally { cleanup(parent); }
});

test('unchanged unrelated staged and unstaged work is shown, preserved and excluded from commit', () => {
  const { parent, repo } = makeRepo({ exception: true });
  try {
    fs.writeFileSync(path.join(repo, 'notes.txt'), 'staged\n');
    git(['add', 'notes.txt'], repo);
    fs.appendFileSync(path.join(repo, 'notes.txt'), 'unstaged\n');
    const index = git(['ls-files', '--stage', 'notes.txt'], repo);
    replaceBaseline(repo);
    const cp = checkpoint(repo, 'green-exception');
    writeFeature(repo, { passing: true, dir: 'test/support' });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    const verified = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception', '--checkpoint', cp], repo, ADD_X);
    assert.equal(verified.payload.ok, true, JSON.stringify(verified.payload));
    assert.deepEqual(verified.payload.unrelated, ['notes.txt']);
    const out = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput(ADD_X, MSG));
    assert.equal(out.payload.committed, true, JSON.stringify(out.payload));
    assert.equal(out.payload.status_letter, 'WARN');
    assert.match(out.payload.report_text, /Will NOT be committed:\n  notes.txt/);
    assert.equal(git(['ls-files', '--stage', 'notes.txt'], repo), index);
    assert.equal(fs.readFileSync(path.join(repo, 'notes.txt'), 'utf8'), 'staged\nunstaged\n');
    assert.doesNotMatch(git(['show', '--name-only', '--pretty=format:', 'HEAD'], repo), /notes.txt|implementation.md/);
    fs.rmSync(cp.slice(0, cp.lastIndexOf('#')), { force: true });
  } finally { cleanup(parent); }
});

test('a learnings file modified at run start and rewritten during the run is coordinator-owned, never preserved work or Step work', () => {
  const { parent, repo } = makeRepo({ exception: true });
  try {
    const learnings = path.join(repo, 'SAI_LEARNINGS.md');
    fs.writeFileSync(learnings, '# SAI Learnings\n');
    git(['add', 'SAI_LEARNINGS.md'], repo);
    git(['commit', '-m', 'docs: learnings'], repo);
    fs.appendFileSync(learnings, 'promoted by an earlier stopped run\n');
    replaceBaseline(repo);
    const cp = checkpoint(repo, 'green-exception');
    writeFeature(repo, { passing: true, dir: 'test/support' });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    fs.appendFileSync(learnings, 'promoted by this run\n');
    const verified = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception', '--checkpoint', cp], repo, ADD_X);
    assert.equal(verified.payload.ok, true, JSON.stringify(verified.payload));
    assert.deepEqual(verified.payload.preservation_errors, []);
    assert.deepEqual(verified.payload.unreported, []);
    assert.deepEqual(verified.payload.unrelated, []);
    const inspected = tool(['inspect', '--change', 'demo', '--baseline', baselines.get(repo)], repo);
    assert.equal(inspected.status, 0, JSON.stringify(inspected.payload));
    assert.deepEqual(inspected.payload.preservation_errors, []);
    assert.equal(inspected.payload.changed.includes('SAI_LEARNINGS.md'), false);
    assert.equal(inspected.payload.protected.includes('SAI_LEARNINGS.md'), false);
    const out = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput(ADD_X, MSG));
    assert.equal(out.payload.committed, true, JSON.stringify(out.payload));
    assert.doesNotMatch(git(['show', '--name-only', '--pretty=format:', 'HEAD'], repo), /SAI_LEARNINGS/);
    assert.match(git(['status', '--porcelain'], repo), / M SAI_LEARNINGS\.md/);
    assert.equal(fs.readFileSync(learnings, 'utf8'), '# SAI Learnings\npromoted by an earlier stopped run\npromoted by this run\n');
    fs.rmSync(cp.slice(0, cp.lastIndexOf('#')), { force: true });
  } finally { cleanup(parent); }
});

test('initial dirty Step path stops before dispatch, even when its path is authorized', () => {
  const { parent, repo } = makeRepo({ exception: true });
  try {
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// unrelated\n');
    replaceBaseline(repo);
    const out = tool(['dispatch-check', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception'], repo);
    assert.equal(out.status, 1);
    assert.deepEqual(out.payload.conflicts, ['test/legacy.test.js']);
    assert.equal(out.payload.checkpoint, null);
  } finally { cleanup(parent); }
});

test('unchanged planning provenance is exact; changed unrelated work is never hidden on retry', () => {
  const { parent, repo } = makeRepo();
  try {
    fs.appendFileSync(path.join(repo, 'openspec', 'changes', 'demo', 'tasks.md'), '\n');
    fs.writeFileSync(path.join(repo, 'unrelated.txt'), 'initial\n');
    replaceBaseline(repo, 'openspec/changes/demo/tasks.md\n');
    writeFeature(repo, { passing: false });
    assert.equal(tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red'], repo, 'src/feature.js\ntest/feature.test.js\n').payload.ok, true);
    fs.appendFileSync(path.join(repo, 'unrelated.txt'), 'new\n');
    for (let round = 0; round < 2; round++) {
      const out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red'], repo, 'src/feature.js\ntest/feature.test.js\n');
      assert.equal(out.payload.ok, false);
      assert.ok(out.payload.preservation_errors.includes('unrelated.txt'));
    }
    assert.equal(fs.readFileSync(path.join(repo, 'unrelated.txt'), 'utf8'), 'initial\nnew\n');
    assert.equal(tool(['baseline', '--change', 'demo'], repo, 'openspec/changes/other/tasks.md\n').status, 2);
  } finally { cleanup(parent); }
});

test('missing or corrupt baseline blocks verification without recapture or command execution', () => {
  const { parent, repo } = makeRepo();
  try {
    const ref = baselines.get(repo);
    const file = ref.slice(0, ref.lastIndexOf('#'));
    fs.appendFileSync(file, 'broken');
    const out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red'], repo);
    assert.equal(out.status, 2);
    assert.match(out.stderr, /corrupt baseline/);
    fs.rmSync(file);
    assert.equal(tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput(ADD, MSG)).status, 2);
  } finally { cleanup(parent); }
});

test('dispatch checkpoint permits unchanged RED tests but detects GREEN test writes and plan writes', () => {
  const { parent, repo } = makeRepo();
  try {
    writeFeature(repo, { passing: true });
    const cp = checkpoint(repo, 'green');
    fs.appendFileSync(path.join(repo, 'src', 'feature.js'), '// GREEN\n');
    let out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green', '--checkpoint', cp], repo, 'src/feature.js\n');
    assert.equal(out.payload.ok, true, JSON.stringify(out.payload));
    fs.appendFileSync(path.join(repo, 'test', 'feature.test.js'), '// forbidden\n');
    fs.appendFileSync(path.join(repo, 'openspec', 'changes', 'demo', 'implementation.md'), '\n');
    out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green', '--checkpoint', cp], repo, 'src/feature.js\n');
    assert.equal(out.payload.ok, false);
    assert.ok(out.payload.out_of_allowed.includes('test/feature.test.js'));
    assert.ok(out.payload.preservation_errors.includes('openspec/changes/demo/implementation.md'));
    fs.rmSync(cp.slice(0, cp.lastIndexOf('#')), { force: true });
  } finally { cleanup(parent); }
});

test('bounded generated family resolves exact files and rejects extra, missing and overlap', () => {
  const { parent, repo } = makeRepo();
  try {
    const tasksPath = path.join(repo, 'openspec', 'changes', 'demo', 'tasks.md');
    fs.writeFileSync(tasksPath, TASKS.replace('A src/other.js', 'A generated/migration-*.sql — generated count=2'));
    replaceBaseline(repo, 'openspec/changes/demo/tasks.md\n');
    fs.mkdirSync(path.join(repo, 'generated'));
    const closeArgs = ['close', '--change', 'demo', '--step', '2'];
    fs.writeFileSync(path.join(repo, 'generated', 'migration-a.sql'), 'a\n');
    assert.equal(tool(closeArgs, repo, closeInput('generated/migration-a.sql\n', MSG)).payload.reason, 'scope-blocked');
    fs.writeFileSync(path.join(repo, 'generated', 'migration-b.sql'), 'b\n');
    fs.writeFileSync(path.join(repo, 'generated', 'migration-c.sql'), 'c\n');
    assert.equal(tool(closeArgs, repo, closeInput('generated/migration-a.sql\ngenerated/migration-b.sql\ngenerated/migration-c.sql\n', MSG)).payload.reason, 'scope-blocked');
    fs.rmSync(path.join(repo, 'generated', 'migration-c.sql'));
    fs.writeFileSync(tasksPath, fs.readFileSync(tasksPath, 'utf8').replace('generated count=2', 'generated count=2\nA generated/migration-a.sql'));
    assert.equal(tool(closeArgs, repo, closeInput('generated/migration-a.sql\ngenerated/migration-b.sql\n', MSG)).payload.reason, 'scope-blocked');
    fs.writeFileSync(tasksPath, TASKS.replace('A src/other.js', 'A generated/migration-*.sql — generated count=2'));
    const out = tool(closeArgs, repo, closeInput('generated/migration-a.sql\ngenerated/migration-b.sql\n', MSG));
    assert.equal(out.payload.committed, true, JSON.stringify(out.payload));
    assert.doesNotMatch(git(['show', '--name-only', '--pretty=format:', 'HEAD'], repo), /tasks.md|implementation.md/);
  } finally { cleanup(parent); }
});

test('two Step commits require fresh guard windows while retaining immutable file baseline', () => {
  const { parent, repo } = makeRepo();
  try {
    const baselineRef = baselines.get(repo);
    const guard = require('../sai/tools/no-commit-guard');
    const first = guard.snapshot(repo).head;
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    const one = tool(['close', '--change', 'demo', '--step', '1', '--guard-base', first], repo, closeInput(ADD, MSG));
    assert.equal(one.payload.committed, true);
    fs.writeFileSync(path.join(repo, 'src', 'other.js'), 'next\n');
    const old = tool(['close', '--change', 'demo', '--step', '2', '--guard-base', first], repo, closeInput('src/other.js\n', MSG));
    assert.equal(old.payload.reason, 'guard-violation');
    const second = guard.snapshot(repo).head;
    assert.notEqual(second, first);
    const two = tool(['close', '--change', 'demo', '--step', '2', '--guard-base', second, '--settled', one.payload.settled], repo, closeInput('src/other.js\n', MSG));
    assert.equal(two.payload.committed, true, JSON.stringify(two.payload));
    assert.equal(baselines.get(repo), baselineRef);
  } finally { cleanup(parent); }
});

test('guard remediation restores initial unrelated staging without changing content', () => {
  const { parent, repo } = makeRepo();
  try {
    fs.writeFileSync(path.join(repo, 'notes.txt'), 'staged\n');
    git(['add', 'notes.txt'], repo);
    fs.appendFileSync(path.join(repo, 'notes.txt'), 'unstaged\n');
    const index = git(['ls-files', '--stage', 'notes.txt'], repo);
    replaceBaseline(repo);
    git(['reset', 'HEAD'], repo); // the guard's pinned coordinator remediation
    const out = tool(['restore-unrelated-index', '--change', 'demo', '--baseline', baselines.get(repo)], repo);
    assert.equal(out.status, 0, out.stderr);
    assert.equal(git(['ls-files', '--stage', 'notes.txt'], repo), index);
    assert.equal(fs.readFileSync(path.join(repo, 'notes.txt'), 'utf8'), 'staged\nunstaged\n');
    fs.appendFileSync(path.join(repo, 'notes.txt'), 'new\n');
    assert.equal(tool(['restore-unrelated-index', '--change', 'demo', '--baseline', baselines.get(repo)], repo).status, 2);
  } finally { cleanup(parent); }
});

const RED_REPORT = 'src/feature.js\ntest/feature.test.js\n';
const redVerify = (repo, cp, report = RED_REPORT) => tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red', '--checkpoint', cp], repo, report);
const exclude = (repo, pattern) => fs.appendFileSync(path.join(repo, '.git', 'info', 'exclude'), `${pattern}\n`);

test('new out-of-scope modifications, deletes, renames and exclusion-file edits remain discrepancies', () => {
  const { parent, repo } = makeRepo();
  try {
    const cp = checkpoint(repo, 'red');
    writeFeature(repo, { passing: false });
    fs.renameSync(path.join(repo, 'test', 'legacy.test.js'), path.join(repo, 'test', 'renamed.test.js'));
    fs.writeFileSync(path.join(repo, '.gitignore'), 'ignored.txt\n');
    fs.writeFileSync(path.join(repo, 'ignored.txt'), 'ignored\n');
    fs.writeFileSync(path.join(repo, 'stray.txt'), 'visible\n');
    const out = redVerify(repo, cp);
    assert.equal(out.payload.ok, false);
    for (const p of ['test/legacy.test.js', 'test/renamed.test.js', '.gitignore', 'stray.txt']) assert.ok(out.payload.out_of_allowed.includes(p), p);
    assert.ok(!out.payload.out_of_allowed.includes('ignored.txt'));
  } finally { cleanup(parent); }
});

test('an ignored file created after the checkpoint is no discrepancy', () => {
  const { parent, repo } = makeRepo();
  try {
    exclude(repo, 'ignored.txt');
    const cp = checkpoint(repo, 'red');
    writeFeature(repo, { passing: false });
    fs.writeFileSync(path.join(repo, 'ignored.txt'), 'build output\n');
    const out = redVerify(repo, cp);
    assert.ok(!out.payload.out_of_allowed.includes('ignored.txt'));
    assert.equal(out.payload.ok, true, JSON.stringify(out.payload));
    assert.equal(fs.readFileSync(path.join(repo, 'ignored.txt'), 'utf8'), 'build output\n');
  } finally { cleanup(parent); }
});

test('a Step command that creates, changes and deletes ignored paths passes verification', () => {
  const { parent, repo } = makeRepo();
  try {
    fs.writeFileSync(path.join(repo, '.gitignore'), 'bin/\n');
    git(['add', '.gitignore'], repo);
    git(['commit', '-m', 'chore: ignore bin'], repo);
    fs.mkdirSync(path.join(repo, 'bin'));
    fs.writeFileSync(path.join(repo, 'bin', 'old.txt'), 'old\n');
    fs.writeFileSync(path.join(repo, 'bin', 'gone.txt'), 'gone\n');
    replaceBaseline(repo);
    const cp = checkpoint(repo, 'red');
    writeFeature(repo, { passing: false });
    fs.writeFileSync(path.join(repo, 'test', 'feature.test.js'), [
      "const fs = require('fs');",
      "fs.writeFileSync('bin/new.txt', 'new');",
      "fs.appendFileSync('bin/old.txt', 'rebuilt');",
      "fs.rmSync('bin/gone.txt', { force: true });",
      "require('node:test')('f', () => { require('node:assert').strictEqual(require('../src/feature'), 2); });",
      '',
    ].join('\n'));
    const out = redVerify(repo, cp);
    assert.equal(out.payload.ok, true, JSON.stringify(out.payload));
    assert.deepEqual(out.payload.out_of_allowed, []);
    assert.ok(fs.existsSync(path.join(repo, 'bin', 'new.txt')));
    assert.ok(!fs.existsSync(path.join(repo, 'bin', 'gone.txt')));
  } finally { cleanup(parent); }
});

test('a tracked file matching an ignore pattern is still a discrepancy', () => {
  const { parent, repo } = makeRepo();
  try {
    fs.writeFileSync(path.join(repo, '.gitignore'), '*.log\n');
    fs.writeFileSync(path.join(repo, 'kept.log'), 'tracked\n');
    git(['add', '.gitignore'], repo);
    git(['add', '-f', 'kept.log'], repo);
    git(['commit', '-m', 'chore: track a log'], repo);
    replaceBaseline(repo);
    const cp = checkpoint(repo, 'red');
    writeFeature(repo, { passing: false });
    fs.appendFileSync(path.join(repo, 'kept.log'), 'edited\n');
    const out = redVerify(repo, cp);
    assert.equal(out.payload.ok, false);
    assert.ok(out.payload.out_of_allowed.includes('kept.log'), JSON.stringify(out.payload));
  } finally { cleanup(parent); }
});

test('a file that becomes ignored between captures is a discrepancy', () => {
  const { parent, repo } = makeRepo();
  try {
    fs.writeFileSync(path.join(repo, 'notes.txt'), 'visible\n');
    replaceBaseline(repo);
    const cp = checkpoint(repo, 'red');
    writeFeature(repo, { passing: false });
    exclude(repo, 'notes.txt');
    const out = redVerify(repo, cp);
    assert.equal(out.payload.ok, false);
    assert.ok(out.payload.out_of_allowed.includes('notes.txt'), JSON.stringify(out.payload));
  } finally { cleanup(parent); }
});

test('an ignored path declared by the plan is compared', () => {
  const { parent, repo } = makeRepo();
  try {
    exclude(repo, 'src/feature.js');
    const cp = checkpoint(repo, 'red');
    writeFeature(repo, { passing: false });
    const reported = redVerify(repo, cp);
    assert.deepEqual(reported.payload.only_in_subagent, []);
    assert.equal(reported.payload.ok, true, JSON.stringify(reported.payload));
    const silent = redVerify(repo, cp, 'test/feature.test.js\n');
    assert.equal(silent.payload.ok, false);
    assert.ok(silent.payload.unreported.includes('src/feature.js'), JSON.stringify(silent.payload));
  } finally { cleanup(parent); }
});

test('both harnesses share delivery, baseline, guard and pinned continuation recommendation rules', () => {
  const read = (p) => fs.readFileSync(path.join(REPO_ROOT, p), 'utf8');
  for (const harness of ['claude', 'opencode']) {
    assert.match(read(`commands/${harness}/sai-4-apply.md`), /sai\/commands\/apply\/command-bootstrap\.md/);
    assert.match(read(`commands/${harness}/sai-3-implement.md`), /sai\/commands\/implement\/command-bootstrap\.md/);
  }
  assert.match(read('sai/commands/implement/steps/validation.md'), /preflight --change/);
  assert.match(read('sai/commands/apply/coordinator.md'), /never recapture/);
  assert.match(read('sai/commands/apply/runner.md'), /new `no-commit-guard.js snapshot`/);
  assert.match(read('sai/policies/stop-options.md'), /least further human intervention/);
  assert.match(read('sai/policies/stop-options.md'), /Preserve its pinned options, values, and order/);
});

test('a declined earlier Step retains owned changes without contaminating the next Step commit', () => {
  const { parent, repo } = makeRepo();
  try {
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    const closed = tool(['close', '--change', 'demo', '--step', '1', '--mark-only'], repo);
    assert.equal(closed.status, 0, closed.stderr);
    const settled = closed.payload.settled;
    const checked = tool(['dispatch-check', '--change', 'demo', '--step', '2', '--dispatch', 'green-direct', '--settled', settled], repo);
    assert.equal(checked.status, 0, checked.stderr);
    fs.writeFileSync(path.join(repo, 'src', 'other.js'), 'next\n');
    const verified = tool(['verify', '--change', 'demo', '--step', '2', '--dispatch', 'green-direct', '--checkpoint', checked.payload.checkpoint, '--settled', settled], repo, 'src/other.js\n');
    assert.equal(verified.payload.ok, true, JSON.stringify(verified.payload));
    const out = tool(['close', '--change', 'demo', '--step', '2', '--settled', settled], repo, closeInput('src/other.js\n', MSG));
    assert.equal(out.payload.committed, true, JSON.stringify(out.payload));
    assert.equal(git(['show', '--name-only', '--pretty=format:', 'HEAD'], repo).trim(), 'src/other.js');
    assert.equal(fs.readFileSync(path.join(repo, 'src', 'feature.js'), 'utf8'), 'module.exports = 1;\n');
  } finally { cleanup(parent); }
});

test('exported APIs fail closed on omitted baseline, checkpoint and guard; declined commits check HEAD', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    const api = require(TOOL);
    const opts = { cwd: repo, change: 'demo', step: 1, dispatch: 'red' };
    assert.throws(() => api.verify(opts, ''), /baseline/);
    assert.throws(() => api.close(opts, ''), /baseline/);
    opts.baseline = baselines.get(repo);
    assert.throws(() => api.verify(opts, ''), /checkpoint/);
    for (const mode of [{}, { dryRun: true }, { markOnly: true }]) assert.throws(() => api.close({ ...opts, ...mode }, ''), /guard-base/);
    const base = git(['rev-parse', 'HEAD'], repo).trim();
    fs.writeFileSync(path.join(repo, 'unauthorized.txt'), 'x');
    git(['add', 'unauthorized.txt'], repo);
    git(['commit', '-m', 'chore: unauthorized'], repo);
    const out = tool(['close', '--change', 'demo', '--step', '1', '--mark-only', '--guard-base', base], repo);
    assert.equal(out.status, 1);
    assert.equal(out.payload.reason, 'guard-violation');
    assert.equal(fs.readFileSync(planPath, 'utf8'), PLAN);
  } finally { cleanup(parent); }
});

test('stable run identity refuses recapture after writes and after missing-record loss', () => {
  const { parent, repo } = makeRepo();
  try {
    const args = ['baseline', '--change', 'demo', '--run-id', require('crypto').randomUUID()];
    const first = tool(args, repo);
    assert.equal(first.status, 0, first.stderr);
    fs.writeFileSync(path.join(repo, 'stray.txt'), 'outside scope');
    assert.equal(tool(args, repo).status, 2);
    fs.rmSync(first.payload.baseline.split('#')[0]);
    assert.equal(tool(args, repo).status, 2);
    assert.equal(fs.readFileSync(path.join(repo, 'stray.txt'), 'utf8'), 'outside scope');
  } finally { cleanup(parent); }
});

test('preflight rejects missing/invalid/incompatible existing-test modes and production paths', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    const valid = PLAN.replace('- [ ] Output reads sensibly — judge it\n', '');
    const tasksPath = path.join(repo, 'openspec', 'changes', 'demo', 'tasks.md');
    for (const [pathName, taskMode, redMode] of [['test/legacy.test.js', '', 'runtime'], ['test/legacy.test.js', 'invalid', 'runtime'], ['test/legacy.test.js', 'compile', 'runtime'], ['src/core.js', 'runtime', 'runtime'], ['test/legacy.test.js', 'runtime', '']]) {
      fs.writeFileSync(tasksPath, TASKS.replace('**What Will Be Done**: x', `**Existing Tests Broken**: \`${pathName}\` (${taskMode})`));
      fs.writeFileSync(planPath, valid.replace('- **Step test command:**', `- **Existing tests to update:** \`${pathName}\` (${redMode})\n- **Step test command:**`));
      assert.equal(tool(['preflight', '--change', 'demo'], repo).payload.ok, false, `${pathName}/${taskMode}/${redMode}`);
    }
  } finally { cleanup(parent); }
});

test('preflight rejects same-command conflicting expectations', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    fs.writeFileSync(planPath, PLAN.replace('- [ ] Output reads sensibly — judge it', '- [ ] `node -e "process.exit(0)"` — exit != 0'));
    const out = tool(['preflight', '--change', 'demo'], repo);
    assert.ok(out.payload.errors.some((e) => e.reason.includes('conflicting expectations')));
  } finally { cleanup(parent); }
});

test('baseline-only verification and no-checkpoint close reject worker plan edits before commands or marking', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    writeFeature(repo, { passing: false });
    fs.writeFileSync(planPath, PLAN.replace('node --test test/feature.test.js', 'node -e "require(\'fs\').writeFileSync(\'ran.txt\',\'x\');process.exit(1)"'));
    const mutated = fs.readFileSync(planPath, 'utf8');
    const verified = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red'], repo, 'src/feature.js\ntest/feature.test.js\n');
    assert.equal(verified.status, 2);
    assert.match(verified.stderr, /implementation.md changed/);
    assert.equal(fs.existsSync(path.join(repo, 'ran.txt')), false);
    for (const flag of ['--mark-only', '--dry-run']) {
      const closed = tool(['close', '--change', 'demo', '--step', '1', flag], repo);
      assert.equal(closed.status, 2);
      assert.equal(fs.readFileSync(planPath, 'utf8'), mutated);
    }
  } finally { cleanup(parent); }
});

test('explicit coordinator plan checkpoint permits authorized bookkeeping; settled state permits later cumulative checks', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    fs.appendFileSync(planPath, '\n## Appendix: Plan vs Final Implementation\n\nCoordinator-authored deviation.\n');
    const receipt = tool(['checkpoint-plan', '--change', 'demo'], repo);
    assert.equal(receipt.status, 0, receipt.stderr);
    const closed = tool(['close', '--change', 'demo', '--step', '1', '--mark-only', '--plan-checkpoint', receipt.payload.plan_checkpoint], repo);
    assert.equal(closed.status, 0, closed.stderr);
    fs.writeFileSync(path.join(repo, 'src', 'other.js'), 'next\n');
    const verified = tool(['verify', '--change', 'demo', '--step', '2', '--dispatch', 'green-direct', '--settled', closed.payload.settled], repo, 'src/other.js\n');
    assert.equal(verified.payload.ok, true, JSON.stringify(verified));
    fs.appendFileSync(planPath, '\nforbidden later worker change\n');
    const bad = tool(['verify', '--change', 'demo', '--step', '2', '--dispatch', 'green-direct', '--settled', closed.payload.settled], repo, 'src/other.js\n');
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /implementation.md changed/);
  } finally { cleanup(parent); }
});

const GREEN_LINE = '- [ ] Copy and paste code below into `src/feature.js`:';
const EXTRA_PLAN = PLAN.replace(GREEN_LINE, `${GREEN_LINE}\n- [ ] Copy and paste code below into \`src/extra.js\`:`).replace('- [ ] Output reads sensibly — judge it\n', '');

function planWithExtra(repo, planPath) {
  fs.writeFileSync(planPath, EXTRA_PLAN);
  replaceBaseline(repo, 'openspec/changes/demo/implementation.md\n');
}

function tasksPathOf(repo) {
  return path.join(repo, 'openspec', 'changes', 'demo', 'tasks.md');
}

const EXTRA_ADD = `${ADD}src/extra.js\n`;
const WITH_EXTRA_TASKS = TASKS.replace('A src/feature.js', 'A src/feature.js\nA src/extra.js');

function writeExtra(repo) {
  writeFeature(repo, { passing: true });
  fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
  fs.writeFileSync(path.join(repo, 'src', 'extra.js'), 'module.exports = 2;\n');
}

function committedPaths(repo) {
  return git(['show', '--name-only', '--pretty=format:', 'HEAD'], repo).split('\n').filter(Boolean);
}

test('preflight reports a path the plan names for a Step that its Files Affected omits', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    fs.writeFileSync(planPath, EXTRA_PLAN);
    const bad = tool(['preflight', '--change', 'demo'], repo);
    const found = bad.payload.errors.filter((e) => e.file === 'tasks.md' && e.step === 1 && e.reason.includes('src/extra.js'));
    assert.equal(found.length, 1, JSON.stringify(bad.payload.errors));
    assert.ok(found[0].line > 0);
    fs.writeFileSync(tasksPathOf(repo), WITH_EXTRA_TASKS);
    assert.equal(tool(['preflight', '--change', 'demo'], repo).payload.ok, true);
  } finally { cleanup(parent); }
});

test('preflight treats a retirement as metadata and a generated family as covering its members', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    fs.writeFileSync(planPath, EXTRA_PLAN.replace('`src/extra.js`', '`db/mig-a.sql`'));
    fs.writeFileSync(tasksPathOf(repo), TASKS.replace('A src/feature.js', 'A src/feature.js\nA db/mig-*.sql — generated count=1'));
    const out = tool(['preflight', '--change', 'demo'], repo);
    assert.equal(out.payload.ok, true, JSON.stringify(out.payload.errors));
  } finally { cleanup(parent); }
});

test('preflight ignores the headings apply writes under its own appendix and still rejects a stray Step heading', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    const valid = PLAN.replace('- [ ] Output reads sensibly — judge it\n', '');
    const appendix = '\n## Appendix: Plan vs Final Implementation\n\n### Step 1 — Extra file\n\n**Plan:** a\n**Final:** b\n**Reason:** c\n';
    fs.writeFileSync(planPath, valid + appendix);
    assert.equal(tool(['preflight', '--change', 'demo'], repo).payload.ok, true);
    fs.writeFileSync(planPath, valid.replace('#### Step 2: Next', '### Step 2 — Next') + appendix);
    assert.ok(tool(['preflight', '--change', 'demo'], repo).payload.errors.some((e) => e.reason === 'unrecognized Step heading'));
    fs.writeFileSync(planPath, `${valid}\n## Notes\n\n### Step 9 — stray\n`);
    assert.ok(tool(['preflight', '--change', 'demo'], repo).payload.errors.some((e) => e.reason === 'unrecognized Step heading'));
  } finally { cleanup(parent); }
});

test('an extra file refuses close; a registered tasks.md amendment lets the same Step commit with it', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    planWithExtra(repo, planPath);
    writeExtra(repo);
    const refused = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput(EXTRA_ADD, MSG));
    assert.equal(refused.payload.reason, 'scope-blocked');
    assert.equal(refused.payload.status_letter, 'DEVIATION');
    fs.writeFileSync(tasksPathOf(repo), WITH_EXTRA_TASKS);
    const unregistered = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput(EXTRA_ADD, MSG));
    assert.equal(unregistered.payload.reason, 'scope-blocked');
    assert.match(unregistered.payload.error, /tasks\.md/);
    const receipt = tool(['checkpoint-plan', '--change', 'demo'], repo);
    assert.deepEqual(receipt.payload.registers, ['openspec/changes/demo/tasks.md']);
    const closed = tool(['close', '--change', 'demo', '--step', '1', '--plan-checkpoint', receipt.payload.plan_checkpoint], repo, closeInput(EXTRA_ADD, MSG));
    assert.equal(closed.payload.committed, true, JSON.stringify(closed.payload));
    assert.equal(closed.payload.status_letter, 'OK');
    assert.match(closed.payload.report_text, /openspec\/changes\/demo\/tasks\.md/);
    assert.ok(committedPaths(repo).includes('openspec/changes/demo/tasks.md'));
    assert.ok(committedPaths(repo).includes('src/extra.js'));
    assert.doesNotMatch(committedPaths(repo).join('\n'), /implementation\.md/);
    assert.equal(git(['status', '--porcelain', '--', 'openspec/changes/demo/tasks.md'], repo), '');
  } finally { cleanup(parent); }
});

test('a registered removal of a declared file that did not change lets the Step commit', () => {
  const { parent, repo } = makeRepo();
  try {
    writeFeature(repo, { passing: true });
    const add = 'src/feature.js\ntest/feature.test.js\n';
    const refused = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput(add, MSG));
    assert.equal(refused.payload.reason, 'scope-blocked');
    assert.match(refused.payload.report_text, /Missing: test\/legacy\.test\.js/);
    fs.writeFileSync(tasksPathOf(repo), TASKS.replace('M test/legacy.test.js\n', ''));
    const receipt = tool(['checkpoint-plan', '--change', 'demo'], repo);
    const closed = tool(['close', '--change', 'demo', '--step', '1', '--plan-checkpoint', receipt.payload.plan_checkpoint], repo, closeInput(add, MSG));
    assert.equal(closed.payload.committed, true, JSON.stringify(closed.payload));
    assert.deepEqual(committedPaths(repo).sort(), ['openspec/changes/demo/tasks.md', 'src/feature.js', 'test/feature.test.js']);
  } finally { cleanup(parent); }
});

test('an omitted production file passes verify once its amendment is registered, and a later edit is an error again', () => {
  const { parent, repo } = makeRepo({ exception: true });
  try {
    writeFeature(repo, { passing: true, dir: 'test/support' });
    const cp = checkpoint(repo, 'green-exception');
    fs.writeFileSync(path.join(repo, 'test', 'support', 'omitted.js'), 'module.exports = 3;\n');
    const add = 'test/support/omitted.js\ntest/legacy.test.js\n';
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    const before = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception', '--checkpoint', cp], repo, add);
    assert.equal(before.payload.ok, false);
    assert.deepEqual(before.payload.out_of_allowed, ['test/support/omitted.js']);
    fs.writeFileSync(tasksPathOf(repo), TASKS_X.replace('A test/support/feature.js', 'A test/support/feature.js\nA test/support/omitted.js'));
    const receipt = tool(['checkpoint-plan', '--change', 'demo'], repo);
    const args = ['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception', '--checkpoint', cp, '--plan-checkpoint', receipt.payload.plan_checkpoint];
    const after = tool(args, repo, add);
    assert.equal(after.payload.ok, true, JSON.stringify(after.payload));
    assert.deepEqual(after.payload.preservation_errors, []);
    fs.appendFileSync(tasksPathOf(repo), '\nunregistered\n');
    const edited = tool(args, repo, add);
    assert.equal(edited.payload.ok, false);
    assert.ok(edited.payload.preservation_errors.includes('openspec/changes/demo/tasks.md'));
    fs.rmSync(cp.slice(0, cp.lastIndexOf('#')), { force: true });
  } finally { cleanup(parent); }
});

test('a worker edit of a planning artifact is an error even when the Step declares it, and every artifact is covered', () => {
  const { parent, repo } = makeRepo();
  try {
    const names = ['tasks.md', 'interfaces.md', 'proposal.md', 'design.md'];
    const dir = path.join(repo, 'openspec', 'changes', 'demo');
    for (const name of names.slice(1)) fs.writeFileSync(path.join(dir, name), `# ${name}\n`);
    git(['add', '.'], repo);
    git(['commit', '-m', 'chore: planning'], repo);
    replaceBaseline(repo);
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    for (const name of names) fs.appendFileSync(path.join(dir, name), '\nworker\n');
    const declared = names.map((n) => `openspec/changes/demo/${n}`);
    const verified = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception'], repo, `${ADD}${declared.join('\n')}\n`);
    assert.equal(verified.payload.ok, false);
    assert.deepEqual([...verified.payload.preservation_errors].sort(), [...declared].sort());
    const refused = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput(ADD, MSG));
    assert.equal(refused.payload.reason, 'scope-blocked');
    const receipt = tool(['checkpoint-plan', '--change', 'demo'], repo);
    assert.deepEqual([...receipt.payload.registers].sort(), [...declared].sort());
  } finally { cleanup(parent); }
});

test('an amendment committed with a Step stays accepted for later Steps and cannot be edited by their workers', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    planWithExtra(repo, planPath);
    writeExtra(repo);
    fs.writeFileSync(tasksPathOf(repo), WITH_EXTRA_TASKS);
    const receipt = tool(['checkpoint-plan', '--change', 'demo'], repo);
    const closed = tool(['close', '--change', 'demo', '--step', '1', '--plan-checkpoint', receipt.payload.plan_checkpoint], repo, closeInput(EXTRA_ADD, MSG));
    assert.equal(closed.payload.committed, true, JSON.stringify(closed.payload));
    fs.writeFileSync(path.join(repo, 'src', 'other.js'), 'next\n');
    const ok = tool(['verify', '--change', 'demo', '--step', '2', '--dispatch', 'green-direct', '--settled', closed.payload.settled], repo, 'src/other.js\n');
    assert.equal(ok.payload.ok, true, JSON.stringify(ok.payload));
    fs.appendFileSync(tasksPathOf(repo), '\nlate worker edit\n');
    const bad = tool(['verify', '--change', 'demo', '--step', '2', '--dispatch', 'green-direct', '--settled', closed.payload.settled], repo, 'src/other.js\n');
    assert.equal(bad.payload.ok, false);
    assert.ok(bad.payload.preservation_errors.includes('openspec/changes/demo/tasks.md'));
  } finally { cleanup(parent); }
});

const IMPL = 'openspec/changes/demo/implementation.md';
const TASKS_REL = 'openspec/changes/demo/tasks.md';

// /sai-1-spec and /sai-2-design never commit: the planning artifacts reach apply untracked.
function untrackedPlanning(repo, planPath) {
  const dir = path.join(repo, 'openspec', 'changes', 'demo');
  for (const name of ['interfaces.md', 'proposal.md', 'design.md']) fs.writeFileSync(path.join(dir, name), `# ${name}\n`);
  git(['rm', '--cached', '-q', TASKS_REL], repo);
  git(['commit', '-m', 'chore: untrack tasks'], repo);
  fs.writeFileSync(planPath, EXTRA_PLAN);
  fs.writeFileSync(path.join(repo, 'notes.txt'), 'unrelated\n');
}

for (const [label, planning] of [
  ['not supplied as planning inputs', `${IMPL}\n`],
  ['supplied as planning inputs', `${IMPL}\n${TASKS_REL}\nopenspec/changes/demo/design.md\n`],
]) {
  test(`an amendment of an untracked planning artifact (${label}) commits with the Step; unregistered edits and unrelated work stay protected`, () => {
    const { parent, repo, planPath } = makeRepo();
    try {
      untrackedPlanning(repo, planPath);
      replaceBaseline(repo, planning);
      writeExtra(repo);
      fs.writeFileSync(tasksPathOf(repo), WITH_EXTRA_TASKS);
      const designPath = path.join(repo, 'openspec', 'changes', 'demo', 'design.md');
      fs.appendFileSync(designPath, '\nworker edit\n');
      const bad = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception'], repo, EXTRA_ADD);
      assert.equal(bad.payload.ok, false);
      assert.ok(bad.payload.preservation_errors.includes('openspec/changes/demo/design.md'));
      fs.writeFileSync(designPath, '# design.md\n');
      const receipt = tool(['checkpoint-plan', '--change', 'demo'], repo);
      assert.deepEqual(receipt.payload.registers, [TASKS_REL]);
      const args = ['--plan-checkpoint', receipt.payload.plan_checkpoint];
      const verified = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception', ...args], repo, EXTRA_ADD);
      assert.equal(verified.payload.ok, true, JSON.stringify(verified.payload));
      assert.deepEqual(verified.payload.preservation_errors, []);
      const closed = tool(['close', '--change', 'demo', '--step', '1', ...args], repo, closeInput(EXTRA_ADD, MSG));
      assert.equal(closed.payload.committed, true, JSON.stringify(closed.payload));
      assert.ok(committedPaths(repo).includes(TASKS_REL));
      assert.doesNotMatch(committedPaths(repo).join('\n'), /notes\.txt|design\.md|interfaces\.md|implementation\.md/);
      assert.equal(fs.readFileSync(path.join(repo, 'notes.txt'), 'utf8'), 'unrelated\n');
      assert.match(git(['status', '--porcelain'], repo), /notes\.txt/);
    } finally { cleanup(parent); }
  });
}

test('a run-start amendment declared at baseline commits with the first Step that closes', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    untrackedPlanning(repo, planPath);
    fs.writeFileSync(tasksPathOf(repo), WITH_EXTRA_TASKS);
    assert.equal(tool(['baseline', '--change', 'demo'], repo, `${IMPL}\namended: ${IMPL}\n`).status, 2);
    replaceBaseline(repo, `${IMPL}\namended: ${TASKS_REL}\n`);
    assert.equal(tool(['preflight', '--change', 'demo'], repo).payload.ok, true);
    writeExtra(repo);
    const verified = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception'], repo, EXTRA_ADD);
    assert.equal(verified.payload.ok, true, JSON.stringify(verified.payload));
    const closed = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput(EXTRA_ADD, MSG));
    assert.equal(closed.payload.committed, true, JSON.stringify(closed.payload));
    assert.ok(committedPaths(repo).includes(TASKS_REL));
    assert.equal(git(['status', '--porcelain', '--', TASKS_REL], repo), '');
    // A later mid-run amendment of the same artifact is registered and committed with its own Step.
    fs.writeFileSync(path.join(repo, 'src', 'other.js'), 'next\n');
    fs.writeFileSync(tasksPathOf(repo), WITH_EXTRA_TASKS + '\n**What Will Be Done**: amended\n');
    const unregistered = tool(['verify', '--change', 'demo', '--step', '2', '--dispatch', 'green-direct', '--settled', closed.payload.settled], repo, 'src/other.js\n');
    assert.equal(unregistered.payload.ok, false);
    const receipt = tool(['checkpoint-plan', '--change', 'demo', '--settled', closed.payload.settled], repo);
    assert.deepEqual(receipt.payload.registers, [TASKS_REL]);
    const second = tool(['close', '--change', 'demo', '--step', '2', '--settled', closed.payload.settled, '--plan-checkpoint', receipt.payload.plan_checkpoint], repo, closeInput('src/other.js\n', 'feat: other\n\nBody.\n'));
    assert.equal(second.payload.committed, true, JSON.stringify(second.payload));
    assert.ok(committedPaths(repo).includes(TASKS_REL));
  } finally { cleanup(parent); }
});

// Already-satisfied mode: the human-confirmed close of a Step whose RED returned `passes`.
function satisfiedRepo() {
  const made = makeRepo();
  const { repo } = made;
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'feature.js'), 'module.exports = 1;\n');
  git(['add', '.'], repo);
  git(['commit', '-m', 'feat: existing behavior'], repo);
  replaceBaseline(repo);
  const cp = checkpoint(repo, 'red');
  fs.writeFileSync(
    path.join(repo, 'test', 'feature.test.js'),
    "const { test } = require('node:test');\nconst assert = require('node:assert');\ntest('f', () => { assert.strictEqual(require('../src/feature'), 1); });\n",
  );
  return { ...made, cp };
}
const satisfiedVerify = (repo, cp, extra = []) => tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red', '--checkpoint', cp, ...extra], repo, 'test/feature.test.js\n');

test('already-satisfied verify accepts a passing test with untouched production files; plain red verify does not', () => {
  const { parent, repo, cp } = satisfiedRepo();
  try {
    assert.equal(satisfiedVerify(repo, cp).payload.ok, false);
    const out = satisfiedVerify(repo, cp, ['--already-satisfied']);
    assert.equal(out.payload.ok, true, JSON.stringify(out.payload));
    assert.equal(out.payload.already_satisfied, true);
    assert.deepEqual(out.payload.out_of_allowed, []);
    assert.ok(out.payload.untouched.includes('src/feature.js'));
    assert.ok(out.payload.commands.some((c) => c.label === 'step-test-command' && c.expect === 'pass' && c.exit === 0));
    assert.ok(out.payload.commands.some((c) => c.label === 'automated'));
    fs.rmSync(cp.slice(0, cp.lastIndexOf('#')), { force: true });
  } finally { cleanup(parent); }
});

test('already-satisfied verify still fails a failing Automated item and any production change', () => {
  const { parent, repo, cp } = satisfiedRepo();
  try {
    fs.appendFileSync(path.join(repo, 'src', 'feature.js'), '// touched\n');
    const out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red', '--checkpoint', cp, '--already-satisfied'], repo, 'test/feature.test.js\nsrc/feature.js\n');
    assert.equal(out.payload.ok, false);
    assert.ok(out.payload.out_of_allowed.includes('src/feature.js'));
    fs.rmSync(cp.slice(0, cp.lastIndexOf('#')), { force: true });
  } finally { cleanup(parent); }
});

test('already-satisfied close reports untouched production files without DEVIATION and commits tests only', () => {
  const { parent, repo, planPath, cp } = satisfiedRepo();
  try {
    assert.equal(satisfiedVerify(repo, cp, ['--already-satisfied']).payload.ok, true);
    const head = git(['rev-parse', 'HEAD'], repo).trim();
    const dry = tool(['close', '--change', 'demo', '--step', '1', '--dry-run', '--already-satisfied', '--guard-base', head], repo, closeInput('test/feature.test.js\n', ''));
    assert.equal(dry.payload.status_letter, 'OK', dry.payload.report_text);
    assert.match(dry.payload.report_text, /Already-satisfied close, production files left untouched: src\/feature.js/);
    assert.deepEqual(dry.payload.untouched.includes('src/feature.js'), true);
    const closed = tool(['close', '--change', 'demo', '--step', '1', '--already-satisfied', '--guard-base', head], repo, closeInput('test/feature.test.js\n', 'test: cover existing feature\n\nBody.\n'));
    assert.equal(closed.payload.committed, true, JSON.stringify(closed.payload));
    assert.equal(git(['show', '--name-only', '--pretty=format:', 'HEAD'], repo).trim(), 'test/feature.test.js');
    assert.match(fs.readFileSync(planPath, 'utf8'), /- \[x\] GREEN verified/);
    fs.rmSync(cp.slice(0, cp.lastIndexOf('#')), { force: true });
  } finally { cleanup(parent); }
});

test('without already-satisfied mode the same untouched production file is a DEVIATION, and a production change stays one in it', () => {
  const { parent, repo, cp } = satisfiedRepo();
  try {
    const head = git(['rev-parse', 'HEAD'], repo).trim();
    const plain = tool(['close', '--change', 'demo', '--step', '1', '--dry-run', '--guard-base', head], repo, closeInput('test/feature.test.js\n', ''));
    assert.equal(plain.payload.status_letter, 'DEVIATION');
    fs.appendFileSync(path.join(repo, 'src', 'feature.js'), '// touched\n');
    const add = 'test/feature.test.js\nsrc/feature.js\n';
    const dry = tool(['close', '--change', 'demo', '--step', '1', '--dry-run', '--already-satisfied', '--guard-base', head], repo, closeInput(add, ''));
    assert.equal(dry.payload.status_letter, 'DEVIATION');
    const blocked = tool(['close', '--change', 'demo', '--step', '1', '--already-satisfied', '--guard-base', head], repo, closeInput(add, 'test: cover existing feature\n\nBody.\n'));
    assert.equal(blocked.payload.reason, 'scope-blocked');
    assert.equal(blocked.payload.committed, false);
    assert.equal(git(['rev-parse', 'HEAD'], repo).trim(), head);
    fs.rmSync(cp.slice(0, cp.lastIndexOf('#')), { force: true });
  } finally { cleanup(parent); }
});

test('already-satisfied mode is a usage error outside red verify and close, and for a Step without a RED block', () => {
  const { parent, repo } = makeRepo();
  try {
    assert.equal(tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green', '--already-satisfied'], repo, '').status, 2);
    assert.equal(tool(['preflight', '--change', 'demo', '--already-satisfied'], repo).status, 2);
    const head = git(['rev-parse', 'HEAD'], repo).trim();
    assert.equal(tool(['close', '--change', 'demo', '--step', '2', '--dry-run', '--already-satisfied', '--guard-base', head], repo, closeInput('src/other.js\n', '')).status, 2);
  } finally { cleanup(parent); }
});

const MARKER = 'TODO(' + 'sai-4)';
const JUDGED = '- [ ] Output reads sensibly — judge it\n';
const SKELETON_PLAN = PLAN.replace(JUDGED, '').replace('- [ ] Copy and paste code below into `src/feature.js`:', '- [ ] Complete the skeleton below in `src/feature.js`:');
const DESCRIBED_PLAN = PLAN.replace(JUDGED, '').replace('- [ ] Copy and paste code below into `src/feature.js`:', '- [ ] Write the content described below into `src/feature.js`:');
const VERB_STEP_2 = (verb) => PLAN.replace(JUDGED, '').replace('- [ ] Do the thing at `src/other.js`', `- [ ] ${verb} \`src/other.js\`:`);

test('preflight accepts the skeleton and described-content verbs only in a Step with a RED block', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    for (const plan of [SKELETON_PLAN, DESCRIBED_PLAN]) {
      fs.writeFileSync(planPath, plan);
      const out = tool(['preflight', '--change', 'demo'], repo);
      assert.equal(out.payload.ok, true, JSON.stringify(out.payload.errors));
    }
    for (const verb of ['Complete the skeleton below in', 'Write the content described below into']) {
      fs.writeFileSync(planPath, VERB_STEP_2(verb));
      const out = tool(['preflight', '--change', 'demo'], repo);
      assert.ok(out.payload.errors.some((e) => e.step === 2 && /only in a Step with a RED block/.test(e.reason)), `${verb}: ${JSON.stringify(out.payload.errors)}`);
    }
    fs.writeFileSync(planPath, VERB_STEP_2('Copy and paste code below into'));
    assert.equal(tool(['preflight', '--change', 'demo'], repo).payload.ok, true);
  } finally { cleanup(parent); }
});

test('parseStep records the files named by the skeleton instruction', () => {
  assert.deepEqual(parseStep(SKELETON_PLAN, 1).skeletonPaths, ['src/feature.js']);
  assert.deepEqual(parseStep(PLAN, 1).skeletonPaths, []);
  assert.deepEqual(parseStep(DESCRIBED_PLAN, 1).skeletonPaths, []);
});

test('verify fails on a leftover skeleton marker above the Step base and passes once removed', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    fs.writeFileSync(planPath, SKELETON_PLAN);
    replaceBaseline(repo, 'openspec/changes/demo/implementation.md\n');
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'src', 'feature.js'), `// ${MARKER} compute the total from the rows\n`);
    const args = ['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception'];
    const bad = tool(args, repo, 'src/feature.js\ntest/feature.test.js\n');
    assert.deepEqual(bad.payload.skeleton_markers, [{ path: 'src/feature.js', base: 0, count: 1, leftover: true }]);
    assert.ok(bad.payload.failures.some((f) => f.includes('leftover') && f.includes('src/feature.js')));
    assert.equal(bad.payload.ok, false);
    writeFeature(repo, { passing: true });
    const good = tool(args, repo, 'src/feature.js\ntest/feature.test.js\n');
    assert.equal(good.payload.skeleton_markers[0].leftover, false);
    assert.ok(!good.payload.failures.some((f) => f.includes('leftover')));
  } finally { cleanup(parent); }
});

test('verify counts markers against the HEAD version, so legitimate marker text in a file never fails', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    fs.writeFileSync(planPath, SKELETON_PLAN);
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'src', 'feature.js'), `// documents ${MARKER}\nmodule.exports = 0;\n`);
    git(['add', '.'], repo);
    git(['commit', '-m', 'chore: base'], repo);
    replaceBaseline(repo, 'openspec/changes/demo/implementation.md\n');
    writeFeature(repo, { passing: true });
    fs.writeFileSync(path.join(repo, 'src', 'feature.js'), `// documents ${MARKER}\n// documents ${MARKER}\nmodule.exports = 1;\n`);
    const out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception'], repo, 'src/feature.js\ntest/feature.test.js\n');
    assert.deepEqual(out.payload.skeleton_markers, [{ path: 'src/feature.js', base: 1, count: 2, leftover: true }]);
    fs.writeFileSync(path.join(repo, 'src', 'feature.js'), `// documents ${MARKER}\nmodule.exports = 1;\n`);
    const clean = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception'], repo, 'src/feature.js\ntest/feature.test.js\n');
    assert.equal(clean.payload.skeleton_markers[0].leftover, false);
  } finally { cleanup(parent); }
});

test('the apply tool source never contains the literal marker', () => {
  assert.ok(!fs.readFileSync(TOOL, 'utf8').includes(MARKER));
});

test('Detail range is single-sourced in common.md and referenced by the plan surfaces', () => {
  const read = (p) => fs.readFileSync(path.join(REPO_ROOT, p), 'utf8');
  assert.match(read('sai/commands/implement/steps/common.md'), /\*\*Detail range:\*\*/);
  for (const p of ['sai/commands/implement/steps/plan-generation.md', 'sai/commands/implement/steps/validation.md', 'sai/commands/implement/implementation-plan.template.md']) assert.match(read(p), /Detail range/, p);
  const template = read('sai/commands/implement/implementation-plan.template.md');
  for (const verb of ['Copy and paste code below into', 'Complete the skeleton below in', 'Write the content described below into']) assert.ok(template.includes(verb), verb);
  assert.match(read('sai/commands/apply/green-worker.md'), /no `TODO\(sai-4\)` remains in your files/);
  assert.match(read('sai/commands/apply/steps/routing-split-flow.md'), /test files as read-only references/);
  assert.match(read('README.md'), /`sai-2` >= `sai-3` >= `sai-4`/);
  assert.match(read('README.md'), /docs\/sequential-pipeline\.md/);
  assert.match(read('docs/sequential-pipeline.md'), /AGENTS\.md/);
});

test('preflight interprets exactly the pinned instruction-verb list', () => {
  assert.deepEqual(INSTRUCTION_VERBS, ['Write the test', 'Create a minimal stub', 'Copy and paste', 'Complete the skeleton below', 'Write the content described below', 'Modify', 'Update', 'Delete', 'Remove']);
  const { parent, repo, planPath } = makeRepo();
  try {
    const withLine = (verb) => PLAN.replace(JUDGED, '').replace('- [ ] Copy and paste code below into `src/feature.js`:', `- [ ] Copy and paste code below into \`src/feature.js\`:\n- [ ] ${verb} text in \`../escape.js\`:`);
    // An interpreted verb line naming an unsafe path is reported; an unlisted verb is ignored.
    for (const verb of INSTRUCTION_VERBS) {
      fs.writeFileSync(planPath, withLine(verb));
      const out = tool(['preflight', '--change', 'demo'], repo);
      assert.ok(out.payload.errors.some((e) => e.step === 1 && e.reason === 'required instruction path is not recognized'), `${verb}: ${JSON.stringify(out.payload.errors)}`);
    }
    fs.writeFileSync(planPath, withLine('Rename'));
    assert.ok(!tool(['preflight', '--change', 'demo'], repo).payload.errors.some((e) => e.reason === 'required instruction path is not recognized'), 'an unlisted verb is not interpreted');
  } finally { cleanup(parent); }
});

// ---------------------------------------------------------------------------
// Attempt receipt
// ---------------------------------------------------------------------------

const EXITS = ['commit the listed files', 'discard the changes in the listed files'];

/** A new run: a fresh baseline over the working tree an earlier attempt left behind. */
function newRun(repo) {
  const previous = baselines.get(repo);
  const captured = tool(['baseline', '--change', 'demo'], repo);
  assert.equal(captured.status, 0, captured.stderr);
  baselines.set(repo, captured.payload.baseline);
  fs.rmSync(previous.slice(0, previous.lastIndexOf('#')), { force: true });
  return captured.payload;
}

const inspectStep = (repo, step = 1) => tool(['inspect', '--change', 'demo', '--step', String(step), '--baseline', baselines.get(repo)], repo);
const dispatchCheck = (repo, dispatch) => tool(['dispatch-check', '--change', 'demo', '--step', '1', '--dispatch', dispatch], repo);

test('E9: a new run takes receipt-matching dirty files as the Step\'s own and dispatches; a file changed since stays foreign', () => {
  const { parent, repo } = makeRepo();
  try {
    const cp = checkpoint(repo, 'red');
    writeFeature(repo, { passing: false });
    assert.equal(redVerify(repo, cp).payload.ok, true);
    assert.equal(fs.existsSync(receiptOf(repo)), true);
    assert.deepEqual(inspectStep(repo).payload.next_dispatch, { step: '1', would_pass: true, conflicts: [], exits: [] });

    assert.deepEqual(newRun(repo).own, { 'src/feature.js': '1', 'test/feature.test.js': '1' });
    const dispatched = dispatchCheck(repo, 'red');
    assert.equal(dispatched.status, 0, JSON.stringify(dispatched.payload));

    fs.appendFileSync(path.join(repo, 'src', 'feature.js'), '// edited after the receipt\n');
    assert.deepEqual(inspectStep(repo).payload.next_dispatch.conflicts, ['src/feature.js']);
    assert.deepEqual(newRun(repo).own, { 'test/feature.test.js': '1' });
    const refused = dispatchCheck(repo, 'red');
    assert.equal(refused.status, 1);
    assert.deepEqual(refused.payload.conflicts, ['src/feature.js']);
    assert.deepEqual(refused.payload.exits, EXITS);
    assert.equal(refused.payload.checkpoint, null);
  } finally { cleanup(parent); }
});

test('E10: the receipt covers unplanned files, and the new run verifies them as Step work, not unrelated work', () => {
  const { parent, repo } = makeRepo({ exception: true });
  try {
    const cp = checkpoint(repo, 'green-exception');
    writeFeature(repo, { passing: true, dir: 'test/support' });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    fs.writeFileSync(path.join(repo, 'test', 'support', 'extra.js'), 'extra\n');
    const first = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception', '--checkpoint', cp], repo, `${ADD_X}test/support/extra.js\n`);
    assert.deepEqual(first.payload.out_of_allowed, ['test/support/extra.js']);

    assert.deepEqual(Object.keys(newRun(repo).own).sort(), ['test/feature.test.js', 'test/legacy.test.js', 'test/support/extra.js', 'test/support/feature.js']);
    const second = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception', '--checkpoint', checkpoint(repo, 'green-exception')], repo);
    assert.deepEqual(second.payload.unrelated, []);
    assert.deepEqual(second.payload.out_of_allowed, ['test/support/extra.js']);
    assert.deepEqual(second.payload.preservation_errors, []);
    // The refreshed receipt still covers the own files this dispatch did not rewrite.
    assert.equal(Object.keys(newRun(repo).own).length, 4);
  } finally { cleanup(parent); }
});

test('E11: own files commit with the Step in the new run, and both close paths discard the receipt', () => {
  for (const markOnly of [false, true]) {
    const { parent, repo } = makeRepo({ exception: true });
    try {
      const cp = checkpoint(repo, 'green-exception');
      writeFeature(repo, { passing: true, dir: 'test/support' });
      fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
      assert.equal(tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception', '--checkpoint', cp], repo, ADD_X).payload.ok, true);
      newRun(repo);
      const dry = tool(['close', '--change', 'demo', '--step', '1', '--dry-run'], repo, closeInput(ADD_X, MSG));
      assert.equal(dry.payload.status_letter, 'OK', dry.payload.report_text);
      assert.equal(fs.existsSync(receiptOf(repo)), true, 'a dry run keeps the receipt');
      const out = markOnly
        ? tool(['close', '--change', 'demo', '--step', '1', '--mark-only'], repo)
        : tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput(ADD_X, MSG));
      assert.equal(out.status, 0, JSON.stringify(out.payload));
      assert.equal(out.payload.committed, !markOnly, JSON.stringify(out.payload));
      assert.equal(fs.existsSync(receiptOf(repo)), false);
    } finally { cleanup(parent); }
  }
});

test('E12/E13: a half-done Step without a receipt is refused with the two exits, and inspect reports it before the new run', () => {
  const { parent, repo } = makeRepo();
  try {
    writeFeature(repo, { passing: false });
    const conflicts = ['src/feature.js', 'test/feature.test.js'];
    assert.deepEqual(inspectStep(repo).payload.next_dispatch, { step: '1', would_pass: false, conflicts, exits: EXITS });

    assert.deepEqual(newRun(repo).own, {});
    const refused = dispatchCheck(repo, 'red');
    assert.equal(refused.status, 1);
    assert.deepEqual(refused.payload.conflicts, conflicts);
    assert.deepEqual(refused.payload.exits, EXITS);

    // A verify in the blocked run saves no claim over the files it found dirty.
    tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red'], repo, RED_REPORT);
    assert.equal(inspectStep(repo).payload.next_dispatch.would_pass, false);
  } finally { cleanup(parent); }
});

test('the receipt leaves out foreign work a dispatch touched', () => {
  const { parent, repo } = makeRepo();
  try {
    fs.writeFileSync(path.join(repo, 'unrelated.txt'), 'initial\n');
    newRun(repo);
    const cp = checkpoint(repo, 'red');
    writeFeature(repo, { passing: false });
    fs.appendFileSync(path.join(repo, 'unrelated.txt'), 'touched\n');
    const out = redVerify(repo, cp, `${RED_REPORT}unrelated.txt\n`);
    assert.ok(out.payload.preservation_errors.includes('unrelated.txt'));
    assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(receiptOf(repo), 'utf8')).files).sort(), ['src/feature.js', 'test/feature.test.js']);
    assert.deepEqual(newRun(repo).own, { 'src/feature.js': '1', 'test/feature.test.js': '1' });
  } finally { cleanup(parent); }
});

test('the stop report and the dispatch refusal take the retry state from the tool', () => {
  const read = (p) => fs.readFileSync(path.join(REPO_ROOT, p), 'utf8');
  assert.match(read('sai/commands/apply/coordinator.md'), /apply-step\.js inspect --change \{change-name\} --step N[\s\S]{0,200}`next_dispatch`/);
  assert.match(read('sai/commands/apply/coordinator.md'), /`conflicts` and the two `exits`/);
  assert.match(read('sai/policies/implementation-closing-report.md'), /`next_dispatch`[\s\S]{0,400}only source of this fact/);
  assert.match(read('sai/commands/apply/runner.md'), /own files from the baseline's `own`/);
});

function interfacesPathOf(repo) {
  return path.join(path.dirname(tasksPathOf(repo)), 'interfaces.md');
}

function routeOf(repo, step) {
  const out = tool(['route', '--change', 'demo', '--step', String(step)], repo);
  assert.equal(out.status, 0, out.stderr);
  return out.payload;
}

test('route computes the Step Routing Tree mode from the plan on disk', () => {
  const { parent, repo, planPath } = makeRepo();
  try {
    assert.equal(routeOf(repo, 1).mode, 'split-flow');
    assert.equal(routeOf(repo, 2).mode, 'green-direct');
    assert.equal(routeOf(repo, 2).step, '2');
    // Without a RED block, a Step whose files are all test/support files is test-only.
    fs.writeFileSync(planPath, PLAN.replace('- [ ] Do the thing at `src/other.js`', '- [ ] Do the thing at `test/other.test.js`'));
    fs.writeFileSync(tasksPathOf(repo), TASKS.replace('A src/other.js', 'A test/other.test.js'));
    assert.equal(routeOf(repo, 2).mode, 'green-exception-test-only');
  } finally { cleanup(parent); }
});

test('route yields green-exception-no-production for a RED Step with a contract and only test files', () => {
  const { parent, repo } = makeRepo({ exception: true });
  try {
    assert.equal(routeOf(repo, 1).mode, 'green-exception-no-production');
  } finally { cleanup(parent); }
});

test('route yields stop-missing-contract unless interfaces.md has exactly one heading for the Step', () => {
  const { parent, repo } = makeRepo();
  try {
    for (const text of ['None — no step contracts\n', '## Step 2: Other\n', '## Step 1: A\n\n## Step 1: B\n', '### Step 1: nested\n']) {
      fs.writeFileSync(interfacesPathOf(repo), text);
      assert.equal(routeOf(repo, 1).mode, 'stop-missing-contract', text);
    }
    fs.rmSync(interfacesPathOf(repo));
    assert.equal(routeOf(repo, 1).mode, 'stop-missing-contract');
    fs.writeFileSync(interfacesPathOf(repo), '## Step 12: Other\n');
    assert.equal(routeOf(repo, 1).mode, 'stop-missing-contract');
  } finally { cleanup(parent); }
});

test('route errors name the Step and the cause', () => {
  const { parent, repo } = makeRepo();
  try {
    const missing = tool(['route', '--change', 'demo', '--step', '9'], repo);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /Step 9: no "#### Step 9:" heading/);
    fs.rmSync(path.join(path.dirname(tasksPathOf(repo)), 'implementation.md'));
    const noPlan = tool(['route', '--change', 'demo', '--step', '1'], repo);
    assert.equal(noPlan.status, 2);
    assert.match(noPlan.stderr, /Step 1: implementation\.md is missing/);
  } finally { cleanup(parent); }
});

test('the test/support recognizer covers common conventions', () => {
  const { isTestPath } = require(TOOL);
  for (const p of ['test/a.js', 'tests/a.js', 'src/__tests__/a.js', 'x/fixtures/a.json', 'a/test-support/b.js', 'src/a.test.ts', 'src/a.spec.ts',
    'App.Tests/Foo.cs', 'AppTests/Foo.cs', 'pkg/a_test.go', 'pkg/test_a.py', 'pkg/a_test.py']) assert.equal(isTestPath(p), true, p);
  for (const p of ['src/a.js', 'src/latests/a.js', 'docs/testing.md', 'pkg/attest.py', 'src/contest/a.js']) assert.equal(isTestPath(p), false, p);
});

test('dispatch-check refuses a dispatch kind the Step mode does not accept, before any checkpoint', () => {
  const { parent, repo } = makeRepo();
  try {
    const refused = tool(['dispatch-check', '--change', 'demo', '--step', '1', '--dispatch', 'green-direct'], repo);
    assert.equal(refused.status, 1);
    assert.equal(refused.payload.ok, false);
    assert.equal(refused.payload.reason, 'dispatch-mode-mismatch');
    assert.equal(refused.payload.mode, 'split-flow');
    assert.equal(refused.payload.checkpoint, null);
    assert.equal(tool(['dispatch-check', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception'], repo).payload.reason, 'dispatch-mode-mismatch');
    for (const kind of ['red', 'green']) assert.equal(tool(['dispatch-check', '--change', 'demo', '--step', '1', '--dispatch', kind], repo).payload.ok, true, kind);
    // A GREEN-only Step accepts `green-direct` and the recovery fresh-RED `red`, never `green` or `green-exception`.
    for (const kind of ['green-direct', 'red']) assert.equal(tool(['dispatch-check', '--change', 'demo', '--step', '2', '--dispatch', kind], repo).payload.ok, true, kind);
    for (const kind of ['green', 'green-exception']) {
      const out = tool(['dispatch-check', '--change', 'demo', '--step', '2', '--dispatch', kind], repo);
      assert.equal(out.payload.reason, 'dispatch-mode-mismatch', kind);
      assert.equal(out.payload.mode, 'green-direct');
    }
    fs.rmSync(interfacesPathOf(repo));
    git(['add', '-A'], repo);
    git(['commit', '-m', 'chore: drop contract'], repo);
    replaceBaseline(repo);
    for (const kind of ['red', 'green', 'green-direct', 'green-exception']) {
      const out = tool(['dispatch-check', '--change', 'demo', '--step', '1', '--dispatch', kind], repo);
      assert.equal(out.payload.mode, 'stop-missing-contract', kind);
      assert.equal(out.payload.checkpoint, null);
    }
  } finally { cleanup(parent); }
});
