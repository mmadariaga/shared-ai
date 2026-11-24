'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const tool = path.resolve(__dirname, '../sai/tools/test-select.js');
// The code of a tool, without its comments.
const codeOf = (file) => fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const toolSource = codeOf(tool);
const coverageSource = codeOf(path.resolve(__dirname, '../sai/tools/scenario-coverage.js'));
const { resolveChangeBase } = require('../sai/tools/change-base.js');

function scratch(t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const write = (root, relative, content) => {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
};

// ---- select, against a fake codegraph on PATH ------------------------------

const FAKE = `
const fs = require('fs');
const config = JSON.parse(process.env.FAKE_CODEGRAPH || '{}');
const args = process.argv.slice(2);
const name = args[0];
let stdin = '';
if (!process.stdin.isTTY) { try { stdin = fs.readFileSync(0, 'utf8'); } catch (error) { stdin = ''; } }
if (process.env.FAKE_CODEGRAPH_LOG) fs.appendFileSync(process.env.FAKE_CODEGRAPH_LOG, JSON.stringify({ args, stdin }) + '\\n');
const answer = config[name] || {};
if (answer.sleep) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, answer.sleep);
if (answer.exit) process.exit(answer.exit);
if (answer.raw !== undefined) { process.stdout.write(answer.raw); process.exit(0); }
process.stdout.write(JSON.stringify(answer.json === undefined ? {} : answer.json));
`;

const HAPPY = {
  sync: {},
  status: { json: { initialized: true, pendingChanges: { added: 0, modified: 0, removed: 0 } } },
  files: { json: [{ path: 'src/a.js' }, { path: 'src/b.js' }, { path: 'test/a.test.js' }] },
  affected: { json: { changedFiles: [], affectedTests: ['test/b.test.js', 'test/a.test.js', 'test/a.test.js'] } },
};

function selectFixture(t, { indexed = true, installed = true } = {}) {
  const root = scratch(t, 'sai-test-select-');
  const bin = path.join(root, 'bin');
  const project = path.join(root, 'project');
  fs.mkdirSync(bin);
  fs.mkdirSync(project);
  if (indexed) fs.mkdirSync(path.join(project, '.codegraph'));
  if (installed) {
    write(bin, 'fake-codegraph.js', FAKE);
    if (process.platform === 'win32') {
      write(bin, 'codegraph.cmd', `@echo off\r\n"${process.execPath}" "%~dp0fake-codegraph.js" %*\r\n`);
    } else {
      write(bin, 'codegraph', `#!/bin/sh\nexec "${process.execPath}" "\${0%/*}/fake-codegraph.js" "$@"\n`);
      fs.chmodSync(path.join(bin, 'codegraph'), 0o755);
    }
  }
  const log = path.join(root, 'calls.log');
  const select = (files, config = HAPPY, extra = []) => {
    const input = write(root, 'files.json', JSON.stringify(files));
    const result = spawnSync(process.execPath, [tool, 'select', '--input-file', input, '--cwd', project, ...extra], {
      encoding: 'utf8',
      env: { ...process.env, PATH: bin, FAKE_CODEGRAPH: JSON.stringify(config), FAKE_CODEGRAPH_LOG: log },
    });
    return { ...result, report: result.stdout ? JSON.parse(result.stdout) : null };
  };
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []);
  return { select, calls };
}

test('E1: a trusted index selects the tests codegraph affected reports, sorted and without duplicates', (t) => {
  const f = selectFixture(t);
  const { status, report } = f.select(['src/a.js', './src/b.js', 'src/a.js']);
  assert.equal(status, 0);
  assert.deepEqual(report, { verdict: 'selected', tests: ['test/a.test.js', 'test/b.test.js'], reason: null });
});

test('I2: select syncs, reads status and files, then asks affected with the files on stdin', (t) => {
  const f = selectFixture(t);
  f.select(['src/a.js', 'src/b.js']);
  const calls = f.calls();
  assert.deepEqual(calls.map((call) => call.args[0]), ['sync', 'status', 'files', 'affected']);
  assert.deepEqual(calls[1].args, ['status', '--json']);
  assert.deepEqual(calls[2].args, ['files', '--json']);
  assert.deepEqual(calls[3].args, ['affected', '--json', '--stdin']);
  assert.equal(calls[3].stdin, 'src/a.js\nsrc/b.js\n');
});

test('I2: the tool never opens the codegraph database', () => {
  assert.doesNotMatch(toolSource, /codegraph\.db|node:sqlite|sqlite3/);
});

test('E2: a failing sync runs the full suite with sync-failed', (t) => {
  const f = selectFixture(t);
  const { status, report } = f.select(['src/a.js'], { ...HAPPY, sync: { exit: 1 } });
  assert.equal(status, 0);
  assert.deepEqual(report, { verdict: 'full', tests: [], reason: 'sync-failed' });
  assert.deepEqual(f.calls().map((call) => call.args[0]), ['sync']);
});

test('E2: pending changes after the sync run the full suite with stale-index', (t) => {
  const f = selectFixture(t);
  const config = { ...HAPPY, status: { json: { initialized: true, pendingChanges: { added: 0, modified: 2, removed: 0 } } } };
  assert.deepEqual(f.select(['src/a.js'], config).report, { verdict: 'full', tests: [], reason: 'stale-index' });
});

test('E3: a changed file the index lacks runs the full suite and names it', (t) => {
  const f = selectFixture(t);
  const { report } = f.select(['src/a.js', 'README.md', 'data/config.json']);
  assert.equal(report.verdict, 'full');
  assert.equal(report.reason, 'unindexed-file');
  assert.deepEqual(report.files, ['README.md', 'data/config.json']);
  assert.deepEqual(report.tests, []);
  assert.equal(f.calls().some((call) => call.args[0] === 'affected'), false);
});

test('E3: a deleted file is not in the index and runs the full suite', (t) => {
  const f = selectFixture(t);
  assert.equal(f.select(['src/gone.js']).report.reason, 'unindexed-file');
});

test('E4: a missing codegraph binary runs the full suite with no-binary', (t) => {
  const f = selectFixture(t, { installed: false });
  assert.deepEqual(f.select(['src/a.js']).report, { verdict: 'full', tests: [], reason: 'no-binary' });
});

test('E4: a project without .codegraph runs the full suite with no-index', (t) => {
  const f = selectFixture(t, { indexed: false });
  assert.deepEqual(f.select(['src/a.js']).report, { verdict: 'full', tests: [], reason: 'no-index' });
  assert.deepEqual(f.calls(), []);
});

test('E4: an uninitialized index reports no-index', (t) => {
  const f = selectFixture(t);
  const config = { ...HAPPY, status: { json: { initialized: false } } };
  assert.equal(f.select(['src/a.js'], config).report.reason, 'no-index');
});

test('E4: a failing call runs the full suite with codegraph-error', (t) => {
  const f = selectFixture(t);
  assert.equal(f.select(['src/a.js'], { ...HAPPY, affected: { exit: 3 } }).report.reason, 'codegraph-error');
  assert.equal(f.select(['src/a.js'], { ...HAPPY, files: { exit: 1 } }).report.reason, 'codegraph-error');
});

test('E4: a call that exceeds its timeout runs the full suite with timeout', (t) => {
  const f = selectFixture(t);
  const started = Date.now();
  const { report } = f.select(['src/a.js'], { ...HAPPY, affected: { sleep: 5000 } }, ['--timeout-ms', '400']);
  assert.deepEqual(report, { verdict: 'full', tests: [], reason: 'timeout' });
  assert.ok(Date.now() - started < 4500, 'the call was cut at its timeout');
});

test('E4: output that is not valid JSON runs the full suite with invalid-output', (t) => {
  const f = selectFixture(t);
  assert.equal(f.select(['src/a.js'], { ...HAPPY, status: { raw: 'not json' } }).report.reason, 'invalid-output');
  assert.equal(f.select(['src/a.js'], { ...HAPPY, files: { json: { nope: true } } }).report.reason, 'invalid-output');
  assert.equal(f.select(['src/a.js'], { ...HAPPY, affected: { json: { affectedTests: 'test/a.test.js' } } }).report.reason, 'invalid-output');
});

test('I1: plan artifacts under openspec/ are not code and never force the full suite', (t) => {
  const f = selectFixture(t);
  const { report } = f.select(['src/a.js', 'openspec/changes/demo/tasks.md']);
  assert.equal(report.verdict, 'selected');
  assert.equal(f.calls().find((call) => call.args[0] === 'affected').stdin, 'src/a.js\n');
});

test('I1: a step that changed only plan artifacts selects nothing and calls no codegraph', (t) => {
  const f = selectFixture(t);
  assert.deepEqual(f.select(['openspec/changes/demo/tasks.md']).report, { verdict: 'selected', tests: [], reason: null });
  assert.deepEqual(f.calls(), []);
});

test('node --test discovery of the file name test-*.js runs nothing, while an argument-less call outside it is a usage error', () => {
  const discovery = spawnSync(process.execPath, [tool], { encoding: 'utf8', env: { ...process.env, NODE_TEST_CONTEXT: 'child-v8' } });
  assert.equal(discovery.status, 0);
  assert.equal(discovery.stderr, '');
  const { NODE_TEST_CONTEXT, ...outside } = process.env;
  assert.equal(spawnSync(process.execPath, [tool], { encoding: 'utf8', env: outside }).status, 2);
  const withArguments = spawnSync(process.execPath, [tool, 'unknown'], { encoding: 'utf8', env: { ...process.env, NODE_TEST_CONTEXT: 'child-v8' } });
  assert.equal(withArguments.status, 2);
});

test('select reports a usage error as exit 2 with no verdict', (t) => {
  const root = scratch(t, 'sai-test-select-usage-');
  const run = (...args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });
  assert.equal(run('select').status, 2);
  assert.equal(run('select').stdout, '');
  const notList = write(root, 'x.json', '{"a":1}');
  assert.equal(run('select', '--input-file', notList).status, 2);
  const notJson = write(root, 'y.json', 'nope');
  assert.equal(run('select', '--input-file', notJson).status, 2);
  assert.equal(run('select', '--input-file', path.join(root, 'missing.json')).status, 2);
  assert.equal(run('unknown').status, 2);
  assert.equal(run('select', '--bogus').status, 2);
  assert.equal(run('select', '--timeout-ms', '0', '--input-file', notList).status, 2);
});

// ---- change base -----------------------------------------------------------

function repo(t) {
  const root = scratch(t, 'sai-test-select-repo-');
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
    return result.stdout;
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'commit.gpgsign', 'false');
  // The tests compare exact bytes: a runner whose git converts line endings (core.autocrlf) must not change them.
  git('config', 'core.autocrlf', 'false');
  return { root, git, commit: (message) => { git('add', '-A'); git('commit', '-q', '-m', message); } };
}

test('I3: test-select and scenario-coverage share one change-base computation', (t) => {
  assert.doesNotMatch(toolSource, /merge-base/);
  assert.doesNotMatch(coverageSource, /merge-base/);
  assert.match(toolSource, /require\('\.\/change-base\.js'\)/);
  assert.match(coverageSource, /require\('\.\/change-base\.js'\)/);
  const r = repo(t);
  write(r.root, 'a.txt', 'base\n');
  r.commit('base');
  const base = r.git('rev-parse', 'HEAD').trim();
  r.git('checkout', '-q', '-b', 'feature');
  write(r.root, 'a.txt', 'changed\n');
  r.commit('change');
  assert.deepEqual(resolveChangeBase(r.root, null), { parent_branch: 'main', change_base: base });
  assert.equal(resolveChangeBase(r.root, 'main').change_base, base);
});

// ---- swap and restore ------------------------------------------------------

function swapFixture(t) {
  const r = repo(t);
  write(r.root, 'src/kept.js', 'base kept\n');
  write(r.root, 'src/modified.js', 'base modified\n');
  write(r.root, 'src/deleted.js', 'base deleted\n');
  write(r.root, 'notes.txt', 'base notes\n');
  r.commit('base');
  r.git('checkout', '-q', '-b', 'feature');
  write(r.root, 'src/modified.js', 'change modified\n');
  write(r.root, 'src/added/new.js', 'change added\n');
  fs.rmSync(path.join(r.root, 'src/deleted.js'));
  r.commit('change');
  const run = scratch(t, 'sai-test-select-run-');
  const record = path.join(run, 'swap.json');
  const baseline = write(run, 'baseline-dirty.txt', '');
  const call = (...args) => {
    const result = spawnSync(process.execPath, [tool, ...args, '--cwd', r.root], { encoding: 'utf8' });
    return { ...result, report: result.stdout ? JSON.parse(result.stdout) : null };
  };
  const swap = (extra = []) => call('swap', '--record', record, '--dirty-baseline', baseline, ...extra);
  const restore = () => call('restore', '--record', record);
  const read = (relative) => fs.readFileSync(path.join(r.root, relative), 'utf8');
  const exists = (relative) => fs.existsSync(path.join(r.root, relative));
  return { ...r, run, record, baseline, swap, restore, read, exists };
}

test('E8 I4: swap puts the base version of the change in the working tree and restore brings it back to HEAD', (t) => {
  const f = swapFixture(t);
  const indexBefore = f.git('diff', '--cached', '--name-only');
  const swapped = f.swap();
  assert.equal(swapped.status, 0);
  assert.equal(swapped.report.verdict, 'swapped');
  assert.equal(swapped.report.paths, 3);
  assert.equal(f.read('src/modified.js'), 'base modified\n');
  assert.equal(f.read('src/deleted.js'), 'base deleted\n');
  assert.equal(f.exists('src/added/new.js'), false);
  assert.equal(f.exists('src/added'), false, 'the directory the change created is gone');
  assert.equal(f.read('src/kept.js'), 'base kept\n');
  assert.equal(f.git('diff', '--cached', '--name-only'), indexBefore, 'the git index is untouched');
  const record = JSON.parse(fs.readFileSync(f.record, 'utf8'));
  assert.deepEqual(record.paths.map((entry) => [entry.path, entry.status]).sort(), [['src/added/new.js', 'A'], ['src/deleted.js', 'D'], ['src/modified.js', 'M']]);

  const restored = f.restore();
  assert.equal(restored.status, 0);
  assert.equal(restored.report.verdict, 'restored');
  assert.equal(f.read('src/modified.js'), 'change modified\n');
  assert.equal(f.read('src/added/new.js'), 'change added\n');
  assert.equal(f.exists('src/deleted.js'), false);
  assert.equal(f.git('status', '--porcelain'), '');
});

test('E11: restore is idempotent and heals a swap that stopped half way', (t) => {
  const f = swapFixture(t);
  f.swap();
  fs.writeFileSync(path.join(f.root, 'src/modified.js'), 'change modified\n'); // one file already back
  assert.equal(f.restore().report.verdict, 'restored');
  assert.equal(f.git('status', '--porcelain'), '');
  const again = f.restore();
  assert.equal(again.status, 0);
  assert.equal(again.report.verdict, 'clean');
});

test('E11: restore on a working tree that already matches HEAD changes nothing', (t) => {
  const f = swapFixture(t);
  f.swap();
  f.restore();
  const before = f.git('status', '--porcelain');
  assert.equal(f.restore().report.verdict, 'clean');
  assert.equal(f.git('status', '--porcelain'), before);
});

test('E8: the dirty baseline stays untouched and a path of the change that it holds refuses the swap', (t) => {
  const f = swapFixture(t);
  write(f.root, 'scratch.txt', 'foreign work\n');
  write(f.root, 'notes.txt', 'foreign edit\n');
  fs.writeFileSync(f.baseline, ' M notes.txt\n?? scratch.txt\n');
  const swapped = f.swap();
  assert.equal(swapped.report.verdict, 'swapped');
  assert.equal(f.read('scratch.txt'), 'foreign work\n');
  assert.equal(f.read('notes.txt'), 'foreign edit\n');
  f.restore();
  assert.equal(f.read('notes.txt'), 'foreign edit\n');
  assert.equal(f.read('scratch.txt'), 'foreign work\n');

  fs.writeFileSync(f.baseline, ' M src/modified.js\n');
  const refused = f.swap();
  assert.equal(refused.status, 1);
  assert.deepEqual(refused.report, { verdict: 'refused', reason: 'dirty-baseline-overlap', paths: ['src/modified.js'] });
  assert.equal(f.read('src/modified.js'), 'change modified\n', 'a refused swap touches nothing');
});

test('E8: a baseline directory entry and quoted or renamed porcelain paths are understood', (t) => {
  const { dirtyBaselinePaths } = require('../sai/tools/test-select.js');
  assert.deepEqual(dirtyBaselinePaths('?? tmp/\n M "src/caf\\303\\251.js"\nR  old.js -> new.js\n', ''), ['tmp/', 'src/café.js', 'old.js', 'new.js']);
  assert.deepEqual(dirtyBaselinePaths(' M app/a.js\n M other/b.js\n', 'app/'), ['a.js', 'other/b.js']);
  const f = swapFixture(t);
  fs.writeFileSync(f.baseline, '?? src/added/\n');
  assert.equal(f.swap().report.reason, 'dirty-baseline-overlap');
});

test('E8: uncommitted work on a path of the change refuses the swap and loses nothing', (t) => {
  const f = swapFixture(t);
  fs.writeFileSync(path.join(f.root, 'src/modified.js'), 'work in progress\n');
  const refused = f.swap();
  assert.equal(refused.status, 1);
  assert.equal(refused.report.reason, 'uncommitted-changes');
  assert.deepEqual(refused.report.paths, ['src/modified.js']);
  assert.equal(f.read('src/modified.js'), 'work in progress\n');
  assert.equal(fs.existsSync(f.record), false);
});

test('E8: a record of an unrestored swap refuses a second swap, and a restored one allows it', (t) => {
  const f = swapFixture(t);
  assert.equal(f.swap().report.verdict, 'swapped');
  const second = f.swap();
  assert.equal(second.status, 1);
  assert.equal(second.report.reason, 'record-exists');
  assert.equal(f.read('src/modified.js'), 'base modified\n');
  f.restore();
  assert.equal(f.swap().report.verdict, 'swapped');
  assert.equal(f.restore().report.verdict, 'restored');
});

test('E8: swap honors --parent-branch for the change base', (t) => {
  const f = swapFixture(t);
  f.git('branch', 'release', 'main');
  write(f.root, 'src/later.js', 'later\n');
  f.commit('later');
  const swapped = f.swap(['--parent-branch', 'release']);
  assert.equal(swapped.report.parent_branch, 'release');
  assert.equal(swapped.report.change_base, f.git('rev-parse', 'main').trim());
  f.restore();
  assert.equal(f.swap(['--parent-branch', 'does-not-exist']).status, 2);
});

test('swap and restore report usage errors as exit 2', (t) => {
  const f = swapFixture(t);
  const run = (...args) => spawnSync(process.execPath, [tool, ...args, '--cwd', f.root], { encoding: 'utf8' });
  assert.equal(run('swap', '--dirty-baseline', f.baseline).status, 2);
  assert.equal(run('swap', '--record', f.record).status, 2);
  assert.equal(run('swap', '--record', f.record, '--dirty-baseline', path.join(f.run, 'missing.txt')).status, 2);
  assert.equal(run('restore').status, 2);
  assert.equal(run('restore', '--record', path.join(f.run, 'missing.json')).status, 2);
  write(f.run, 'junk.json', '{"a":1}');
  assert.equal(run('restore', '--record', path.join(f.run, 'junk.json')).status, 2);
});
