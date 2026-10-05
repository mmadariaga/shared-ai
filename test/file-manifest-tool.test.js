'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'file-manifest.js');
const { fold, extractEntries } = require(TOOL);

function foldText(entriesBySteps) {
  const tasks = Object.entries(entriesBySteps)
    .map(([n, files]) => `## Step ${n}: t\n\n**Routing**: layer=x\n\n**Files Affected**:\n${files.join('\n')}\n\n**What Will Be Done**: x\n`)
    .join('\n');
  const { entries, errors } = extractEntries(tasks);
  assert.deepEqual(errors, []);
  const r = fold(entries);
  return { lines: r.lines, errors: r.errors };
}

// The transition table and scenarios of design-target-state.
test('fold: A then M in a later step nets to A with both steps', () => {
  assert.deepEqual(foldText({ 1: ['A src/lib/util.ts'], 3: ['M src/lib/util.ts'] }).lines, ['A src/lib/util.ts (Step 1, Step 3)']);
});
test('fold: A then D nets to nothing', () => {
  assert.deepEqual(foldText({ 2: ['A docs/tmp.md'], 6: ['D docs/tmp.md'] }).lines, []);
});
test('fold: M then R follows the rename', () => {
  assert.deepEqual(foldText({ 2: ['M src/lib/old.ts'], 5: ['R src/lib/old.ts -> src/lib/new.ts'] }).lines, [
    'R src/lib/old.ts -> src/lib/new.ts (Step 2, Step 5)',
  ]);
});
test('fold: D then A nets to M', () => {
  assert.deepEqual(foldText({ 2: ['D src/lib/util.ts'], 5: ['A src/lib/util.ts'] }).lines, ['M src/lib/util.ts (Step 2, Step 5)']);
});
test('fold: rename then resurrection of baseline source dissolves the rename', () => {
  assert.deepEqual(foldText({ 2: ['R a.md -> b.md'], 5: ['A a.md'] }).lines, ['M a.md (Step 5)', 'A b.md (Step 2)']);
});
test('fold: change-created source resurrected folds to A', () => {
  assert.deepEqual(foldText({ 1: ['A a.md'], 2: ['R a.md -> b.md'], 5: ['A a.md'] }).lines, [
    'A a.md (Step 1, Step 5)',
    'A b.md (Step 2)',
  ]);
});
test('fold: rename then delete of destination emits the baseline path', () => {
  assert.deepEqual(foldText({ 2: ['R a.md -> b.md'], 5: ['D b.md'] }).lines, ['D a.md (Step 2, Step 5)']);
});
test('fold: chained rename follows the path', () => {
  assert.deepEqual(foldText({ 2: ['R a.md -> b.md'], 4: ['R b.md -> c.md'] }).lines, ['R a.md -> c.md (Step 2, Step 4)']);
});
test('fold: rename onto a previously deleted path does not merge', () => {
  assert.deepEqual(foldText({ 1: ['D b.md'], 3: ['R a.md -> b.md'] }).lines, ['D a.md (Step 3)', 'M b.md (Step 1, Step 3)']);
});
test('fold: R then M keeps the rename and attributes both steps', () => {
  assert.deepEqual(foldText({ 1: ['R a.md -> b.md'], 2: ['M b.md'] }).lines, ['R a.md -> b.md (Step 1, Step 2)']);
});
test('fold: A then R lives at the destination as A', () => {
  assert.deepEqual(foldText({ 1: ['A a.md'], 2: ['R a.md -> b.md'] }).lines, ['A b.md (Step 1, Step 2)']);
});
test('fold: M then D nets to D', () => {
  assert.deepEqual(foldText({ 1: ['M a.md'], 2: ['D a.md'] }).lines, ['D a.md (Step 1, Step 2)']);
});
test('fold: intermediate nothing does not suppress later line', () => {
  assert.deepEqual(foldText({ 1: ['A a.md'], 2: ['D a.md'], 3: ['A a.md'] }).lines, ['A a.md (Step 3)']);
});
test('fold: R lines sort by destination, byte-wise', () => {
  assert.deepEqual(foldText({ 1: ['R z-old.ts -> a-new.ts', 'M b-mid.ts', 'A B.ts'] }).lines, [
    'A B.ts (Step 1)',
    'R z-old.ts -> a-new.ts (Step 1)',
    'M b-mid.ts (Step 1)',
  ]);
});
test('fold: illegal transitions are errors with a location', () => {
  const r = foldText({ 1: ['D a.md'], 2: ['M a.md'] });
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].step, 2);
  assert.ok(r.errors[0].line > 0);
});

function project(tasksFiles, design) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'file-manifest-'));
  const dir = path.join(root, 'openspec', 'changes', 'c');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'tasks.md'), tasksFiles);
  fs.writeFileSync(path.join(dir, 'design.md'), design);
  return { root, design: path.join(dir, 'design.md') };
}
function run(mode, root) {
  const r = spawnSync(process.execPath, [TOOL, mode, 'c', '--json', '--cwd', root], { encoding: 'utf8' });
  return { status: r.status, payload: r.stdout.trim() ? JSON.parse(r.stdout) : null, stderr: r.stderr };
}

const TASKS = '## Step 1: a\n\n**Files Affected**:\nA x/a.md\nM x/b.md\n\n**What Will Be Done**: y\n\n## Step 2: b\n\n**Files Affected**:\nM x/a.md\n';
const DESIGN_WITH = '## Target State\n\n### Architecture Snapshot\n\nNone — no planned public surfaces\n\n### File Manifest\n\nOLD\n\n## Context\n\nc\n';

test('fold writes the manifest in place and is idempotent; verify matches', () => {
  const { root, design } = project(TASKS, DESIGN_WITH);
  try {
    assert.equal(run('verify', root).payload.status, 'diverged');
    assert.equal(run('fold', root).payload.status, 'written');
    const text = fs.readFileSync(design, 'utf8');
    assert.match(text, /### File Manifest\n\nA x\/a\.md \(Step 1, Step 2\)\nM x\/b\.md \(Step 1\)\n\n## Context/);
    assert.equal(run('fold', root).payload.status, 'unchanged');
    assert.equal(run('verify', root).status, 0);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});

test('fold creates a missing manifest after the Architecture Snapshot', () => {
  const { root, design } = project(TASKS, '## Target State\n\n### Architecture Snapshot\n\nNone — no planned public surfaces\n\n## Context\n\nc\n');
  try {
    assert.equal(run('verify', root).payload.status, 'missing');
    assert.equal(run('fold', root).status, 0);
    const text = fs.readFileSync(design, 'utf8');
    assert.match(text, /public surfaces\n\n### File Manifest\n\nA x\/a\.md[\s\S]*\n\n## Context/);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});

test('empty fold carries the None sentinel with a reason', () => {
  const { root, design } = project('## Step 1: a\n\n**Files Affected**:\nA t.md\n\n## Step 2: b\n\n**Files Affected**:\nD t.md\n', DESIGN_WITH);
  try {
    assert.equal(run('fold', root).status, 0);
    assert.match(fs.readFileSync(design, 'utf8'), /### File Manifest\n\nNone — no files affected \(every touched path/);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});

test('malformed Files Affected fails with a located diagnostic and no write', () => {
  const { root, design } = project('## Step 1: a\n\n**Files Affected**:\nX foo.md\nM\n', DESIGN_WITH);
  try {
    const r = run('fold', root);
    assert.equal(r.status, 1);
    assert.equal(r.payload.errors.length, 2);
    assert.deepEqual(r.payload.errors.map((e) => e.line), [4, 5]);
    assert.equal(fs.readFileSync(design, 'utf8'), DESIGN_WITH);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});

test('usage errors exit 2', () => {
  const r = spawnSync(process.execPath, [TOOL], { encoding: 'utf8' });
  assert.equal(r.status, 2);
});

test('sai-tools projection installs the tool for both harnesses without a new entry', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'sai', 'install-manifest.json'), 'utf8'));
  const entry = JSON.stringify(manifest).includes('"id": "sai-tools"') || JSON.stringify(manifest).includes('"id":"sai-tools"');
  assert.ok(entry);
  const tools = JSON.stringify(manifest);
  assert.ok(!tools.includes('file-manifest'), 'no per-tool manifest entry is needed');
  assert.ok(fs.existsSync(TOOL));
});

test('generated families retain counts in fold/verify and share Apply backtick interpretation', () => {
  for (const declaration of ['A generated/migration-*.sql — generated count=2', 'A `generated/migration-*.sql` — generated count=2', '`A generated/migration-*.sql — generated count=2`']) {
    const tasks = `## Step 1: generated\n\n**Files Affected**:\n${declaration}\n`;
    const { root, design } = project(tasks, DESIGN_WITH);
    try {
      assert.equal(run('fold', root).status, 0);
      assert.match(fs.readFileSync(design, 'utf8'), /A generated\/migration-\*\.sql — generated count=2 \(Step 1\)/);
      assert.equal(run('verify', root).status, 0);
      const apply = require('../sai/tools/apply-step').parseFilesAffected(tasks, 1);
      assert.equal(apply.generated[0].count, 2);
      assert.deepEqual(apply.errors, []);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test('unsafe paths and overlapping generated families fail both fold and verify without writing', () => {
  for (const lines of ['A ../escape.md', 'A generated/**/*.sql — generated count=2', 'A generated/migration-*.sql — generated count=2\nA generated/migration-long-*.sql — generated count=1']) {
    const tasks = `## Step 1: generated\n\n**Files Affected**:\n${lines}\n`;
    const { root, design } = project(tasks, DESIGN_WITH);
    try {
      for (const mode of ['fold', 'verify']) assert.equal(run(mode, root).status, 1);
      assert.equal(fs.readFileSync(design, 'utf8'), DESIGN_WITH);
      assert.ok(require('../sai/tools/apply-step').parseFilesAffected(tasks, 1).errors.length > 0);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test('fold and Apply preflight share the canonical case-sensitive None declaration', () => {
  for (const sentinel of ['None', 'none', 'NONE']) {
    const tasks = `## Step 1: unchanged\n\n**Files Affected**:\n${sentinel}\n`;
    const { root, design } = project(tasks, DESIGN_WITH);
    try {
      const plan = '#### Step 1: unchanged\n\n##### Step 1 Verification Checklist\n\n**Automated:**\n- [ ] `node -e "process.exit(0)"` — exit 0\n\n#### Step 1 STOP & COMMIT\n';
      fs.writeFileSync(path.join(root, 'openspec', 'changes', 'c', 'implementation.md'), plan);
      const apply = require('../sai/tools/apply-step').preflight({ cwd: root, change: 'c' });
      const folded = run('fold', root);
      assert.equal(apply.ok, sentinel === 'None');
      assert.equal(folded.status === 0, sentinel === 'None');
      if (sentinel === 'None') assert.equal(run('verify', root).status, 0);
      else assert.equal(fs.readFileSync(design, 'utf8'), DESIGN_WITH);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});
