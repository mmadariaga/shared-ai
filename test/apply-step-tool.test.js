'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'apply-step.js');
const { statusLetter, classifyAutomated, parseStep, parseFilesAffected } = require(TOOL);
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

function makeRepo({ tasks = true } = {}) {
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
  fs.writeFileSync(path.join(dir, 'implementation.md'), PLAN);
  if (tasks) fs.writeFileSync(path.join(dir, 'tasks.md'), TASKS);
  git(['add', '.'], repo);
  git(['commit', '-m', 'chore: initial'], repo);
  const captured = tool(['baseline', '--change', 'demo'], repo);
  assert.equal(captured.status, 0, captured.stderr);
  baselines.set(repo, captured.payload.baseline);
  return { parent, repo, planPath: path.join(dir, 'implementation.md') };
}

function writeFeature(repo, { passing }) {
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'feature.js'), 'module.exports = 1;\n');
  fs.writeFileSync(
    path.join(repo, 'test', 'feature.test.js'),
    `const { test } = require('node:test');\nconst assert = require('node:assert');\ntest('f', () => { assert.strictEqual(require('../src/feature'), ${passing ? 1 : 2}); });\n`,
  );
}

const cleanup = (parent) => {
  for (const [repo, refs] of records) if (repo.startsWith(parent + path.sep)) {
    for (const ref of refs) fs.rmSync(ref.slice(0, ref.lastIndexOf('#')), { force: true });
    records.delete(repo);
  }
  for (const [repo, ref] of baselines) if (repo.startsWith(parent + path.sep)) {
    fs.rmSync(ref.slice(0, ref.lastIndexOf('#')), { force: true });
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
  const { parent, repo } = makeRepo();
  try {
    fs.writeFileSync(path.join(repo, 'notes.txt'), 'staged\n');
    git(['add', 'notes.txt'], repo);
    fs.appendFileSync(path.join(repo, 'notes.txt'), 'unstaged\n');
    const index = git(['ls-files', '--stage', 'notes.txt'], repo);
    replaceBaseline(repo);
    const cp = checkpoint(repo, 'green-exception');
    writeFeature(repo, { passing: true });
    fs.appendFileSync(path.join(repo, 'test', 'legacy.test.js'), '// edit\n');
    const verified = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'green-exception', '--checkpoint', cp], repo, ADD);
    assert.equal(verified.payload.ok, true, JSON.stringify(verified.payload));
    assert.deepEqual(verified.payload.unrelated, ['notes.txt']);
    const out = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput(ADD, MSG));
    assert.equal(out.payload.committed, true, JSON.stringify(out.payload));
    assert.equal(out.payload.status_letter, 'WARN');
    assert.match(out.payload.report_text, /Will NOT be committed:\n  notes.txt/);
    assert.equal(git(['ls-files', '--stage', 'notes.txt'], repo), index);
    assert.equal(fs.readFileSync(path.join(repo, 'notes.txt'), 'utf8'), 'staged\nunstaged\n');
    assert.doesNotMatch(git(['show', '--name-only', '--pretty=format:', 'HEAD'], repo), /notes.txt|implementation.md/);
    fs.rmSync(cp.slice(0, cp.lastIndexOf('#')), { force: true });
  } finally { cleanup(parent); }
});

test('initial dirty Step path stops before dispatch, even when its path is authorized', () => {
  const { parent, repo } = makeRepo();
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

test('new out-of-scope modifications, deletes, renames and ignored outputs remain discrepancies', () => {
  const { parent, repo } = makeRepo();
  try {
    const cp = checkpoint(repo, 'red');
    writeFeature(repo, { passing: false });
    fs.renameSync(path.join(repo, 'test', 'legacy.test.js'), path.join(repo, 'test', 'renamed.test.js'));
    fs.writeFileSync(path.join(repo, '.gitignore'), 'ignored.txt\n');
    fs.writeFileSync(path.join(repo, 'ignored.txt'), 'not an exemption\n');
    const out = tool(['verify', '--change', 'demo', '--step', '1', '--dispatch', 'red', '--checkpoint', cp], repo, 'src/feature.js\ntest/feature.test.js\n');
    assert.equal(out.payload.ok, false);
    for (const p of ['test/legacy.test.js', 'test/renamed.test.js', '.gitignore', 'ignored.txt']) assert.ok(out.payload.out_of_allowed.includes(p), p);
    assert.equal(fs.readFileSync(path.join(repo, 'ignored.txt'), 'utf8'), 'not an exemption\n');
    fs.rmSync(cp.slice(0, cp.lastIndexOf('#')), { force: true });
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
