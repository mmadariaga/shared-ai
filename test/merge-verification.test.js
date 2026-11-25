'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const merge = require('../sai/tools/merge');

const TOOL = path.join(__dirname, '..', 'sai/tools/merge.js');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function git(cwd, args) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout;
}

function cli(cwd, args, input = '') {
  const run = spawnSync(process.execPath, [TOOL, ...args, '--json', '--cwd', cwd], { encoding: 'utf8', input });
  return { status: run.status, payload: JSON.parse(run.stdout) };
}

// A repository, plus a scripted suite that lives outside it: run N prints the Nth
// planned output (the last one repeats) and exits with its code, so a run never
// changes the repository state the tool compares before and after.
function scripted(t, plan = [{ exit: 0, lines: [] }]) {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-merge-baseline-'));
  const cwd = path.join(parent, 'repo');
  fs.mkdirSync(cwd);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  git(cwd, ['init', '-b', 'main']);
  git(cwd, ['config', 'user.name', 'Test']);
  git(cwd, ['config', 'user.email', 'test@example.com']);
  fs.writeFileSync(path.join(cwd, 'a.txt'), 'a\n');
  git(cwd, ['add', '.']); git(cwd, ['commit', '-m', 'base']);
  const script = path.join(parent, 'suite.js');
  const counter = path.join(parent, 'runs.txt');
  fs.writeFileSync(script, `const fs = require('fs');
const plan = JSON.parse(fs.readFileSync(${JSON.stringify(path.join(parent, 'plan.json'))}, 'utf8'));
const runs = fs.existsSync(${JSON.stringify(counter)}) ? Number(fs.readFileSync(${JSON.stringify(counter)}, 'utf8')) : 0;
fs.writeFileSync(${JSON.stringify(counter)}, String(runs + 1));
const step = plan[Math.min(runs, plan.length - 1)];
console.log(step.lines.join('\\n'));
process.exit(step.exit);
`);
  const setPlan = next => { fs.writeFileSync(path.join(parent, 'plan.json'), JSON.stringify(next)); fs.rmSync(counter, { force: true }); };
  setPlan(plan);
  const command = `node ${script}`;
  const runs = () => fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0;
  return { parent, cwd, command, setPlan, runs };
}

const failing = (...names) => ({ exit: 1, lines: names.map((name, i) => `not ok ${i + 1} - ${name}`) });
const passing = { exit: 0, lines: ['ok 1 - everything'] };

test('failing tests are named from the output of the common runners, and an unnamed failure names none', () => {
  const names = text => merge.failingTests({ stdout: text, stderr: '' });
  assert.deepEqual(names('ok 1 - fine\nnot ok 2 - broken thing # TODO\nnot ok 3 - other'), ['broken thing', 'other']);
  assert.deepEqual(names('✔ fine (1.2ms)\n✖ spec failure (0.4ms)\n\nℹ fail 1'), ['spec failure']);
  assert.deepEqual(names('\u001b[31m✖ colored (3ms)\u001b[0m'), ['colored']);
  assert.deepEqual(names('FAILED tests/test_a.py::test_b - AssertionError\nFAILED tests/test_c.py::test_d'), ['tests/test_a.py::test_b', 'tests/test_c.py::test_d']);
  assert.deepEqual(names('--- FAIL: TestOne (0.00s)\n--- PASS: TestTwo (0.00s)'), ['TestOne']);
  assert.deepEqual(names('test module::case ... FAILED\ntest module::fine ... ok'), ['module::case']);
  assert.deepEqual(names('  Failed Namespace.Tests.Broken [12 ms]'), ['Namespace.Tests.Broken']);
  assert.deepEqual(names('Segmentation fault'), []);
  assert.deepEqual(merge.failingTests({ stdout: '', stderr: 'not ok 1 - from stderr' }), ['from stderr']);
});

test('a runner summary header is not a failing test: real node --test output names only the real tests', () => {
  const output = [
    '✔ alpha (0.5ms)', '✖ beta (1.2ms)', '▶ suite', '  ✖ nested case (0.3ms)', '▶ suite (2ms)', '',
    'ℹ tests 3', 'ℹ fail 2', '',
    '✖ failing tests:', '', 'test at test/a.test.js:3:1', '✖ beta (1.2ms)', '  Error: boom', '  ✖ nested case (0.3ms)',
  ].join('\n');
  assert.deepEqual(merge.failingTests({ stdout: output, stderr: '' }), ['beta', 'nested case']);
});

test('I5: verify runs the exact command line it is given, names the failing tests, and never discovers a suite', t => {
  const fixture = scripted(t, [failing('broken one', 'broken two')]);
  const run = cli(fixture.cwd, ['verify', '--command', fixture.command]);
  assert.equal(run.status, 1);
  assert.equal(run.payload.data.verification_result, 'failed');
  assert.deepEqual(run.payload.data.failing, ['broken one', 'broken two']);
  assert.equal(run.payload.data.command, fixture.command);
  assert.equal(fixture.runs(), 1, 'one run, no rerun and no comparison inside the tool');
  assert.equal(run.payload.data.comparison, undefined);
  fixture.setPlan([passing]);
  const passed = cli(fixture.cwd, ['verify', '--command', fixture.command]);
  assert.equal(passed.status, 0);
  assert.deepEqual([passed.payload.data.verification_result, passed.payload.data.failing], ['passed', []]);
});

test('I1 I5: without --command the tool reports a usage error, and the retired suite and baseline entry points are gone', t => {
  const fixture = scripted(t);
  fs.writeFileSync(path.join(fixture.cwd, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(0)"' } }));
  const bare = cli(fixture.cwd, ['verify']);
  assert.equal(bare.status, 2);
  assert.match(bare.payload.error, /verify requires --command/);
  for (const retired of [['suite'], ['verify', '--command', fixture.command, '--baseline'], ['verify', '--command', fixture.command, '--baseline-record', 'x'], ['verify', '--suite', 'x']]) {
    assert.equal(cli(fixture.cwd, retired).status, 2, retired.join(' '));
  }
  for (const name of ['suite', 'baseline', 'compareToBaseline']) assert.equal(merge[name], undefined, `${name} is no longer exported`);
  assert.doesNotMatch(fs.readFileSync(TOOL, 'utf8'), /METADATA|dotnetMarkers|Cargo\.toml|pyproject/, 'the marker detection lives in test-select.js');
});

test('a command that cannot start is unavailable with its reason, apart from failing tests', t => {
  const fixture = scripted(t);
  const run = cli(fixture.cwd, ['verify', '--command', 'sai-merge-no-such-tool --run']);
  assert.equal(run.payload.data.verification_result, 'unavailable');
  assert.equal(run.payload.data.unavailable_reason, 'not-runnable');
});

function upstreamFixture(t) {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-merge-upstream-'));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const origin = path.join(parent, 'origin.git');
  const cwd = path.join(parent, 'repo');
  git(parent, ['init', '--bare', '-b', 'main', origin]);
  git(parent, ['clone', origin, cwd]);
  git(cwd, ['config', 'user.name', 'Test']);
  git(cwd, ['config', 'user.email', 'test@example.com']);
  const commit = (name, body) => { fs.writeFileSync(path.join(cwd, name), body); git(cwd, ['add', name]); git(cwd, ['commit', '-m', name]); };
  commit('base.txt', 'base\n');
  git(cwd, ['push', '-u', 'origin', 'main']);
  git(cwd, ['checkout', '-b', 'feature']);
  commit('feature.txt', 'feature\n');
  git(cwd, ['checkout', 'main']);
  commit('own-1.txt', '1\n');
  git(cwd, ['push']);
  commit('own-2.txt', '2\n');
  return { cwd, commit };
}

test('provenance records the upstream and how many rewritten commits the upstream already holds', t => {
  const { cwd } = upstreamFixture(t);
  const facts = (method, squash) => merge.provenance(cwd, 'refs/heads/feature', method, squash).data.upstream;
  assert.deepEqual(facts('merge', 'not-applicable'), { ref: 'refs/remotes/origin/main', rewritten_commits: 0, shared_with_upstream: 0, force_push_needed: false });
  assert.deepEqual(facts('rebase', 'no'), { ref: 'refs/remotes/origin/main', rewritten_commits: 2, shared_with_upstream: 1, force_push_needed: true });
  assert.deepEqual(facts('rebase', 'yes'), facts('rebase', 'no'), 'a squash rewrites the same commits as a rebase');
});

test('a rebase of commits the upstream does not hold needs no force push, and no upstream means none to force over', t => {
  const { cwd } = upstreamFixture(t);
  const base = git(cwd, ['merge-base', 'main', 'feature']).trim();
  git(cwd, ['checkout', '-b', 'local', base]);
  git(cwd, ['commit', '--allow-empty', '-m', 'local only']);
  const untracked = merge.provenance(cwd, 'refs/heads/feature', 'rebase', 'no').data.upstream;
  assert.deepEqual(untracked, { ref: null, rewritten_commits: 1, shared_with_upstream: 0, force_push_needed: false });
  git(cwd, ['branch', '--set-upstream-to=origin/main', 'local']);
  assert.deepEqual(merge.provenance(cwd, 'refs/heads/feature', 'rebase', 'no').data.upstream,
    { ref: 'refs/remotes/origin/main', rewritten_commits: 1, shared_with_upstream: 0, force_push_needed: false });
});
