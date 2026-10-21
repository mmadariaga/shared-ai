'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { prepareTemp } = require('../skills/universal/to-backlog/scripts/prepare-temp');
const { resolveTempRoot } = require('../sai/tools/temp-root');
const { expandInstallManifest } = require('../bin/install-manifest');
const { translate } = require('../bin/capabilities');
const manifest = require('../sai/install-manifest.json');
const repoRoot = path.resolve(__dirname, '..');
const linux = process.platform === 'linux';
const script = path.join(repoRoot, 'skills/universal/to-backlog/scripts/prepare-temp.js');
const options = { cwd: repoRoot };

// Linux ignores the temp environment: the Claude Code root is /tmp/claude-{uid},
// which the harness owns. Stand in for it the way the CI workflow does, and
// leave it in place.
function ensureLinuxRoots() {
  if (!linux) return;
  const harness = `/tmp/claude-${process.getuid()}`;
  if (!fs.existsSync(harness)) fs.mkdirSync(harness, { mode: 0o700 });
}

test('every platform creates unique private directories under the SAI temp root, outside the repository, and preserves receipts', () => {
  ensureLinuxRoots();
  for (const harness of ['claude', 'opencode']) {
    if (linux && harness === 'opencode' && !fs.existsSync('/tmp/opencode')) continue;
    const root = fs.realpathSync(resolveTempRoot(harness));
    const results = Array.from({ length: 4 }, () => prepareTemp(harness, options).directory);
    assert.equal(new Set(results).size, results.length);
    for (const directory of results) {
      const stat = fs.lstatSync(directory);
      assert.equal(path.dirname(directory), root);
      assert.match(path.basename(directory), /^to-backlog-/);
      assert.equal(stat.isSymbolicLink(), false);
      assert.ok(!directory.startsWith(`${repoRoot}${path.sep}`));
      if (process.platform !== 'win32') {
        assert.equal(stat.uid, process.getuid());
        assert.equal(stat.mode & 0o7777, 0o700);
      }
    }
    const receipt = path.join(results[0], 'receipt.json');
    fs.writeFileSync(receipt, '{"stage":"partial_failure"}', { mode: 0o600 });
    prepareTemp(harness, options);
    assert.equal(fs.readFileSync(receipt, 'utf8'), '{"stage":"partial_failure"}');
  }
});

test('without a harness the installed root decides it, and the Linux-only refusal is gone', () => {
  ensureLinuxRoots();
  assert.equal(path.dirname(prepareTemp(undefined, options).directory), fs.realpathSync(resolveTempRoot('claude')));
  for (const [platform, harness] of [['win32', 'opencode'], ...(process.platform === 'win32' ? [] : [['darwin', 'claude']])]) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'prepare-temp-platform-'));
    try {
      const { directory } = prepareTemp(harness, { ...options, platform, tmpdir: () => base });
      assert.equal(path.dirname(directory), fs.realpathSync(path.join(base, harness, 'sai')));
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

test('concurrent CLI calls return distinct JSON locations', async () => {
  ensureLinuxRoots();
  if (linux && !fs.existsSync('/tmp/opencode')) return;
  const { execFile } = require('node:child_process');
  const run = () => new Promise((resolve, reject) => execFile(process.execPath, [script, 'opencode'], { cwd: repoRoot }, (error, stdout) => error ? reject(error) : resolve(JSON.parse(stdout).directory)));
  const directories = await Promise.all([run(), run(), run()]);
  assert.equal(new Set(directories).size, 3);
});

test('invalid invocations fail without a usable path', () => {
  const result = spawnSync(process.execPath, [script, 'opencode', '--root', repoRoot], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(JSON.parse(result.stderr).error, /Usage/);
  const unknown = spawnSync(process.execPath, [script, 'vscode'], { encoding: 'utf8' });
  assert.equal(unknown.status, 1);
  assert.equal(unknown.stdout, '');
  assert.match(JSON.parse(unknown.stderr).error, /Expected harness: claude or opencode/);
});

test('a temporary location inside the repository is rejected', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'prepare-temp-repository-'));
  try {
    fs.mkdirSync(path.join(base, '.git'));
    assert.throws(() => prepareTemp('claude', { cwd: base, platform: 'win32', tmpdir: () => base }), /outside the repository/);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('an unusable root is terminal and is neither created nor repaired', { skip: !linux }, () => {
  for (const change of [{ isSymbolicLink: () => true }, { uid: process.getuid() + 1 }, { mode: 0o777 }]) {
    const io = { ...fs, lstatSync: file => ({ ...fs.lstatSync(file), isDirectory: () => true, isSymbolicLink: () => false, ...change }),
      mkdirSync: () => assert.fail('existing root must not be created'), chmodSync: () => assert.fail('existing root must not be repaired') };
    assert.throws(() => prepareTemp('opencode', { ...options, io }), /temporary root/i);
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
  assert.match(error.error, /Required harness temporary root \/tmp\/opencode is missing/);
  assert.match(error.error, /before retrying/);
  assert.doesNotMatch(error.error, /Forbidden fallback/);
  // Wrapped Markdown prose: normalize whitespace before matching sentences.
  const instructions = fs
    .readFileSync(path.join(repoRoot, 'skills/universal/to-backlog/prepare-temp.md'), 'utf8')
    .replace(/\s+/g, ' ');
  assert.match(instructions, /If the root is missing, stop publication/);
  assert.match(instructions, /do not create the shared root or choose another location as a fallback/);
});

test('both harnesses install the same skill-owned script and declare only its concrete invocation', () => {
  const research = translate(manifest.capabilities, 'research', 'opencode').profile.shell;
  assert.ok(!research.some(pattern => pattern.includes('prepare-temp')));
  for (const harness of ['claude', 'opencode']) {
    const base = path.join(os.tmpdir(), `prepare-temp-install-${harness}`);
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

test('confirmation precedes preparation on every platform, recovery reuses receipts and Explore remains repository read-only', () => {
  const skill = fs.readFileSync(path.join(repoRoot, 'skills/universal/to-backlog/SKILL.md'), 'utf8');
  assert.ok(skill.indexOf('## 3. Review and confirm') < skill.indexOf('read `prepare-temp.md`'));
  assert.match(skill, /Recovery uses the\s+saved receipt/);
  assert.doesNotMatch(skill, /on Linux|Activate the new script only/i);
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
