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
// An affected call answers per file (config.perFile, keyed by the file on stdin) before it falls back to config.affected.
const answer = (name === 'affected' && config.perFile && config.perFile[stdin.trim()]) || config[name] || {};
const started = Date.now();
if (answer.sleep) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, answer.sleep);
if (name === 'affected' && process.env.FAKE_CODEGRAPH_TIMES) fs.appendFileSync(process.env.FAKE_CODEGRAPH_TIMES, JSON.stringify({ started, ended: Date.now() }) + '\\n');
if (answer.exit) process.exit(answer.exit);
if (answer.raw !== undefined) { process.stdout.write(answer.raw); process.exit(0); }
process.stdout.write(JSON.stringify(answer.json === undefined ? {} : answer.json));
`;

const HAPPY = {
  sync: {},
  status: { json: { initialized: true, pendingChanges: { added: 0, modified: 0, removed: 0 } } },
  files: { json: [{ path: 'src/a.js' }, { path: 'src/b.js' }, { path: 'test/a.test.js' }] },
  affected: { json: { changedFiles: [], affectedTests: ['test/b.test.js', 'test/a.test.js', 'test/a.test.js'], totalDependentsTraversed: 2 } },
};

// A complete index, as `codegraph status --json` prints it, and the answer of one single-file affected call.
const INDEX = { builtWithVersion: '1.6.4', builtWithExtractionVersion: 29, currentExtractionVersion: 29, reindexRecommended: false, state: 'complete', pendingRefs: 0, filesNeedingReindex: 0 };
const statusWith = (index, extra = {}) => ({ status: { json: { initialized: true, pendingChanges: { added: 0, modified: 0, removed: 0 }, rebuildInProgress: false, ...extra, ...(index ? { index } : {}) } } });
const answerFor = (tests, dependents, extra = {}) => ({ json: { changedFiles: [], affectedTests: tests, totalDependentsTraversed: dependents }, ...extra });

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
  const times = path.join(root, 'times.log');
  const select = (files, config = HAPPY, extra = []) => {
    const input = write(root, 'files.json', JSON.stringify(files));
    const result = spawnSync(process.execPath, [tool, 'select', '--input-file', input, '--cwd', project, ...extra], {
      encoding: 'utf8',
      env: { ...process.env, PATH: bin, FAKE_CODEGRAPH: JSON.stringify(config), FAKE_CODEGRAPH_LOG: log, FAKE_CODEGRAPH_TIMES: times },
    });
    return { ...result, report: result.stdout ? JSON.parse(result.stdout) : null };
  };
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []);
  const spans = () => (fs.existsSync(times) ? fs.readFileSync(times, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []);
  return { select, calls, spans, project };
}

test('E1: a trusted index selects the tests codegraph affected reports, sorted and without duplicates', (t) => {
  const f = selectFixture(t);
  const { status, report } = f.select(['src/a.js', './src/b.js', 'src/a.js']);
  assert.equal(status, 0);
  assert.deepEqual(report, { verdict: 'selected', tests: ['test/a.test.js', 'test/b.test.js'], reason: null });
});

test('I3: select syncs, reads status and files, then asks affected once per file with only fixed arguments and the file alone on stdin', (t) => {
  const f = selectFixture(t);
  f.select(['src/a.js', 'src/b.js']);
  const calls = f.calls();
  assert.deepEqual(calls.map((call) => call.args[0]), ['sync', 'status', 'files', 'affected', 'affected']);
  assert.deepEqual(calls[1].args, ['status', '--json']);
  assert.deepEqual(calls[2].args, ['files', '--json']);
  const affected = calls.slice(3).sort((a, b) => a.stdin.localeCompare(b.stdin));
  assert.deepEqual(affected.map((call) => call.args), [['affected', '--json', '--stdin', '--depth', '2'], ['affected', '--json', '--stdin', '--depth', '2']]);
  assert.deepEqual(affected.map((call) => call.stdin), ['src/a.js\n', 'src/b.js\n']);
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

test('E3: a changed file of an indexed type that the index lacks runs the full suite and names it', (t) => {
  const f = selectFixture(t);
  write(f.project, 'src/new.js', '');
  write(f.project, 'test/new.test.js', '');
  const { report } = f.select(['src/a.js', 'src/new.js', 'test/new.test.js']);
  assert.equal(report.verdict, 'full');
  assert.equal(report.reason, 'unindexed-file');
  assert.deepEqual(report.files, ['src/new.js', 'test/new.test.js']);
  assert.deepEqual(report.tests, []);
  assert.equal(f.calls().some((call) => call.args[0] === 'affected'), false);
});

test('E3 I4: a file of a type the index never holds stays out of the selection and never causes unindexed-file', (t) => {
  const f = selectFixture(t);
  const mixed = f.select(['src/a.js', 'README.md', 'data/config.json', 'docs/logo.png']);
  assert.equal(mixed.report.verdict, 'selected');
  assert.deepEqual(mixed.report.tests, ['test/a.test.js', 'test/b.test.js']);
  const affected = f.calls().filter((call) => call.args[0] === 'affected');
  assert.deepEqual(affected.map((call) => call.stdin.trim()), ['src/a.js'], 'only the file of an indexed type is asked about');
});

test('E4 I4: a change of documentation and configuration alone selects no test', (t) => {
  const f = selectFixture(t);
  const { report } = f.select(['README.md', 'data/config.json']);
  assert.deepEqual([report.verdict, report.tests, report.reason], ['selected', [], null]);
  assert.equal(f.calls().some((call) => call.args[0] === 'affected'), false);
});

test('E3: a deleted file, gone from the working tree and the index, stays out of the selection', (t) => {
  const f = selectFixture(t);
  assert.deepEqual(f.select(['src/gone.js']).report, { verdict: 'selected', tests: [], reason: null });
  const withDeletion = f.select(['src/a.js', 'src/gone.js']);
  assert.deepEqual([withDeletion.report.verdict, withDeletion.report.tests], ['selected', ['test/a.test.js', 'test/b.test.js']]);
  const affected = f.calls().filter((call) => call.args[0] === 'affected');
  assert.equal(affected.some((call) => call.stdin.trim() === 'src/gone.js'), false, 'the deleted file is never asked about');
});

test('E3: a file present in the working tree that the index lacks is unindexed even when a deleted file sits beside it', (t) => {
  const f = selectFixture(t);
  write(f.project, 'src/new.js', '');
  const { report } = f.select(['src/gone.js', 'src/new.js']);
  assert.deepEqual([report.verdict, report.reason, report.files], ['full', 'unindexed-file', ['src/new.js']]);
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
  assert.equal(f.select(['src/a.js'], { ...HAPPY, affected: answerFor('test/a.test.js', 1) }).report.reason, 'invalid-output');
  assert.equal(f.select(['src/a.js'], { ...HAPPY, affected: { json: { affectedTests: [] } } }).report.reason, 'invalid-output');
  assert.equal(f.select(['src/a.js'], { ...HAPPY, affected: { raw: 'not json' } }).report.reason, 'invalid-output');
});

// ---- depth, trust, and per-file calls (E1-E9 of the trustworthy selection) ---

test('E1 I1: select always asks affected at depth 2, and no option or environment variable changes it', (t) => {
  const f = selectFixture(t);
  f.select(['src/a.js', 'src/b.js']);
  const asked = f.calls().filter((call) => call.args[0] === 'affected');
  assert.equal(asked.length, 2);
  for (const call of asked) assert.deepEqual(call.args.slice(-2), ['--depth', '2']);
  assert.match(toolSource, /const AFFECTED_DEPTH = 2;/);

  const root = scratch(t, 'sai-test-select-depth-');
  const input = write(root, 'files.json', '["src/a.js"]');
  for (const flag of ['--depth', '--affected-depth']) {
    assert.equal(spawnSync(process.execPath, [tool, 'select', '--input-file', input, flag, '3'], { encoding: 'utf8' }).status, 2, flag);
  }
  // The environment does not change it either.
  const calls = selectFixture(t);
  const before = process.env.CODEGRAPH_DEPTH;
  process.env.CODEGRAPH_DEPTH = '5';
  try {
    calls.select(['src/a.js']);
  } finally {
    if (before === undefined) delete process.env.CODEGRAPH_DEPTH;
    else process.env.CODEGRAPH_DEPTH = before;
  }
  assert.deepEqual(calls.calls().find((call) => call.args[0] === 'affected').args.slice(-2), ['--depth', '2']);
});

test('E2: each stale-index signal of the status index block runs the full suite with stale-index', (t) => {
  const f = selectFixture(t);
  const stale = [
    ['reindexRecommended', { ...INDEX, reindexRecommended: true }, {}],
    ['older extractor', { ...INDEX, builtWithExtractionVersion: 24 }, {}],
    ['state null', { ...INDEX, state: null }, {}],
    ['state other than complete', { ...INDEX, state: 'rebuilding' }, {}],
    ['filesNeedingReindex', { ...INDEX, filesNeedingReindex: 3 }, {}],
    ['rebuildInProgress', INDEX, { rebuildInProgress: true }],
  ];
  for (const [label, index, extra] of stale) {
    const { report } = f.select(['src/a.js'], { ...HAPPY, ...statusWith(index, extra) });
    assert.deepEqual(report, { verdict: 'full', tests: [], reason: 'stale-index' }, label);
  }
  assert.equal(f.select(['src/a.js'], { ...HAPPY, ...statusWith(INDEX) }).report.verdict, 'selected');
});

test('E2: pending changes keep running the full suite even when the index block is complete', (t) => {
  const f = selectFixture(t);
  const config = { ...HAPPY, status: { json: { initialized: true, pendingChanges: { added: 1, modified: 0, removed: 0 }, index: INDEX } } };
  assert.equal(f.select(['src/a.js'], config).report.reason, 'stale-index');
});

test('E3: a status with no index block is checked by its pending changes alone', (t) => {
  const f = selectFixture(t);
  assert.equal(f.select(['src/a.js'], { ...HAPPY, ...statusWith(null) }).report.verdict, 'selected');
  const rebuilding = f.select(['src/a.js'], { ...HAPPY, ...statusWith(null, { rebuildInProgress: true }) });
  assert.equal(rebuilding.report.verdict, 'selected');
});

test('E4: a changed non-test file without dependents runs the full suite with no-dependents and lists exactly those files', (t) => {
  const f = selectFixture(t);
  const config = {
    ...HAPPY,
    files: { json: [{ path: 'src/a.js' }, { path: 'src/b.js' }, { path: 'src/c.js' }] },
    perFile: { 'src/a.js': answerFor(['test/a.test.js'], 3), 'src/b.js': answerFor([], 0), 'src/c.js': answerFor([], 0) },
  };
  const { status, report } = f.select(['src/a.js', 'src/b.js', 'src/c.js'], config);
  assert.equal(status, 0);
  assert.deepEqual(report, { verdict: 'full', tests: [], reason: 'no-dependents', files: ['src/b.js', 'src/c.js'] });
});

test('E5 I5: a test file is the one whose own call lists it, so it never triggers no-dependents and a fixture does', (t) => {
  const f = selectFixture(t);
  const config = {
    ...HAPPY,
    files: { json: [{ path: 'src/a.js' }, { path: 'test/a.test.js' }, { path: 'test/fixtures/data.js' }, { path: 'src/odd.test.js' }, { path: 'checks/odd.js' }] },
    perFile: {
      'src/a.js': answerFor(['test/a.test.js'], 2),
      'test/a.test.js': answerFor(['test/a.test.js'], 0),
      'test/fixtures/data.js': answerFor([], 0),
      'src/odd.test.js': answerFor([], 0),
      'checks/odd.js': answerFor(['checks/odd.js'], 0),
    },
  };
  assert.deepEqual(f.select(['src/a.js', 'test/a.test.js'], config).report, { verdict: 'selected', tests: ['test/a.test.js'], reason: null });
  const fixture = f.select(['src/a.js', 'test/fixtures/data.js'], config).report;
  assert.deepEqual([fixture.reason, fixture.files], ['no-dependents', ['test/fixtures/data.js']]);
  // No naming pattern of our own: a name that looks like a test is code until its call lists it.
  assert.deepEqual(f.select(['src/odd.test.js'], config).report.files, ['src/odd.test.js']);
  assert.deepEqual(f.select(['checks/odd.js'], config).report, { verdict: 'selected', tests: ['checks/odd.js'], reason: null });
});

test('E6: without no-dependents the selection is the sorted, deduplicated union of every single-file call', (t) => {
  const f = selectFixture(t);
  const config = {
    ...HAPPY,
    files: { json: [{ path: 'src/a.js' }, { path: 'src/b.js' }, { path: 'src/c.js' }] },
    perFile: {
      'src/a.js': answerFor(['test/z.test.js', 'test/m.test.js'], 2),
      'src/b.js': answerFor(['test/m.test.js', './test/a.test.js'], 1),
      'src/c.js': answerFor([], 1),
    },
  };
  assert.deepEqual(f.select(['src/a.js', 'src/b.js', 'src/c.js'], config).report, { verdict: 'selected', tests: ['test/a.test.js', 'test/m.test.js', 'test/z.test.js'], reason: null });
});

test('E7 I4: the per-file calls overlap, at most 4 at a time, and the finishing order changes neither verdict nor tests', (t) => {
  const f = selectFixture(t);
  const names = ['a', 'b', 'c', 'd', 'e', 'f'].map((letter) => `src/${letter}.js`);
  const config = {
    ...HAPPY,
    files: { json: names.map((file) => ({ path: file })) },
    perFile: Object.fromEntries(names.map((file) => [file, answerFor([`test/${file.slice(4, 5)}.test.js`], 1, { sleep: 400 })])),
  };
  const started = Date.now();
  const { report } = f.select(names, config);
  const elapsed = Date.now() - started;
  assert.equal(report.verdict, 'selected');
  assert.deepEqual(report.tests, names.map((file) => `test/${file.slice(4, 5)}.test.js`));
  const spans = f.spans();
  assert.equal(spans.length, 6);
  const concurrent = Math.max(...spans.map((span) => spans.filter((other) => other.started < span.ended && other.ended > span.started).length));
  assert.ok(concurrent >= 2, `calls overlap (${concurrent})`);
  assert.ok(concurrent <= 4, `at most 4 at a time (${concurrent})`);
  assert.ok(elapsed < 6 * 400, `faster than serial calls (${elapsed} ms)`);

  const slowFirst = { ...config, perFile: { ...config.perFile, [names[0]]: answerFor(['test/a.test.js'], 1, { sleep: 800 }), [names[1]]: answerFor(['test/b.test.js'], 1, { sleep: 0 }) } };
  const fastFirst = { ...config, perFile: { ...config.perFile, [names[0]]: answerFor(['test/a.test.js'], 1, { sleep: 0 }), [names[1]]: answerFor(['test/b.test.js'], 1, { sleep: 800 }) } };
  assert.deepEqual(f.select(names, slowFirst).report, report);
  assert.deepEqual(f.select(names, fastFirst).report, report);

  const failing = (first, second) => ({
    ...HAPPY,
    files: { json: [{ path: 'src/a.js' }, { path: 'src/b.js' }] },
    perFile: { 'src/a.js': { exit: 3, sleep: first }, 'src/b.js': { raw: 'not json', sleep: second } },
  });
  assert.equal(f.select(['src/a.js', 'src/b.js'], failing(600, 0)).report.reason, 'codegraph-error');
  assert.equal(f.select(['src/a.js', 'src/b.js'], failing(0, 600)).report.reason, 'codegraph-error');
});

test('E8: the earlier reasons keep priority over no-dependents', (t) => {
  const f = selectFixture(t);
  const bare = { src: answerFor([], 0) };
  const perFile = { 'src/a.js': bare.src, 'src/b.js': bare.src };
  const base = { ...HAPPY, perFile };
  assert.equal(f.select(['src/a.js'], { ...base, sync: { exit: 1 } }).report.reason, 'sync-failed');
  assert.equal(f.select(['src/a.js'], { ...base, ...statusWith({ ...INDEX, reindexRecommended: true }) }).report.reason, 'stale-index');
  write(f.project, 'src/new.js', '');
  const unindexed = f.select(['src/a.js', 'src/new.js'], base).report;
  assert.deepEqual([unindexed.reason, unindexed.files], ['unindexed-file', ['src/new.js']]);
  assert.equal(f.select(['src/a.js', 'src/b.js'], { ...base, perFile: { ...perFile, 'src/b.js': { exit: 2 } } }).report.reason, 'codegraph-error');
  assert.equal(f.select(['src/a.js', 'src/b.js'], { ...base, perFile: { ...perFile, 'src/b.js': { raw: 'x' } } }).report.reason, 'invalid-output');
  assert.equal(f.select(['src/a.js'], base).report.reason, 'no-dependents');
});

test('E8 I4: --timeout-ms is one deadline for the whole set of per-file calls, and the calls still running are ended', (t) => {
  const f = selectFixture(t);
  const names = ['a', 'b', 'c', 'd', 'e', 'f'].map((letter) => `src/${letter}.js`);
  const config = {
    ...HAPPY,
    files: { json: names.map((file) => ({ path: file })) },
    perFile: Object.fromEntries(names.map((file) => [file, answerFor(['test/a.test.js'], 1, { sleep: 700 })])),
  };
  const started = Date.now();
  const { report } = f.select(names, config, ['--timeout-ms', '1100']);
  assert.deepEqual(report, { verdict: 'full', tests: [], reason: 'timeout' });
  assert.ok(Date.now() - started < 5000, 'the run ended at its deadline');
  // Each call alone is shorter than the timeout: a per-call timeout would have let all of them finish.
  assert.equal(f.select(names.slice(0, 2), config, ['--timeout-ms', '1100']).report.verdict, 'selected');
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

test('I3: swap --base takes a commit as the classification base and excludes --parent-branch', (t) => {
  const f = swapFixture(t);
  const base = f.git('rev-parse', 'main').trim();
  const swapped = f.swap(['--base', base]);
  assert.equal(swapped.status, 0);
  assert.equal(swapped.report.verdict, 'swapped');
  assert.equal(swapped.report.change_base, base);
  assert.equal(f.read('src/modified.js'), 'base modified\n');
  assert.equal(f.restore().report.verdict, 'restored');
  assert.equal(f.git('status', '--porcelain'), '');
  assert.equal(f.swap(['--base', base, '--parent-branch', 'main']).status, 2, 'the two options exclude each other');
  assert.equal(f.swap(['--base', 'no-such-commit']).status, 2);
});

// A run whose changes no commit holds: Direct Build before its commit, and /sai-merge with the resolution staged.
function uncommittedFixture(t) {
  const r = repo(t);
  write(r.root, 'src/kept.js', 'base kept\n');
  write(r.root, 'src/modified.js', 'base modified\n');
  write(r.root, 'src/deleted.js', 'base deleted\n');
  write(r.root, 'notes.txt', 'base notes\n');
  r.commit('base');
  const base = r.git('rev-parse', 'HEAD').trim();
  write(r.root, 'src/modified.js', 'run modified\n');
  write(r.root, 'src/added/new.js', 'run added\n');
  fs.rmSync(path.join(r.root, 'src/deleted.js'));
  const run = scratch(t, 'sai-test-select-run-');
  const record = path.join(run, 'swap.json');
  const baseline = write(run, 'baseline-dirty.txt', '');
  const paths = write(run, 'paths.json', JSON.stringify(['src/modified.js', 'src/added/new.js', 'src/deleted.js', 'src/kept.js']));
  const call = (...args) => {
    const result = spawnSync(process.execPath, [tool, ...args, '--cwd', r.root], { encoding: 'utf8' });
    return { ...result, report: result.stdout ? JSON.parse(result.stdout) : null };
  };
  const swap = (extra = []) => call('swap', '--record', record, '--dirty-baseline', baseline, '--base', base, '--paths-file', paths, ...extra);
  const read = (relative) => fs.readFileSync(path.join(r.root, relative), 'utf8');
  const exists = (relative) => fs.existsSync(path.join(r.root, relative));
  return { ...r, base, run, record, baseline, paths, swap, restore: () => call('restore', '--record', record), read, exists };
}

test('E9 E11: swap --paths-file puts the base version in the working tree and restore writes the saved copies back', (t) => {
  const f = uncommittedFixture(t);
  const before = f.git('status', '--porcelain');
  const indexBefore = f.git('diff', '--cached', '--name-only');
  const swapped = f.swap();
  assert.equal(swapped.status, 0);
  assert.equal(swapped.report.verdict, 'swapped');
  assert.equal(swapped.report.paths, 3, 'src/kept.js equals the base and is not part of the swap');
  assert.equal(swapped.report.change_base, f.base);
  assert.equal(f.read('src/modified.js'), 'base modified\n');
  assert.equal(f.read('src/deleted.js'), 'base deleted\n');
  assert.equal(f.exists('src/added/new.js'), false);
  assert.equal(f.git('diff', '--cached', '--name-only'), indexBefore, 'the git index is untouched');
  const restored = f.restore();
  assert.equal(restored.status, 0);
  assert.equal(restored.report.verdict, 'restored');
  assert.equal(f.read('src/modified.js'), 'run modified\n');
  assert.equal(f.read('src/added/new.js'), 'run added\n');
  assert.equal(f.exists('src/deleted.js'), false);
  assert.equal(f.git('status', '--porcelain'), before, 'nothing of the run is lost and nothing is staged');
  assert.equal(f.restore().report.verdict, 'clean');
});

test('E9: restore heals a --paths-file swap that stopped half way, with the working tree as the run left it', (t) => {
  const f = uncommittedFixture(t);
  const before = f.git('status', '--porcelain');
  f.swap();
  fs.writeFileSync(path.join(f.root, 'src/modified.js'), 'run modified\n'); // one file already back
  assert.equal(f.restore().report.verdict, 'restored');
  assert.equal(f.git('status', '--porcelain'), before);
});

test('E11: a --paths-file path that the dirty baseline holds refuses the swap and changes nothing', (t) => {
  const f = uncommittedFixture(t);
  fs.writeFileSync(f.baseline, ' M src/modified.js\n');
  const swapped = f.swap();
  assert.equal(swapped.status, 1);
  assert.equal(swapped.report.verdict, 'refused');
  assert.equal(swapped.report.reason, 'dirty-baseline-overlap');
  assert.deepEqual(swapped.report.paths, ['src/modified.js']);
  assert.equal(f.read('src/modified.js'), 'run modified\n');
  assert.equal(fs.existsSync(f.record), false);
});

test('E9: swap --paths-file needs --base and a readable list, and a record of an unrestored swap refuses the next one', (t) => {
  const f = uncommittedFixture(t);
  const run = (...args) => spawnSync(process.execPath, [tool, ...args, '--cwd', f.root], { encoding: 'utf8' });
  assert.equal(run('swap', '--record', f.record, '--dirty-baseline', f.baseline, '--paths-file', f.paths).status, 2);
  assert.equal(f.swap(['--paths-file', path.join(f.run, 'missing.json')]).status, 2);
  assert.equal(f.swap().report.verdict, 'swapped');
  assert.equal(f.swap().report.reason, 'record-exists');
  f.restore();
});

// ---- command ---------------------------------------------------------------

function commandFixture(t) {
  const root = scratch(t, 'sai-test-select-command-');
  const run = (...args) => {
    const result = spawnSync(process.execPath, [tool, 'command', '--cwd', root, ...args], { encoding: 'utf8' });
    return { ...result, report: result.stdout ? JSON.parse(result.stdout) : null };
  };
  return { root, run };
}

const tasksWith = (field) => `# Tasks\n\n## Step 1\n\ndone\n\n## Implementation Context\n\n${field}\n`;

test('I1 E5: the command comes from tasks.md first, with the scoping idiom in its parameterised form', (t) => {
  const f = commandFixture(t);
  write(f.root, 'openspec/changes/demo/tasks.md', tasksWith('**Test Command**: `dotnet test tests/Api --filter FullyQualifiedName~<TestName>`'));
  write(f.root, 'SAI_LEARNINGS.md', '## Test Command\n\nnpm test\n*Observed:* other\n');
  write(f.root, 'AGENTS.md', 'Run `make test` for everything.\n');
  const found = f.run('--change', 'demo').report;
  assert.deepEqual(found, {
    verdict: 'found',
    command: 'dotnet test tests/Api',
    scoping_idiom: 'dotnet test tests/Api --filter FullyQualifiedName~<TestName>',
    source: 'tasks.md',
  });
  assert.equal(f.run().report.source, 'SAI_LEARNINGS.md', 'without a change, tasks.md is not a source');
});

test('I1 E5: a tasks.md value on the next line, in a fence or not, is read, and the no-runner sentinel is none', (t) => {
  const f = commandFixture(t);
  write(f.root, 'openspec/changes/demo/tasks.md', tasksWith('**Test Command**:\n\n```\npytest tests/<file>\n```'));
  assert.deepEqual([f.run('--change', 'demo').report.command, f.run('--change', 'demo').report.scoping_idiom], ['pytest', 'pytest tests/<file>']);
  write(f.root, 'openspec/changes/demo/tasks.md', tasksWith('**Test Command**: None — no test runner in this project'));
  const none = f.run('--change', 'demo').report;
  assert.deepEqual([none.verdict, none.command, none.source], ['none', null, 'tasks.md']);
  assert.equal(f.run('--change', 'missing').report.verdict, 'none', 'a change with no tasks.md falls through to the later sources and, with none, to the markers');
});

test('I1 E5: SAI_LEARNINGS.md gives its keyless command without the provenance line or a trailing remark', (t) => {
  const f = commandFixture(t);
  write(f.root, 'package.json', JSON.stringify({ scripts: { test: 'node --test' } }));
  write(f.root, 'SAI_LEARNINGS.md', '# Learnings\n\n## Stack\n\n- **node**: 22\n\n## Test Command\n\nnpm test (runs node --test from the repo root)\n*Observed:* earlier\n\n## Avoid\n');
  const found = f.run().report;
  assert.deepEqual(found, { verdict: 'found', command: 'npm test', scoping_idiom: 'append `-- <test files>` to the command', source: 'SAI_LEARNINGS.md' });
});

test('E5: AGENTS.md then README.md name the command; a general command with narrower variants wins, and unrelated ones are ambiguous', (t) => {
  const f = commandFixture(t);
  write(f.root, 'AGENTS.md', 'Run `npm test` before a push; `npm test -- --watch` while editing; `npm run test:e2e` is for CI.\n');
  assert.deepEqual(f.run().report, { verdict: 'found', command: 'npm test', scoping_idiom: null, source: 'AGENTS.md' });
  write(f.root, 'AGENTS.md', 'Nothing about tests here.\n');
  write(f.root, 'README.md', '```sh\n$ pytest\n$ make test\n```\n');
  const ambiguous = f.run().report;
  assert.equal(ambiguous.verdict, 'ambiguous');
  assert.equal(ambiguous.source, 'README.md');
  assert.deepEqual(ambiguous.candidates, ['pytest', 'make test']);
  assert.equal(ambiguous.command, null);
});

test('I1: the project markers give the command and the idiom that merge.js used to detect, and the .NET solutions are ambiguous when several', (t) => {
  const f = commandFixture(t);
  assert.deepEqual(f.run().report, { verdict: 'none', command: null, scoping_idiom: null, source: 'marker' });
  write(f.root, 'pyproject.toml', '[tool.pytest]\n');
  assert.deepEqual(f.run().report, { verdict: 'found', command: 'pytest', scoping_idiom: 'append the test files as path arguments', source: 'marker:pyproject.toml' });
  write(f.root, 'package.json', JSON.stringify({ scripts: { test: 'vitest run' }, packageManager: 'pnpm@9.0.0' }));
  assert.deepEqual(f.run().report, { verdict: 'found', command: 'pnpm test', scoping_idiom: 'append the test files as path arguments', source: 'marker:package.json' });
  write(f.root, 'package.json', JSON.stringify({ scripts: { test: 'tsc && node --test' } }));
  assert.deepEqual(f.run().report, { verdict: 'found', command: 'npm test', scoping_idiom: null, source: 'marker:package.json' });
  fs.rmSync(path.join(f.root, 'package.json'));
  fs.rmSync(path.join(f.root, 'pyproject.toml'));
  write(f.root, 'src/App.csproj', '<Project/>');
  write(f.root, 'One.sln', '');
  write(f.root, 'Two.sln', '');
  const dotnet = f.run().report;
  assert.equal(dotnet.verdict, 'ambiguous');
  assert.deepEqual(dotnet.candidates, ['dotnet test One.sln', 'dotnet test Two.sln']);
});

test('E5: the command is always runnable: a placeholder never reaches it, and a field may name the command beside its idiom', (t) => {
  const f = commandFixture(t);
  const field = (value) => write(f.root, 'openspec/changes/demo/tasks.md', tasksWith(`**Test Command**: ${value}`));
  field('`dotnet test App.sln`; scoped: `dotnet test App.sln --filter FullyQualifiedName~<TestName>`');
  assert.deepEqual(f.run('--change', 'demo').report, {
    verdict: 'found', command: 'dotnet test App.sln', scoping_idiom: 'dotnet test App.sln --filter FullyQualifiedName~<TestName>', source: 'tasks.md',
  });
  field('`npm test -- <test files>`');
  assert.deepEqual([f.run('--change', 'demo').report.command, f.run('--change', 'demo').report.scoping_idiom], ['npm test', 'npm test -- <test files>']);
  field('`go test -run <TestName> ./...`');
  assert.equal(f.run('--change', 'demo').report.command, 'go test ./...');
  field('`npx vitest run --testNamePattern=<name>`');
  assert.equal(f.run('--change', 'demo').report.command, 'npx vitest run');
  field('`<runner> <files>`');
  const unusable = f.run('--change', 'demo').report;
  assert.deepEqual([unusable.verdict, unusable.command, unusable.candidates], ['ambiguous', null, ['<runner> <files>']]);
  fs.rmSync(path.join(f.root, 'openspec'), { recursive: true });
  write(f.root, 'README.md', 'Run `pytest` or one file with `pytest <path>`.\n');
  assert.deepEqual(f.run().report, { verdict: 'found', command: 'pytest', scoping_idiom: 'pytest <path>', source: 'README.md' });
});

test('E5: a bun project runs its test script, and a test script under an unknown manager is ambiguous, never none', (t) => {
  const f = commandFixture(t);
  write(f.root, 'package.json', JSON.stringify({ scripts: { test: 'bun test' }, packageManager: 'bun@1.1.0' }));
  assert.deepEqual(f.run().report, { verdict: 'found', command: 'bun run test', scoping_idiom: 'append the test files as path arguments', source: 'marker:package.json' });
  write(f.root, 'package.json', JSON.stringify({ scripts: { test: 'vitest run' } }));
  write(f.root, 'bun.lock', '');
  assert.equal(f.run().report.command, 'bun run test', 'bun.lock alone selects bun');
  write(f.root, 'package.json', JSON.stringify({ scripts: { test: 'tsc && vitest run' }, packageManager: 'bun@1.1.0' }));
  assert.deepEqual(f.run().report.scoping_idiom, null, 'a compound script takes no list of files');
  write(f.root, 'package.json', JSON.stringify({ scripts: { test: 'jest' }, packageManager: 'deno@2.0.0' }));
  const unknown = f.run().report;
  assert.deepEqual([unknown.verdict, unknown.command, unknown.candidates], ['ambiguous', null, ['deno run test']]);
  fs.rmSync(path.join(f.root, 'package.json'));
  write(f.root, 'AGENTS.md', 'Run `bun test` for the unit tests.\n');
  assert.deepEqual(f.run().report, { verdict: 'found', command: 'bun test', scoping_idiom: 'append the test files as path arguments', source: 'AGENTS.md' });
});

test('I1: command is read-only and takes no input file', (t) => {
  const f = commandFixture(t);
  write(f.root, 'package.json', JSON.stringify({ scripts: { test: 'node --test' } }));
  const before = fs.readdirSync(f.root).sort();
  f.run();
  assert.deepEqual(fs.readdirSync(f.root).sort(), before);
  assert.equal(f.run('--input-file', path.join(f.root, 'package.json')).status, 2);
});
