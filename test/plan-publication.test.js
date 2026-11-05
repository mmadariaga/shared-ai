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
test('exact approved complete plan includes excluded control/overview/spec files and preserves unrelated staging and work', t => {
  const { cwd, git, request, io } = fixture(t);
  const ready = tool.query(request, io), head = git('rev-parse', 'HEAD'), staged = git('diff', '--cached'), unstaged = git('diff');
  assert.equal(ready.proposal.files.length, 7);
  assert.ok(ready.proposal.files.every(row => row.ignored));
  assert.throws(() => tool.commit({ ...request, confirmation: ready.confirmation }, io), /approval/);
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('diff', '--cached'), staged); // cancellation/preparation has no inclusion effects
  const result = tool.commit({ ...request, approved: true, confirmation: ready.confirmation }, io);
  assert.equal(result.status, 'complete');
  assert.equal(git('diff', '--cached'), staged);
  assert.equal(git('diff'), unstaged);
  assert.equal(git('show', 'HEAD:other.txt'), 'base');
  assert.ok(!git('ls-tree', '-r', '--name-only', 'HEAD').includes('foreign'));
  assert.equal(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8'), 'openspec/changes/**\n');
  const fresh = tool.query(request, io);
  assert.equal(tool.commit({ ...request, approved: true, confirmation: fresh.confirmation }, io).status, 'no_changes');
});
test('changed content or exact file list invalidates inclusion approval; unsafe change names and linked files reject', t => {
  const { write, cwd, request, io } = fixture(t), ready = tool.query(request, io);
  write('openspec/changes/example/tasks.md', 'changed');
  assert.throws(() => tool.commit({ ...request, approved: true, confirmation: ready.confirmation }, io), /approval/);
  assert.throws(() => tool.query({ change: '../foreign' }, io), /name/);
  if (process.platform !== 'win32') {
    fs.symlinkSync('/nonexistent/foreign', path.join(cwd, 'openspec/changes/example/specs/link.md'));
    assert.throws(() => tool.query(request, io), /Linked/);
  }
});
test('only composed Plan owns the once-only accepted publication continuation', () => {
  const plan = fs.readFileSync('sai/commands/plan/coordinator.md', 'utf8');
  const explore = fs.readFileSync('sai/commands/explore/steps/pipeline-plan-unattended.md', 'utf8');
  assert.equal(plan.match(/Create or update a draft PR\/MR/g).length, 1);
  assert.match(plan, /Only after `Publish draft plan`, Fetch/);
  assert.match(plan, /After successful completion only/);
  assert.match(plan, /close the planning report with exactly ``Plan done in openspec\/changes\/\{name\}\/\. Review it and run `\/sai-build \{name\}` in a new chat when ready\.``/);
  assert.match(plan, /This literal closes the planning report, not the command interaction/);
  assert.match(plan, /planning is now complete\s+and its run is closed; continue to the sole optional offer/);
  assert.match(plan, /On failure, stop\s+after closing the run: no publication offer or continuation runs/);
  assert.ok(plan.indexOf('Close the run per') < plan.indexOf('After successful completion only'));
  assert.doesNotMatch(plan, /end with exactly ``Plan done/);
  assert.match(explore, /asks no second publication question/);
  for (const phase of ['spec', 'design']) assert.doesNotMatch(fs.readFileSync(`sai/commands/${phase}/coordinator.md`, 'utf8'), /Create or update a draft PR\/MR/);
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
test('a rejected local commit leaves HEAD, unrelated staging and working files intact', t => {
  const { cwd, git, request, io } = fixture(t);
  const hook = path.join(cwd, '.git/hooks/pre-commit');
  fs.writeFileSync(hook, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const head = git('rev-parse', 'HEAD'), index = git('diff', '--cached'), working = git('diff');
  const ready = tool.query(request, io);
  assert.throws(() => tool.commit({ ...request, approved: true, confirmation: ready.confirmation }, io));
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('diff', '--cached'), index);
  assert.equal(git('diff'), working);
});
