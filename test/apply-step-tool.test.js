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
  const result = spawnSync(process.execPath, [TOOL, ...args, '--json', '--cwd', cwd], { cwd, encoding: 'utf8', input: stdin, env: childEnv() });
  let payload = null;
  try {
    payload = JSON.parse(result.stdout);
  } catch (err) {
    payload = null;
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

const cleanup = (parent) => fs.rmSync(parent, { recursive: true, force: true });

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
    const out = tool(['close', '--change', 'demo', '--step', '1'], repo, closeInput('src/feature.js\ntest/feature.test.js\n', MSG));
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
