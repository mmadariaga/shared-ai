'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { removeInside } = require('../sai/tools/temp-root');
const { repeatedFiles } = require('../sai/tools/merge');

const ROOT = path.join(__dirname, '..');
const TOOL = path.join(ROOT, 'sai/tools/merge.js');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const section = (text, from, to) => text.slice(text.indexOf(from), text.indexOf(to));
const lines = (...items) => items.map(item => `${item}\n`).join('');

// Linux ignores the temp environment: the Claude Code root is /tmp/claude-{uid}, which the
// harness owns. Stand in for it the way the CI workflow does, and leave it in place.
function ensureLinuxRoots() {
  if (process.platform !== 'linux') return;
  const harness = `/tmp/claude-${process.getuid()}`;
  if (!fs.existsSync(harness)) fs.mkdirSync(harness, { mode: 0o700 });
}

function git(cwd, args, allowedFailure = false) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (!allowedFailure) assert.equal(run.status, 0, run.stderr);
  return run;
}

function repository(t) {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-merge-simulate-'));
  const cwd = path.join(parent, 'repo');
  fs.mkdirSync(cwd);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  git(cwd, ['init', '-b', 'main']);
  git(cwd, ['config', 'user.name', 'Test']);
  git(cwd, ['config', 'user.email', 'test@example.com']);
  git(cwd, ['config', 'core.autocrlf', 'false']);
  return { parent, cwd };
}

const commit = (cwd, subject, files) => {
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(cwd, name), text);
  git(cwd, ['add', '-A']);
  git(cwd, ['commit', '-m', subject]);
};

// Three commits on `feature` replay onto `main`: the first and the second change the same line of
// f.txt that main changed, and the third changes the line of g.txt that main changed.
function scenario(t) {
  const { cwd } = repository(t);
  commit(cwd, 'base', { 'f.txt': lines('a', 'b', 'c'), 'g.txt': lines('x', 'y', 'z') });
  git(cwd, ['checkout', '-b', 'feature']);
  commit(cwd, 'feat: first', { 'f.txt': lines('a', 'F1', 'c') });
  commit(cwd, 'feat: second', { 'f.txt': lines('a', 'F2', 'c') });
  commit(cwd, 'feat: third', { 'g.txt': lines('x', 'G', 'z') });
  git(cwd, ['checkout', 'main']);
  commit(cwd, 'feat: upstream f', { 'f.txt': lines('a', 'M', 'c') });
  commit(cwd, 'feat: upstream g', { 'g.txt': lines('x', 'H', 'z') });
  git(cwd, ['checkout', 'feature']);
  return cwd;
}

function simulate(t, cwd, method, ref = 'refs/heads/main', env = process.env) {
  ensureLinuxRoots();
  const run = spawnSync(process.execPath, [TOOL, 'simulate', '--source-ref', ref, '--method', method, '--harness', 'claude', '--json', '--cwd', cwd], { encoding: 'utf8', env });
  const payload = JSON.parse(run.stdout);
  if (payload.record) t.after(() => removeInside('claude', path.dirname(payload.record)));
  return { status: run.status, payload };
}

const snapshot = cwd => ({
  head: git(cwd, ['rev-parse', 'HEAD']).stdout,
  refs: git(cwd, ['for-each-ref']).stdout,
  index: git(cwd, ['ls-files', '--stage']).stdout,
  status: git(cwd, ['status', '--porcelain=v1', '--untracked-files=all']).stdout,
  files: ['f.txt', 'g.txt'].map(name => fs.readFileSync(path.join(cwd, name), 'utf8')),
  operation: fs.existsSync(path.join(cwd, '.git', 'rebase-merge')) || fs.existsSync(path.join(cwd, '.git', 'MERGE_HEAD')),
});

test('I1: a rebase simulation predicts one stop per conflicting replayed commit and touches no working tree, index, or ref', t => {
  const cwd = scenario(t);
  const before = snapshot(cwd);
  const { status, payload } = simulate(t, cwd, 'rebase');
  assert.equal(status, 0);
  assert.equal(payload.action, 'simulate');
  assert.equal(payload.outcome, 'success');
  assert.equal(payload.data.status, 'ok');
  assert.equal(payload.data.method, 'rebase');
  assert.equal(payload.data.replayed, 3);
  assert.equal(payload.data.predicted_stops, 3);
  assert.deepEqual(payload.data.repeated_files, []);
  assert.equal(payload.data.stops, undefined, 'stdout carries the summary; the stops are in the detail file');
  assert.deepEqual(snapshot(cwd), before);
  const detail = JSON.parse(fs.readFileSync(payload.record, 'utf8'));
  assert.deepEqual(detail.data.stops.map(stop => [stop.position, stop.subject, stop.files]),
    [[1, 'feat: first', ['f.txt']], [2, 'feat: second', ['f.txt']], [3, 'feat: third', ['g.txt']]]);
  assert.equal(payload.record_hash, hash(fs.readFileSync(payload.record)));
  assert.equal(JSON.stringify(payload.state), JSON.stringify(detail.state));
});

test('I1: the detail file sits in a private directory under the SAI temp root, outside the repository', t => {
  const cwd = scenario(t);
  const { payload } = simulate(t, cwd, 'rebase');
  const dir = path.dirname(payload.record);
  assert.match(path.basename(dir), /^merge-simulation-/);
  assert.equal(path.basename(path.dirname(dir)), 'sai');
  assert.ok(path.relative(cwd, dir).startsWith('..'));
  if (process.platform !== 'win32') assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
  assert.deepEqual(fs.readdirSync(dir), ['simulation.json'], 'the temporary index is gone');
});

test('I8 (accepted deviation): after a predicted stop the next commit starts from the current tip\'s version, so the prediction runs on and repeated stops on one file are predicted', t => {
  const { cwd } = repository(t);
  commit(cwd, 'base', { 'f.txt': lines('a', 'b', 'c'), 'g.txt': lines('x') });
  git(cwd, ['checkout', '-b', 'feature']);
  for (const [index, text] of ['F1', 'F2', 'F3'].entries()) commit(cwd, `feat: change ${index + 1}`, { 'f.txt': lines('a', text, 'c') });
  commit(cwd, 'feat: other', { 'g.txt': lines('y') });
  git(cwd, ['checkout', 'main']);
  commit(cwd, 'feat: upstream f', { 'f.txt': lines('a', 'M', 'c') });
  git(cwd, ['checkout', 'feature']);
  const { payload } = simulate(t, cwd, 'rebase');
  assert.equal(payload.data.replayed, 4);
  assert.equal(payload.data.predicted_stops, 3);
  assert.deepEqual(payload.data.repeated_files, [{ path: 'f.txt', stops: 3 }]);
  const stops = JSON.parse(fs.readFileSync(payload.record, 'utf8')).data.stops;
  assert.deepEqual(stops.map(stop => [stop.position, stop.files]), [[1, ['f.txt']], [2, ['f.txt']], [3, ['f.txt']]],
    'the clean fourth commit is still simulated after three stops');
  assert.equal(simulate(t, cwd, 'squash').payload.data.predicted_stops, 1, 'a squash stops once on the same file');
});

test('I8 (accepted deviation): a file the upstream deleted stays deleted in the simulated tip, so later commits on it stop again', t => {
  const { cwd } = repository(t);
  commit(cwd, 'base', { 'f.txt': lines('a', 'b', 'c') });
  git(cwd, ['checkout', '-b', 'feature']);
  commit(cwd, 'feat: one', { 'f.txt': lines('a', 'B', 'c') });
  commit(cwd, 'feat: two', { 'f.txt': lines('a', 'B', 'C') });
  git(cwd, ['checkout', 'main']);
  git(cwd, ['rm', '-q', 'f.txt']);
  git(cwd, ['commit', '-m', 'feat: drop f']);
  git(cwd, ['checkout', 'feature']);
  const { payload } = simulate(t, cwd, 'rebase');
  assert.equal(payload.data.predicted_stops, 2);
});

test('I1: a squash is one step and a merge is one step; a squash with nothing to squash has none', t => {
  const cwd = scenario(t);
  const squash = simulate(t, cwd, 'squash').payload.data;
  assert.equal(squash.replayed, 1);
  assert.equal(squash.predicted_stops, 1);
  const merge = simulate(t, cwd, 'merge').payload;
  assert.equal(merge.data.replayed, 1);
  assert.equal(merge.data.predicted_stops, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(merge.record, 'utf8')).data.stops[0].files, ['f.txt', 'g.txt']);
  git(cwd, ['checkout', '-b', 'topic', 'main~2']);
  const none = simulate(t, cwd, 'squash', 'refs/heads/feature').payload.data;
  assert.equal(none.replayed, 0);
  assert.equal(none.predicted_stops, 0);
});

test('I1: a commit the source already holds by patch is not replayed, and a clean range predicts no stop', t => {
  const { cwd } = repository(t);
  commit(cwd, 'base', { 'f.txt': lines('a', 'b', 'c') });
  git(cwd, ['checkout', '-b', 'feature']);
  commit(cwd, 'feat: same', { 'f.txt': lines('a', 'B', 'c') });
  commit(cwd, 'feat: own', { 'own.txt': lines('own') });
  git(cwd, ['checkout', 'main']);
  commit(cwd, 'feat: same', { 'f.txt': lines('a', 'B', 'c') });
  git(cwd, ['checkout', 'feature']);
  const { payload } = simulate(t, cwd, 'rebase');
  assert.equal(payload.data.replayed, 1);
  assert.equal(payload.data.predicted_stops, 0);
});

test('I4: repeated files are the files with 3 or more predicted stops, most stops first', () => {
  const stops = [
    { files: ['t.js', 'a.js'] }, { files: ['t.js'] }, { files: ['t.js', 'a.js', 'b.js'] }, { files: ['a.js'] }, { files: ['a.js', 'b.js'] },
  ];
  assert.deepEqual(repeatedFiles(stops), [{ path: 'a.js', stops: 4 }, { path: 't.js', stops: 3 }]);
  assert.deepEqual(repeatedFiles(stops.slice(0, 2)), []);
});

test('E2: git without merge-tree --write-tree makes the simulation not applicable, with a reason and no file', { skip: process.platform === 'win32' && 'needs a POSIX shell stand-in for git' }, t => {
  const cwd = scenario(t);
  const bin = path.join(path.dirname(cwd), 'bin');
  fs.mkdirSync(bin);
  const realGit = spawnSync('which', ['git'], { encoding: 'utf8' }).stdout.trim();
  fs.writeFileSync(path.join(bin, 'git'), `#!/bin/sh\nif [ "$1" = merge-tree ]; then echo "usage: git merge-tree" >&2; exit 129; fi\nexec "${realGit}" "$@"\n`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  const { status, payload } = simulate(t, cwd, 'rebase', 'refs/heads/main', env);
  assert.equal(status, 0, 'a simulation that cannot run is not a failed check');
  assert.equal(payload.outcome, 'not-applicable');
  assert.equal(payload.data.status, 'unavailable');
  assert.match(payload.data.reason, /merge-tree/);
  assert.equal(payload.record, undefined);
});

test('E2: a ref git cannot read is an unavailable simulation, while a malformed call is a usage error', t => {
  const cwd = scenario(t);
  const missing = simulate(t, cwd, 'rebase', 'refs/heads/absent');
  assert.equal(missing.payload.outcome, 'not-applicable');
  assert.equal(missing.payload.data.status, 'unavailable');
  assert.equal(simulate(t, cwd, 'cherry-pick').status, 2);
  assert.equal(simulate(t, cwd, 'rebase', 'main').status, 2);
  const withRecord = spawnSync(process.execPath, [TOOL, 'simulate', '--source-ref', 'refs/heads/main', '--method', 'rebase', '--record', path.join(path.dirname(cwd), 'x.json'), '--json', '--cwd', cwd], { encoding: 'utf8' });
  assert.equal(withRecord.status, 2);
});

test('I2, E10, E11: the simulation runs after the answers for the chosen method, recommends nothing, and an explicit method adds no question', () => {
  const start = section(read('sai/commands/merge/coordinator.md'), '## Start', '## A conflict stop');
  const questions = start.slice(start.indexOf('3. Settle'), start.indexOf('4. Staged content'));
  const step = start.slice(start.indexOf('5. Simulate'), start.indexOf('6. Open the run state'));
  assert.doesNotMatch(questions, /merge\.js simulate|repeated_files|mark squash|as recommended/, 'the questions neither run nor read the simulation');
  assert.ok(start.indexOf('3. Settle') < start.indexOf('merge.js simulate'));
  assert.ok(start.indexOf('merge.js simulate') < start.indexOf('Write `git status --porcelain` to `baseline-dirty.txt`'));
  assert.match(step, /with the branch and the method known \(the method of the arguments, the answer, or a merge without a picker\): run `merge\.js simulate` for that method/);
  assert.match(step, /It asks nothing and recommends nothing: its predicted stops and `repeated_files` go only to the `simulation` record and the closing report/);
  assert.doesNotMatch(read('sai/commands/merge/coordinator.md'), /mark squash as recommended|`rebase` while it is missing/);
});

test('E10: an unavailable simulation is noted in the report and stops nothing, and the real stops govern', () => {
  const step = section(read('sai/commands/merge/coordinator.md'), '5. Simulate', '6. Open the run state');
  assert.match(step, /A call that exits non-zero or reports `not-applicable` is an unavailable simulation: go on, with a note in the report/);
  assert.match(step, /It is advisory, the real stops govern/);
  assert.match(step, /removes the simulation directory/);
  assert.match(read('sai/commands/merge/mechanics.md'), /The prediction is advisory: hooks, autostash, and rerere can change what git does, and the real stops govern/);
  assert.match(read('sai/commands/merge/mechanics.md'), /feeds only the closing report: no question reads it and none recommends a method/);
});

test('I1: the run state records the simulation file, the close removes its directory, and the report shows the prediction', () => {
  const card = read('sai/commands/merge/coordinator.md');
  assert.match(section(card, '6. Open the run state', '7. Run `merge.js provenance`'), /When step 5 produced a simulation file, emit `record` \(`simulation`\) with its path/);
  assert.match(card, /`record` takes `ref` \(`obstacle`, `finding`, `assumption`, `shortcut`, `simulation`, or `report-dir`\)/);
  assert.match(section(card, '## Close', null), /remove the simulation directory the same way/);
  assert.match(section(card, '## Close', null), /the prediction of the simulation \(the method it simulated, its predicted stops and repeated files\) beside the stops that happened, or that the prediction was unavailable/);
});

test('the mechanics, the docs, and AGENTS.md describe the simulation, and the authority list is unchanged', () => {
  const mechanics = read('sai/commands/merge/mechanics.md');
  assert.match(mechanics, /\| `simulate --source-ref <full-ref> --method merge\\\|rebase\\\|squash/);
  assert.match(mechanics, /## Simulation/);
  assert.match(mechanics, /after a predicted stop the next step starts from the merged tree with the current tip's version \(`ours`, the upstream side\) of each conflicted file/i);
  assert.match(read('docs/commands/sai-merge.md'), /\*\*Prediction\.\*\*/);
  assert.match(read('AGENTS.md'), /`merge\.js simulate`/);
  const authority = section(read('sai/commands/merge/coordinator.md'), '**Authority.**', '## Start');
  assert.doesNotMatch(authority, /simulat/);
  assert.match(authority, /Never push, amend, force/);
  assert.match(read('sai/tools/merge.js'), /simulate --source-ref <full-ref> --method <merge\|rebase\|squash>/);
});
