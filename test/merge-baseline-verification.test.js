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

function capture(fixture, name = 'baseline.json') {
  const record = path.join(fixture.parent, name);
  const saved = cli(fixture.cwd, ['verify', '--baseline', '--command', fixture.command, '--record', record]);
  assert.equal(saved.status, 0, JSON.stringify(saved.payload));
  return { record, hash: saved.payload.record_hash, view: saved.payload };
}

function compare(fixture, baseline, extra = []) {
  const run = cli(fixture.cwd, ['verify', '--command', fixture.command, '--baseline-record', baseline.record, '--baseline-hash', baseline.hash,
    '--record', path.join(fixture.parent, `compare-${Math.random().toString(16).slice(2)}.json`), ...extra]);
  return run;
}

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

test('the baseline stores the failing tests per name, without running anything else', t => {
  const fixture = scripted(t, [failing('already broken', 'also broken')]);
  const head = git(fixture.cwd, ['rev-parse', 'HEAD']).trim();
  const baseline = capture(fixture);
  assert.equal(baseline.view.data.mode, 'baseline');
  assert.equal(baseline.view.data.verification_result, 'failed');
  assert.equal(baseline.view.outcome, 'success', 'a failing baseline is captured, not an error');
  assert.deepEqual(baseline.view.data.failing, ['already broken', 'also broken']);
  assert.equal(baseline.view.data.identified, true);
  assert.equal(baseline.view.data.head, head);
  assert.equal(baseline.view.data.stdout, undefined, 'the view carries hashes, the record keeps the output');
  const stored = JSON.parse(fs.readFileSync(baseline.record, 'utf8'));
  assert.match(stored.data.stdout, /not ok 1 - already broken/);
  assert.equal(baseline.hash, hash(fs.readFileSync(baseline.record)));
  assert.equal(fixture.runs(), 1);
  // A baseline needs its record, and the record is exclusive.
  assert.equal(cli(fixture.cwd, ['verify', '--baseline', '--command', fixture.command]).status, 2);
  assert.equal(cli(fixture.cwd, ['verify', '--baseline', '--command', fixture.command, '--record', baseline.record]).status, 2);
});

test('a suite that passes in the baseline and passes later is clean', t => {
  const fixture = scripted(t, [passing]);
  const baseline = capture(fixture);
  assert.equal(baseline.view.data.verification_result, 'passed');
  const result = compare(fixture, baseline);
  assert.equal(result.status, 0, JSON.stringify(result.payload));
  assert.equal(result.payload.data.verification_result, 'passed');
  assert.equal(result.payload.data.comparison.status, 'clean');
  assert.equal(fixture.runs(), 2, 'one baseline run and one comparison run, with no rerun');
});

test('a failure that appears after the integration is rerun once and counts as new only when it fails again', t => {
  const fixture = scripted(t, [passing]);
  const baseline = capture(fixture);
  fixture.setPlan([failing('regressed', 'second regression'), failing('regressed')]);
  const result = compare(fixture, baseline);
  assert.equal(result.status, 1, 'a new failure is the one failure that blocks');
  assert.equal(result.payload.data.verification_result, 'failed');
  assert.equal(result.payload.data.comparison.status, 'new');
  assert.deepEqual(result.payload.data.comparison.new, ['regressed']);
  assert.deepEqual(result.payload.data.comparison.flaky, ['second regression']);
  assert.equal(fixture.runs(), 2, 'exactly one rerun');
  assert.equal(result.payload.data.runs.length, 2);
  assert.equal(result.payload.data.runs[0].stdout, undefined);
  assert.match(result.payload.data.runs[0].stdout_hash, /^[0-9a-f]{64}$/);
  const stored = JSON.parse(fs.readFileSync(result.payload.record, 'utf8'));
  assert.match(stored.data.runs[0].stdout, /second regression/, 'the record keeps the output of both runs');
});

test('a test that passes on the rerun is flaky and does not block', t => {
  const fixture = scripted(t, [passing]);
  const baseline = capture(fixture);
  fixture.setPlan([failing('sometimes'), passing]);
  const result = compare(fixture, baseline);
  assert.equal(result.status, 0, JSON.stringify(result.payload));
  assert.equal(result.payload.data.verification_result, 'passed');
  assert.equal(result.payload.data.comparison.status, 'flaky');
  assert.deepEqual(result.payload.data.comparison.flaky, ['sometimes']);
  assert.deepEqual(result.payload.data.comparison.new, []);
});

test('two runs that fail on different tests confirm nothing new: both tests are flaky and nothing blocks', t => {
  const fixture = scripted(t, [passing]);
  const baseline = capture(fixture);
  fixture.setPlan([failing('first only'), failing('second only')]);
  const result = compare(fixture, baseline);
  assert.equal(result.status, 0, JSON.stringify(result.payload));
  assert.equal(result.payload.data.verification_result, 'passed');
  assert.equal(result.payload.data.comparison.status, 'flaky');
  assert.deepEqual(result.payload.data.comparison.new, []);
  assert.deepEqual(result.payload.data.comparison.flaky, ['first only', 'second only']);
  assert.equal(fixture.runs(), 2, 'one comparison run and exactly one rerun');
});

test('a failure already in the baseline is pre-existing: reported, never rerun, never blocking', t => {
  const fixture = scripted(t, [failing('old failure')]);
  const baseline = capture(fixture);
  const result = compare(fixture, baseline);
  assert.equal(result.status, 0, JSON.stringify(result.payload));
  assert.equal(result.payload.data.verification_result, 'passed');
  assert.equal(result.payload.data.comparison.status, 'preexisting');
  assert.deepEqual(result.payload.data.comparison.preexisting, ['old failure']);
  assert.equal(fixture.runs(), 2, 'no rerun for a pre-existing failure');
  // A new failure beside it is still caught, and the old one stays pre-existing.
  fixture.setPlan([failing('old failure', 'fresh failure')]);
  const mixed = compare(fixture, baseline);
  assert.equal(mixed.payload.data.comparison.status, 'new');
  assert.deepEqual(mixed.payload.data.comparison.new, ['fresh failure']);
  assert.deepEqual(mixed.payload.data.comparison.preexisting, ['old failure']);
});

test('a suite that names no tests is not comparable once its baseline failed, and a whole-suite failure otherwise', t => {
  const unnamed = { exit: 1, lines: ['something went wrong'] };
  const failedBefore = scripted(t, [unnamed]);
  const baseline = capture(failedBefore);
  assert.equal(baseline.view.data.identified, false);
  const notComparable = compare(failedBefore, baseline);
  assert.equal(notComparable.status, 0, JSON.stringify(notComparable.payload));
  assert.equal(notComparable.payload.data.verification_result, 'passed');
  assert.equal(notComparable.payload.data.comparison.status, 'not-comparable');
  assert.equal(failedBefore.runs(), 2);

  const passedBefore = scripted(t, [passing]);
  const clean = capture(passedBefore);
  passedBefore.setPlan([unnamed]);
  const whole = compare(passedBefore, clean);
  assert.equal(whole.status, 1);
  assert.equal(whole.payload.data.comparison.status, 'new');
  assert.deepEqual(whole.payload.data.comparison.new, ['(suite)']);
  assert.equal(passedBefore.runs(), 2, 'the whole-suite failure is rerun once');
});

test('verification is unavailable when the baseline or the command is', t => {
  const fixture = scripted(t, [passing]);
  const noCommand = path.join(fixture.parent, 'baseline-none.json');
  const unavailable = cli(fixture.cwd, ['verify', '--baseline', '--record', noCommand]);
  assert.equal(unavailable.status, 0, JSON.stringify(unavailable.payload));
  assert.equal(unavailable.payload.data.verification_result, 'unavailable');
  assert.equal(unavailable.payload.data.unavailable_reason, 'no-suite');
  const reference = { record: noCommand, hash: unavailable.payload.record_hash };
  const later = compare(fixture, reference);
  assert.equal(later.status, 0, JSON.stringify(later.payload));
  assert.equal(later.payload.data.verification_result, 'unavailable');
  assert.equal(later.payload.data.comparison.status, 'unavailable');
  assert.equal(fixture.runs(), 0, 'nothing runs without a baseline to compare with');

  const baseline = capture(fixture);
  const unrunnable = cli(fixture.cwd, ['verify', '--command', 'definitely-not-a-command-sai', '--baseline-record', baseline.record,
    '--baseline-hash', baseline.hash, '--record', path.join(fixture.parent, 'unrunnable.json')]);
  assert.equal(unrunnable.payload.data.comparison.status, 'unavailable');
  assert.equal(unrunnable.payload.data.verification_result, 'unavailable');
});

test('a baseline record is used only unchanged and only when it is a baseline', t => {
  const fixture = scripted(t, [passing]);
  const baseline = capture(fixture);
  const wrongHash = cli(fixture.cwd, ['verify', '--command', fixture.command, '--baseline-record', baseline.record, '--baseline-hash', hash('x')]);
  assert.equal(wrongHash.status, 2);
  assert.match(wrongHash.payload.error, /baseline record hash/);
  assert.equal(cli(fixture.cwd, ['verify', '--command', fixture.command, '--baseline-record', baseline.record]).status, 2);
  const plain = path.join(fixture.parent, 'plain.json');
  const verified = cli(fixture.cwd, ['verify', '--command', fixture.command, '--record', plain]);
  assert.equal(verified.status, 0);
  const notBaseline = cli(fixture.cwd, ['verify', '--command', fixture.command, '--baseline-record', plain, '--baseline-hash', verified.payload.record_hash]);
  assert.equal(notBaseline.status, 2);
  assert.match(notBaseline.payload.error, /captured baseline record required/);
});

test('a plain verification still reports passed, failed, and unavailable exactly as before', t => {
  const fixture = scripted(t, [failing('x')]);
  const run = cli(fixture.cwd, ['verify', '--command', fixture.command]);
  assert.equal(run.status, 1);
  assert.equal(run.payload.data.verification_result, 'failed');
  assert.equal(run.payload.data.comparison, undefined);
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
