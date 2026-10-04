'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { prepareTemp } = require('../skills/universal/to-backlog/scripts/prepare-temp');
const { expandInstallManifest } = require('../bin/install-manifest');
const { translate } = require('../bin/capabilities');
const manifest = require('../sai/install-manifest.json');
const repoRoot = path.resolve(__dirname, '..');
const linux = process.platform === 'linux';
const script = path.join(repoRoot, 'skills/universal/to-backlog/scripts/prepare-temp.js');
const options = { cwd: repoRoot };

test('Linux creates unique private directories outside the repository and preserves receipts', { skip: !linux }, () => {
  for (const harness of ['claude', 'opencode']) {
    const root = harness === 'claude' ? '/tmp' : '/tmp/opencode';
    const before = fs.lstatSync(root);
    const results = Array.from({ length: 4 }, () => prepareTemp(harness, options).directory);
    assert.equal(new Set(results).size, results.length);
    for (const directory of results) {
      const stat = fs.lstatSync(directory);
      assert.equal(path.dirname(directory), root);
      assert.equal(stat.uid, process.getuid());
      assert.equal(stat.mode & 0o7777, 0o700);
      assert.equal(stat.isSymbolicLink(), false);
      assert.ok(!directory.startsWith(`${repoRoot}/`));
    }
    const receipt = path.join(results[0], 'receipt.json');
    fs.writeFileSync(receipt, '{"stage":"partial_failure"}', { mode: 0o600 });
    prepareTemp(harness, options);
    assert.equal(fs.readFileSync(receipt, 'utf8'), '{"stage":"partial_failure"}');
    const after = fs.lstatSync(root);
    assert.equal(after.mode, before.mode);
    assert.equal(after.uid, before.uid);
  }
});

test('concurrent CLI calls return distinct JSON locations', { skip: !linux }, async () => {
  const { execFile } = require('node:child_process');
  const run = () => new Promise((resolve, reject) => execFile(process.execPath, [script, 'opencode'], { cwd: repoRoot }, (error, stdout) => error ? reject(error) : resolve(JSON.parse(stdout).directory)));
  const directories = await Promise.all([run(), run(), run()]);
  assert.equal(new Set(directories).size, 3);
});

test('unsupported systems and invalid invocations fail without a usable path', () => {
  for (const platform of ['win32', 'darwin']) {
    assert.throws(() => prepareTemp('opencode', { platform }), /Linux only/);
  }
  const result = spawnSync(process.execPath, [script, 'opencode', '--root', repoRoot], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(JSON.parse(result.stderr).error, /Usage/);
});

test('creation and verification errors are terminal, without chmod of existing paths', { skip: !linux }, () => {
  for (const operation of ['mkdtempSync', 'openSync', 'fchmodSync', 'fstatSync']) {
    const io = { ...fs, [operation]: () => { throw new Error(`injected ${operation} failure`); } };
    assert.throws(() => prepareTemp('opencode', { ...options, io }), new RegExp(operation));
  }
  assert.throws(() => prepareTemp('opencode', { cwd: '/tmp' }), /outside the repository/);
  const nested = prepareTemp('opencode', options).directory;
  assert.throws(() => prepareTemp('opencode', { cwd: nested, io: { ...fs, existsSync: file => file === '/tmp/opencode/.git' } }), /outside the repository/);
  assert.throws(() => prepareTemp('opencode', { ...options, io: { ...fs, lstatSync: () => { throw new Error('ENOENT: missing root'); } } }), /missing root/);
  const io = { ...fs, chmodSync: () => assert.fail('path chmod forbidden'), mkdtempSync: () => '/tmp/opencode/incidental' };
  io.lstatSync = file => file.endsWith('/incidental')
    ? { isDirectory: () => false, isSymbolicLink: () => true, uid: process.getuid(), mode: 0o700 }
    : fs.lstatSync(file);
  assert.throws(() => prepareTemp('opencode', { ...options, io }), /unsafe ownership, permissions or type/);
  io.lstatSync = file => file.endsWith('/incidental')
    ? { isDirectory: () => true, isSymbolicLink: () => false, uid: process.getuid() + 1, mode: 0o700 }
    : fs.lstatSync(file);
  assert.throws(() => prepareTemp('opencode', { ...options, io }), /unsafe ownership/);
  io.lstatSync = file => file.endsWith('/incidental')
    ? { isDirectory: () => true, isSymbolicLink: () => false, uid: process.getuid(), mode: 0o755 }
    : fs.lstatSync(file);
  assert.throws(() => prepareTemp('opencode', { ...options, io }), /unsafe ownership/);
});

test('root symbolic links, unsafe roots and changed final verification are rejected', { skip: !linux }, () => {
  for (const change of [
    { isSymbolicLink: () => true },
    { uid: process.getuid() + 1 },
    { mode: 0o777 },
  ]) {
    const io = { ...fs, lstatSync: file => ({ ...fs.lstatSync(file), isDirectory: () => true, isSymbolicLink: () => false, ...change }) };
    assert.throws(() => prepareTemp('opencode', { ...options, io }), /Temporary root/);
  }
  let created;
  const io = { ...fs, mkdtempSync: prefix => { created = fs.mkdtempSync(prefix); return created; } };
  let reads = 0;
  io.lstatSync = file => {
    const stat = fs.lstatSync(file);
    if (file === created && ++reads === 2) stat.isSymbolicLink = () => true;
    return stat;
  };
  assert.throws(() => prepareTemp('opencode', { ...options, io }), /non-symbolic-link/);
});

test('final root checks reject changed mode or owner without repairing the root', { skip: !linux }, () => {
  for (const change of [{ mode: 0o777 }, { uid: process.getuid() + 1 }]) {
    let rootReads = 0;
    const io = { ...fs,
      lstatSync: file => {
        const stat = fs.lstatSync(file);
        if (file === '/tmp/opencode' && ++rootReads === 2) {
          if (change.mode !== undefined) stat.mode = (stat.mode & ~0o7777) | change.mode;
          if (change.uid !== undefined) stat.uid = change.uid;
        }
        return stat;
      },
      chmodSync: () => assert.fail('existing paths must not be chmodded'),
      mkdirSync: () => assert.fail('existing root must not be created'),
    };
    assert.throws(() => prepareTemp('opencode', { ...options, io }), /Temporary root has unsafe ownership or shared-write permissions/);
    assert.equal(rootReads, 2);
  }
});

test('absent-root CLI failure names the prerequisite and returns no usable path or fallback', { skip: !linux }, () => {
  const code = `
    const fs = require('node:fs');
    const original = fs.lstatSync;
    fs.lstatSync = file => {
      if (file === '/tmp/opencode') throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return original(file);
    };
    for (const operation of ['mkdirSync', 'mkdtempSync', 'chmodSync', 'fchmodSync']) {
      fs[operation] = () => { throw new Error('Forbidden fallback: ' + operation); };
    }
    process.argv = [process.execPath, ${JSON.stringify(script)}, 'opencode'];
    require('node:module').runMain(${JSON.stringify(script)});
  `;
  const result = spawnSync(process.execPath, ['-e', code], { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  const error = JSON.parse(result.stderr);
  assert.deepEqual(Object.keys(error), ['error']);
  assert.match(error.error, /Required existing temporary root \/tmp\/opencode is missing/);
  assert.match(error.error, /before retrying/);
  assert.doesNotMatch(error.error, /Forbidden fallback/);
  const instructions = fs.readFileSync(path.join(repoRoot, 'skills/universal/to-backlog/prepare-temp.md'), 'utf8');
  assert.match(instructions, /If the root is missing, stop publication/);
  assert.match(instructions, /do not create the shared root or choose another location as a fallback/);
});

test('both harnesses install the same skill-owned script and declare only its concrete invocation', () => {
  const research = translate(manifest.capabilities, 'research', 'opencode').profile.shell;
  assert.ok(!research.some(pattern => pattern.includes('prepare-temp')));
  for (const harness of ['claude', 'opencode']) {
    const base = `/tmp/opencode/prepare-temp-install-${harness}`;
    const destinationRoot = Object.fromEntries(['commands', 'agents', 'sai', 'skills', 'config', 'root'].map(key => [key, path.join(base, key)]));
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const installed = projections.find(item => item.destinationPath === path.join(destinationRoot.skills, 'to-backlog/scripts/prepare-temp.js'));
    assert.ok(installed);
    assert.equal(fs.readFileSync(installed.sourcePath, 'utf8'), fs.readFileSync(script, 'utf8'));
    assert.ok(projections.some(item => item.destinationPath === path.join(destinationRoot.skills, 'to-backlog/prepare-temp.md')));
    for (const profile of ['to-backlog-command', 'explore-command']) {
      const grants = translate(manifest.capabilities, profile, harness);
      const root = harness === 'claude' ? '~/.claude' : '~/.config/opencode';
      const local = harness === 'claude' ? '.claude' : '.opencode';
      const expected = [root, local].map(location => `node ${location}/skills/to-backlog/scripts/prepare-temp.js ${harness}`);
      if (harness === 'opencode') {
        for (const resource of expected) assert.ok(grants.permissions.some(rule => rule.action === 'shell' && rule.resource === resource && rule.effect === 'allow'));
      } else {
        for (const resource of expected) assert.ok(grants.allowedTools.includes(`Bash(${resource})`));
      }
      assert.ok(!grants.profile.shell.includes('node *'));
      assert.ok(!grants.profile.shell.some(pattern => /^(mkdir|chmod) /.test(pattern)));
    }
  }
});

test('confirmation precedes Linux preparation, recovery reuses receipts and Explore remains repository read-only', () => {
  const skill = fs.readFileSync(path.join(repoRoot, 'skills/universal/to-backlog/SKILL.md'), 'utf8');
  assert.ok(skill.indexOf('## 3. Review and confirm') < skill.indexOf('read `prepare-temp.md`'));
  assert.match(skill, /Recovery uses the\s+saved receipt/);
  assert.match(skill, /On Windows, retain/);
  const explore = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/instructions.md'), 'utf8');
  assert.match(explore, /user-invoked `to-backlog`/);
  assert.match(explore, /never repository edits or omission of publication confirmation/);
});

test('both Explore read-only reminders preserve the exact confirmed to-backlog exception', () => {
  const instructions = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/instructions.md'), 'utf8');
  const common = fs.readFileSync(path.join(repoRoot, 'sai/commands/explore/steps/common.md'), 'utf8');
  const reminder = common.split('\n').find(line => line.startsWith('**Read-only reminder.**'));
  assert.match(reminder, /^\*\*Read-only reminder\.\*\* Exploration is read-only:/);
  assert.match(reminder, /creates, modifies, and deletes no repository files and implements no code/);
  assert.match(instructions, /user-invoked `to-backlog` capture/);
  assert.match(instructions, /after that skill's explicit publication confirmation/);
  assert.match(instructions, /permits private temporary preparation and receipt retention outside the repository/);
  assert.match(instructions, /never repository edits or omission of publication confirmation/);
  assert.match(reminder, /user-invoked `to-backlog` exception in `sai\/commands\/explore\/instructions\.md`/);
  assert.match(reminder, /only its temporary preparation, receipt and publication operations after explicit publication confirmation/);
  assert.match(reminder, /permits no repository writes and never bypasses that confirmation/);
  assert.match(reminder, /Temporary preparation and receipts remain outside the repository/);
  assert.match(reminder, /Repository writes happen only inside a route the user explicitly selects/);
  assert.match(reminder, /emitting a `Ready to Propose` block selects no route and authorizes no writes/);
  assert.doesNotMatch(reminder, /deletes no files|\. Writes happen only inside a route/);
});
