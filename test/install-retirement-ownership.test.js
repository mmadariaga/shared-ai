'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const flow = require('../bin/install-flow');
const { loadInstallManifest, expandInstallManifest, expandRetirementManifest, validateManifest } = require('../bin/install-manifest');

const repoRoot = path.join(__dirname, '..');
const manifest = loadInstallManifest(repoRoot);
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-retire-owned-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function roots(base) {
  return { base, ...Object.fromEntries(['commands', 'agents', 'skills', 'sai'].map(name => [name, path.join(base, name)])) };
}

for (const harness of ['claude', 'opencode']) {
  test(`${harness}: every declared retired file is removed regardless of contents`, t => {
    const base = fixture(t);
    const retirements = expandRetirementManifest(manifest, { harness, repoRoot, destinationRoot: roots(base) });
    for (const retirement of retirements) {
      fs.mkdirSync(path.dirname(retirement.destinationPath), { recursive: true });
      fs.writeFileSync(retirement.destinationPath, '---\nmodel: old-custom-model\n---\nUnknown edited historical contents.\n');
    }
    const unrelated = path.join(base, 'agents', 'my-own-agent.md');
    fs.mkdirSync(path.dirname(unrelated), { recursive: true });
    fs.writeFileSync(unrelated, 'Unrelated user definition.');
    const results = flow.cleanupRetiredProjections(harness, roots(base));
    assert.equal(results.length, retirements.length);
    assert.ok(results.every(item => item.action === 'deleted'));
    for (const retirement of retirements) assert.equal(fs.existsSync(retirement.destinationPath), false, retirement.id);
    assert.equal(fs.readFileSync(unrelated, 'utf8'), 'Unrelated user definition.');
    assert.ok(flow.cleanupRetiredProjections(harness, roots(base)).every(item => item.action === 'not-found'));
  });

  test(`${harness}: the installer also removes retired local agents without copying settings`, t => {
    const root = fixture(t);
    const project = path.join(root, 'project');
    const local = path.join(project, harness === 'claude' ? '.claude' : '.opencode');
    const old = path.join(local, 'agents', 'sai-review-fix-worker.md');
    fs.mkdirSync(path.dirname(old), { recursive: true });
    fs.writeFileSync(old, '---\nmodel: never-migrate-this\n---\nOld custom body.');
    const install = harness === 'claude' ? flow.installClaude : flow.installOpencode;
    install(path.join(root, 'global'), { projectPath: project });
    assert.equal(fs.existsSync(old), false);
    assert.equal(fs.existsSync(path.join(local, 'agents', 'sai-4-review-worker.md')), false, 'retirement creates no replacement local definition');
  });
}

test('renamed opencode generic agents are deleted globally and locally without migrating tunables or text', t => {
  const root = fixture(t);
  const global = path.join(root, 'global');
  const local = path.join(root, 'project', '.opencode');
  for (const base of [global, local]) {
    fs.mkdirSync(path.join(base, 'agents'), { recursive: true });
    for (const name of ['explore', 'executor', 'budget']) {
      fs.writeFileSync(path.join(base, 'agents', `${name}.md`), '---\nmodel: never-migrate-this\nvariant: low\n---\nOld custom instructions.');
    }
  }
  const current = path.join(global, 'agents', 'budget-explorer.md');
  fs.writeFileSync(current, '---\nmodel: keep-the-current-model\nvariant: high\n---\nOld current body.');
  flow.installOpencode(global, { projectPath: path.join(root, 'project') });
  for (const base of [global, local]) {
    for (const name of ['explore', 'executor', 'budget']) assert.equal(fs.existsSync(path.join(base, 'agents', `${name}.md`)), false);
  }
  assert.match(fs.readFileSync(current, 'utf8'), /^model: keep-the-current-model$/m);
  for (const name of ['budget-executor', 'budget-subagent']) {
    const installed = fs.readFileSync(path.join(global, 'agents', `${name}.md`), 'utf8');
    assert.ok(!installed.includes('never-migrate-this'));
    assert.ok(!installed.includes('Old custom instructions.'));
    assert.equal(fs.existsSync(path.join(local, 'agents', `${name}.md`)), false);
  }
});

test('renamed audit agents receive shipped defaults, not retired tunables', t => {
  const root = fixture(t);
  for (const harness of ['claude', 'opencode']) {
    const base = path.join(root, harness);
    fs.mkdirSync(path.join(base, 'agents'), { recursive: true });
    const old = path.join(base, 'agents', 'sai-6-security-worker.md');
    fs.writeFileSync(old, '---\nmodel: never-migrate-this\n---\nOld custom body.');
    (harness === 'claude' ? flow.installClaude : flow.installOpencode)(base);
    assert.equal(fs.existsSync(old), false);
    assert.ok(!fs.readFileSync(path.join(base, 'agents', 'sai-5-security-worker.md'), 'utf8').includes('never-migrate-this'));
  }
});

test('retirement removes a file symlink itself, never follows directory links or recursively removes directories', t => {
  const root = fixture(t);
  const base = path.join(root, 'global');
  const outside = path.join(root, 'outside');
  fs.mkdirSync(path.join(base, 'sai', 'commands'), { recursive: true });
  fs.mkdirSync(outside);
  const target = path.join(outside, 'instructions.md');
  fs.writeFileSync(target, 'Outside the install root.');
  const link = path.join(base, 'sai', 'commands', 'review');
  const oldAgent = path.join(base, 'agents', 'sai-review-fix-worker.md');
  fs.mkdirSync(path.dirname(oldAgent), { recursive: true });
  try {
    fs.symlinkSync(outside, link, 'junction');
    fs.symlinkSync(target, oldAgent, 'file');
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) throw error;
    t.skip(`Symbolic links unavailable: ${error.code}`);
    return;
  }
  const directory = path.join(base, 'sai', 'commands', 'explore', 'command-bootstrap.md');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'keep.txt'), 'Not a retired file.');
  const notices = [];
  const results = flow.cleanupRetiredProjections('claude', roots(base), { notices });
  assert.equal(fs.existsSync(oldAgent), false);
  assert.equal(fs.readFileSync(target, 'utf8'), 'Outside the install root.');
  assert.equal(fs.readFileSync(path.join(directory, 'keep.txt'), 'utf8'), 'Not a retired file.');
  assert.ok(results.some(item => item.destinationPath === directory && item.action === 'skipped'));
});

test('a linked global harness root still retires, and a relative root resolves without hanging', t => {
  const root = fixture(t);
  const real = path.join(root, 'dotfiles-claude');
  const linked = path.join(root, 'claude');
  const oldAgent = path.join(real, 'agents', 'sai-review-fix-worker.md');
  fs.mkdirSync(path.dirname(oldAgent), { recursive: true });
  fs.writeFileSync(oldAgent, 'Old body.');
  try {
    fs.symlinkSync(real, linked, 'junction');
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) throw error;
    t.skip(`Symbolic links unavailable: ${error.code}`);
    return;
  }
  const results = flow.cleanupRetiredProjections('claude', roots(linked), { notices: [] });
  assert.equal(fs.existsSync(oldAgent), false);
  assert.ok(results.some(item => item.action === 'deleted'));
  fs.writeFileSync(oldAgent, 'Old body.');
  flow.cleanupRetiredProjections('claude', { base: path.relative(process.cwd(), real) }, { notices: [] });
  assert.equal(fs.existsSync(oldAgent), false);
});

test('a linked project harness root is skipped before retirement or refresh', t => {
  const root = fixture(t);
  const project = path.join(root, 'project');
  const shared = path.join(root, 'shared-opencode');
  const oldAgent = path.join(shared, 'agents', 'sai-review-fix-worker.md');
  fs.mkdirSync(path.dirname(oldAgent), { recursive: true });
  fs.mkdirSync(project);
  fs.writeFileSync(oldAgent, 'Shared with other projects.');
  try {
    fs.symlinkSync(shared, path.join(project, '.opencode'), 'junction');
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) throw error;
    t.skip(`Symbolic links unavailable: ${error.code}`);
    return;
  }
  const notices = [];
  flow.refreshProjectOverrides('opencode', project, { notices });
  assert.equal(fs.readFileSync(oldAgent, 'utf8'), 'Shared with other projects.');
  assert.equal(notices.length, 1);
  assert.match(notices[0], /Skipped project-local definitions/);
});

test('retirement declarations must name exact relative files inside a harness root', () => {
  for (const invalid of ['../outside.md', '/outside.md', 'C:\\outside.md', 'agents/*.md', '', 'folder/../outside.md']) {
    const copy = structuredClone(manifest);
    copy.retirements[0].destination.path = invalid;
    assert.throws(() => validateManifest(copy), /relative|exact|path/i, invalid);
  }
});

test('no retired path collides with an active projection on either harness', () => {
  for (const harness of ['claude', 'opencode']) {
    const base = path.join(os.tmpdir(), `sai-retirement-inventory-${harness}`);
    const destinationRoot = { ...roots(base), config: base, root: base };
    const active = new Set(expandInstallManifest(manifest, { harness, repoRoot, destinationRoot }).map(item => item.destinationPath));
    for (const item of expandRetirementManifest(manifest, { harness, repoRoot, destinationRoot })) {
      assert.equal(active.has(item.destinationPath), false, item.id);
    }
  }
});

test('guarded uninstall recognizes installed copies of the renamed opencode generic agents, ignoring only tunables', t => {
  const uninstall = require('../bin/uninstall-flow');
  const base = fixture(t);
  const fixtures = path.join(__dirname, 'fixtures', 'retired-opencode-agents');
  const entries = uninstall.enumerateOpencode(base);
  for (const name of ['explore', 'executor', 'budget']) {
    const entry = entries.find(item => item.ruleId === `retired-opencode-generic-${name}`);
    const installed = fs.readFileSync(path.join(fixtures, `${name}.md`), 'utf8');
    fs.mkdirSync(path.dirname(entry.dest), { recursive: true });
    fs.writeFileSync(entry.dest, installed);
    assert.equal(uninstall.computePlanEntry(entry).action, 'delete', `${name} as installed`);
    fs.writeFileSync(entry.dest, installed.replace(/^model:.*$/m, 'model: my/custom-model').replace(/^variant:.*\n/m, ''));
    assert.equal(uninstall.computePlanEntry(entry).action, 'delete', `${name} with custom tunables`);
    fs.writeFileSync(entry.dest, `${installed}\nMy own instructions.\n`);
    assert.equal(uninstall.computePlanEntry(entry).action, 'keep-override', `${name} with an edited body`);
  }
});

test('guarded uninstall recognizes renamed audit definitions installed by earlier releases, ignoring only tunables', t => {
  const uninstall = require('../bin/uninstall-flow');
  const fixtures = path.join(__dirname, 'fixtures', 'retired-audit-definitions');
  for (const harness of ['claude', 'opencode']) {
    const base = fixture(t);
    const entries = (harness === 'claude' ? uninstall.enumerateClaude : uninstall.enumerateOpencode)(base);
    for (const relative of ['commands/sai-6-security.md', 'agents/sai-6-security-worker.md']) {
      const entry = entries.find(item => item.assetType === 'retired-managed-file' && item.dest === path.join(base, relative));
      const installed = fs.readFileSync(path.join(fixtures, harness, relative), 'utf8');
      fs.mkdirSync(path.dirname(entry.dest), { recursive: true });
      fs.writeFileSync(entry.dest, installed);
      assert.equal(uninstall.computePlanEntry(entry).action, 'delete', `${harness} ${relative} as installed`);
      fs.writeFileSync(entry.dest, installed.replace(/^model:.*$/m, 'model: my/custom-model'));
      assert.equal(uninstall.computePlanEntry(entry).action, 'delete', `${harness} ${relative} with a custom model`);
      fs.writeFileSync(entry.dest, `${installed}\nMy own instructions.\n`);
      assert.equal(uninstall.computePlanEntry(entry).action, 'keep-override', `${harness} ${relative} with an edited body`);
    }
  }
});
