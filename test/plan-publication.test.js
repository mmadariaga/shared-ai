'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const tool = require('../sai/tools/plan-publication');
function fixture(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-publication-test-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  const write = (name, content) => { fs.mkdirSync(path.dirname(path.join(cwd, name)), { recursive: true }); fs.writeFileSync(path.join(cwd, name), content); };
  git('init', '-b', 'feature'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.com');
  write('.gitignore', 'openspec/changes/**\n'); write('other.txt', 'base');
  git('add', '.'); git('commit', '-m', 'initial');
  for (const name of ['proposal.md', 'design.md', 'tasks.md', 'interfaces.md', '.openspec.yaml', 'change-overview.md', 'specs/example/spec.md']) write(`openspec/changes/example/${name}`, name);
  write('openspec/changes/foreign/tasks.md', 'foreign'); write('other.txt', 'staged'); git('add', 'other.txt'); write('other.txt', 'unstaged');
  return { cwd, git, write, request: { change: 'example', harness: 'opencode' }, io: { cwd } };
}
test('exact approved complete plan includes excluded control/overview/spec files and preserves unrelated staging and work', async t => {
  const { cwd, git, request, io } = fixture(t);
  const ready = await tool.query(request, io), head = git('rev-parse', 'HEAD'), staged = git('diff', '--cached'), unstaged = git('diff');
  assert.equal(ready.proposal.files.length, 7);
  assert.ok(ready.proposal.files.every(row => row.ignored));
  await assert.rejects(async () => await tool.commit({ ...request, confirmation: ready.confirmation }, io), /approval/);
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('diff', '--cached'), staged); // cancellation/preparation has no inclusion effects
  const result = await tool.commit({ ...request, approved: true, confirmation: ready.confirmation }, io);
  assert.equal(result.status, 'complete');
  assert.equal(git('diff', '--cached'), staged);
  assert.equal(git('diff'), unstaged);
  assert.equal(git('show', 'HEAD:other.txt'), 'base');
  assert.ok(!git('ls-tree', '-r', '--name-only', 'HEAD').includes('foreign'));
  assert.equal(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8'), 'openspec/changes/**\n');
  const fresh = await tool.query(request, io);
  assert.equal((await tool.commit({ ...request, approved: true, confirmation: fresh.confirmation }, io)).status, 'no_changes');
});
test('changed content or exact file list invalidates inclusion approval; unsafe change names and linked files reject', async t => {
  const { write, cwd, request, io } = fixture(t), ready = await tool.query(request, io);
  write('openspec/changes/example/tasks.md', 'changed');
  await assert.rejects(async () => await tool.commit({ ...request, approved: true, confirmation: ready.confirmation }, io), /approval/);
  await assert.rejects(async () => await tool.query({ change: '../foreign' }, io), /name/);
  if (process.platform !== 'win32') {
    fs.symlinkSync('/nonexistent/foreign', path.join(cwd, 'openspec/changes/example/specs/link.md'));
    await assert.rejects(async () => await tool.query(request, io), /Linked/);
  }
});
test('I6 I7 E1 E2 E12: only composed Plan owns the start-of-run publication answer, and the closing offer is gone', () => {
  const plan = fs.readFileSync('sai/commands/plan/coordinator.md', 'utf8');
  const explore = fs.readFileSync('sai/commands/explore/steps/pipeline-plan-unattended.md', 'utf8');
  assert.doesNotMatch(plan, /Not now|sole optional offer|post-completion offer|After successful completion only/);
  assert.equal(plan.match(/Publish a draft PR\/MR of the plan for \{name\} when this run ends\?/g).length, 1);
  assert.match(plan, /`Publish draft plan`, `Do not publish`/);
  assert.match(plan, /## Publication answer/);
  assert.ok(plan.indexOf('## Publication answer') < plan.indexOf('## Segments'));
  // E2: argument, run state, setting, question, in that order.
  const order = ['`--publish yes|no` argument', 'recorded in the run state', '`pr.publishAfterRun` setting', 'The question below'].map(text => plan.indexOf(text));
  assert.ok(order.every(position => position > 0) && order.every((position, index) => !index || position > order[index - 1]));
  assert.match(plan, /Resolve it once, after the input checks have passed/);
  assert.match(plan, /before the first worker is created, so a run that ends at those checks asks nothing/);
  assert.match(plan, /--set kind=publication --set value=<yes\|no>/);
  assert.match(plan, /An explicit `--publish` value wins over the recorded answer and replaces it/);
  assert.match(plan, /the closing report says that the argument replaced it/);
  assert.doesNotMatch(plan, /ignored for this run/);
  assert.match(plan, /branch \{branch\}, remote \{remote\}|Branch \{branch\}, remote \{remote\}/);
  assert.match(plan, /AskUserQuestion.*question|`question`/);
  assert.match(plan, /A run that fails, is stopped, or ends on an unanswered escalation publishes nothing, whatever the answer/);
  assert.match(plan, /close the planning report with exactly ``Plan done in openspec\/changes\/\{name\}\/\. Review it and run `\/sai-build \{name\}` in a new chat when ready\.``/);
  assert.match(plan, /This literal closes the planning report, not the command interaction/);
  assert.match(plan, /--publish <answer>/);
  assert.ok(plan.indexOf('**Telemetry.**') < plan.indexOf('**Publication.**') && plan.indexOf('**Publication.**') < plan.indexOf('Close the run per the cycle'));
  assert.doesNotMatch(plan, /end with exactly ``Plan done/);
  assert.match(explore, /asks its start question inside this route/);
  assert.match(explore, /Explore asks no second\s+publication question/);
  for (const phase of ['spec', 'design']) assert.doesNotMatch(fs.readFileSync(`sai/commands/${phase}/coordinator.md`, 'utf8'), /Publish a draft PR\/MR|publication answer/);
  const claude = fs.readFileSync('commands/claude/sai-plan.md', 'utf8');
  assert.match(claude, /^argument-hint: .*\[--publish yes\|no\]"$/m);
  assert.doesNotMatch(fs.readFileSync('commands/opencode/sai-plan.md', 'utf8'), /^argument-hint:/m);
});
test('I6: the publication continuation is unattended and asks neither the inclusion nor the remote question', () => {
  const publication = fs.readFileSync('sai/commands/plan/publication.md', 'utf8');
  assert.doesNotMatch(publication, /AskUserQuestion|Commit listed plan documents|Cancel`/);
  assert.match(publication, /asks the user nothing, and never stops the run/);
  assert.match(publication, /`plan-commit --unattended`/);
  assert.match(publication, /`push --unattended`/);
  assert.match(publication, /`publish --unattended`/);
  assert.match(publication, /never retried with force|no force push, no automatic retry/i);
});
test('both harnesses can reach the accepted publication workflow through manifest-declared profiles', () => {
  const { translate } = require('../bin/capabilities');
  const { capabilities } = require('../sai/install-manifest.json');
  for (const harness of ['claude', 'opencode']) {
    for (const profile of ['plan-command', 'explore-command']) {
      const compiled = translate(capabilities, profile, harness);
      assert.ok(compiled.profile.skills.includes('*') || compiled.profile.skills.includes('to-pr'));
      assert.ok(compiled.profile.shell.includes('*') || compiled.profile.shell.includes('node {sai}/*'));
    }
  }
});
test('a rejected local commit leaves HEAD, unrelated staging and working files intact', async t => {
  const { cwd, git, request, io } = fixture(t);
  const hook = path.join(cwd, '.git/hooks/pre-commit');
  fs.writeFileSync(hook, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const head = git('rev-parse', 'HEAD'), index = git('diff', '--cached'), working = git('diff');
  const ready = await tool.query(request, io);
  await assert.rejects(async () => await tool.commit({ ...request, approved: true, confirmation: ready.confirmation }, io));
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('diff', '--cached'), index);
  assert.equal(git('diff'), working);
});

// The process limit is 120 s; the tests shorten only that one timer so a stalled git call ends quickly.
function shortLimit(t) {
  const original = global.setTimeout;
  global.setTimeout = (callback, milliseconds, ...rest) => original(callback, milliseconds === 120000 ? 400 : milliseconds, ...rest);
  t.after(() => { global.setTimeout = original; });
}
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function ended(pid) {
  for (let waited = 0; alive(pid) && waited < 10000; waited += 25) await new Promise(resolve => setTimeout(resolve, 25));
  return !alive(pid);
}
const owned = 'openspec/changes/example/tasks.md';

test('E8 I6: staged content that differs from both HEAD and the working tree blocks plan-commit and is named by plan-query', async t => {
  const { cwd, git, write, request, io } = fixture(t);
  write(owned, 'staged version'); git('add', '-f', owned); write(owned, 'working version');
  const head = git('rev-parse', 'HEAD'), index = git('ls-files', '--stage'), staged = git('diff', '--cached');
  const ready = await tool.query(request, io);
  assert.equal(ready.status, 'blocked');
  assert.deepEqual(ready.staged_conflicts, [owned]);
  assert.deepEqual(ready.proposal.staged_conflicts, [owned]);
  assert.match(ready.message, /tasks\.md/);
  await assert.rejects(async () => await tool.commit({ ...request, approved: true, confirmation: ready.confirmation }, io), /differs from both HEAD and the working tree/);
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('ls-files', '--stage'), index);
  assert.equal(git('diff', '--cached'), staged);
  assert.equal(fs.readFileSync(path.join(cwd, owned), 'utf8'), 'working version');
});

test('E8 I6: a staged entry equal to the working tree or to HEAD is no obstacle', async t => {
  const { git, write, request, io } = fixture(t);
  write(owned, 'same everywhere'); git('add', '-f', owned);
  const equalToWorking = await tool.query(request, io);
  assert.equal(equalToWorking.status, 'ready');
  assert.deepEqual(equalToWorking.proposal.staged_conflicts, []);
  assert.equal((await tool.commit({ ...request, approved: true, confirmation: equalToWorking.confirmation }, io)).status, 'complete');
  // The plan is tracked now: an index entry equal to HEAD stays no obstacle while the working file changes.
  write(owned, 'edited after the commit');
  const equalToHead = await tool.query(request, io);
  assert.equal(equalToHead.status, 'ready');
  assert.deepEqual(equalToHead.proposal.staged_conflicts, []);
});

test('E8 I6: a staged removal of an owned path that is still present on disk is reported', async t => {
  const { git, request, io } = fixture(t);
  const first = await tool.query(request, io);
  await tool.commit({ ...request, approved: true, confirmation: first.confirmation }, io);
  git('rm', '--cached', '-q', owned);
  const ready = await tool.query(request, io);
  assert.equal(ready.status, 'blocked');
  assert.deepEqual(ready.staged_conflicts, [owned]);
});

test('E9 I7: a commit that reaches the process limit ends with its hook descendants and is reported as uncertain after reading HEAD back', { skip: process.platform === 'win32' }, async t => {
  const { cwd, git, request, io } = fixture(t);
  const pidFile = path.join(cwd, 'hook.pid'), runs = path.join(cwd, 'hook.runs');
  fs.writeFileSync(path.join(cwd, '.git/hooks/pre-commit'), `#!/bin/sh\necho run >> "${runs}"\nsleep 30 &\necho $! > "${pidFile}"\nwait\n`, { mode: 0o755 });
  const head = git('rev-parse', 'HEAD'), index = git('diff', '--cached');
  const ready = await tool.query(request, io);
  shortLimit(t);
  const result = await tool.commit({ ...request, approved: true, confirmation: ready.confirmation }, io);
  assert.equal(result.status, 'uncertain');
  assert.equal(result.reason, 'commit-timeout');
  assert.equal(result.head_state, 'unchanged');
  assert.equal(result.head, head);
  assert.match(result.message, /not repeated automatically/);
  assert.ok(await ended(Number(fs.readFileSync(pidFile, 'utf8'))), 'the hook descendant ended with the group');
  assert.equal(fs.readFileSync(runs, 'utf8'), 'run\n', 'the commit is never repeated');
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('diff', '--cached'), index);
});

test('E9 I7: every other git call of plan publication is bounded too, and the operation ends', { skip: process.platform === 'win32' }, async t => {
  const { cwd, request, io } = fixture(t);
  const bin = path.join(cwd, '..', `${path.basename(cwd)}-bin`), pidFile = path.join(bin, 'read-tree.pid');
  fs.mkdirSync(bin);
  t.after(() => fs.rmSync(bin, { recursive: true, force: true }));
  const system = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(bin, 'git'), `#!/bin/sh\ncase "$*" in\n  *read-tree*) sleep 30 &\n    echo $! > "${pidFile}"\n    wait ;;\n  *) exec "${system}" "$@" ;;\nesac\n`, { mode: 0o755 });
  const ready = await tool.query(request, io);
  const path0 = process.env.PATH;
  process.env.PATH = `${bin}${path.delimiter}${path0}`;
  t.after(() => { process.env.PATH = path0; });
  shortLimit(t);
  await assert.rejects(async () => await tool.commit({ ...request, approved: true, confirmation: ready.confirmation }, io), error => error.reason === 'process-timeout' && /git read-tree/.test(error.message));
  assert.ok(await ended(Number(fs.readFileSync(pidFile, 'utf8'))));
});

test('I7: plan publication starts no process outside the bounded runner', () => {
  const source = fs.readFileSync(path.join(__dirname, '../sai/tools/plan-publication.js'), 'utf8');
  assert.doesNotMatch(source, /execFileSync|execSync|spawnSync/);
  assert.match(source, /require\('\.\/backlog-process'\)/);
});

test('I1 E11: unattended plan-commit needs no approval token, commits only the listed plan documents and keeps unrelated staging and work', async t => {
  const { cwd, git, request, io } = fixture(t);
  const staged = git('diff', '--cached'), unstaged = git('diff');
  await assert.rejects(async () => await tool.commit(request, io), /approval/);
  await assert.rejects(async () => await tool.commit({ ...request, unattended: false, approved: false }, io), /approval/);
  const result = await tool.commit({ ...request, unattended: true }, io);
  assert.equal(result.status, 'complete');
  assert.equal(result.files.length, 7);
  assert.equal(git('diff', '--cached'), staged);
  assert.equal(git('diff'), unstaged);
  assert.equal(git('show', 'HEAD:other.txt'), 'base');
  assert.match(git('ls-tree', '-r', '--name-only', 'HEAD'), /openspec\/changes\/example\/specs\/example\/spec\.md/);
  assert.ok(!git('ls-tree', '-r', '--name-only', 'HEAD').includes('foreign'));
  assert.equal(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8'), 'openspec/changes/**\n');
  assert.equal((await tool.commit({ ...request, unattended: true }, io)).status, 'no_changes');
});

test('I1 E11: unattended plan-commit keeps the staged-content check that protects unrelated staging', async t => {
  const { cwd, git, write, request, io } = fixture(t);
  write(owned, 'staged version'); git('add', '-f', owned); write(owned, 'working version');
  const head = git('rev-parse', 'HEAD'), index = git('ls-files', '--stage');
  await assert.rejects(async () => await tool.commit({ ...request, unattended: true }, io), /differs from both HEAD and the working tree/);
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('ls-files', '--stage'), index);
  assert.equal(fs.readFileSync(path.join(cwd, owned), 'utf8'), 'working version');
});
