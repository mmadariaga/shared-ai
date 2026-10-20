'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOL = path.join(__dirname, '..', 'sai', 'tools', 'temp-root.js');
const { harnessRoot, resolveTempRoot, makeTempDir, removeInside, TempRootError } = require(TOOL);

const POSIX = process.platform !== 'win32';
const OPENCODE_SAI = path.join('/tmp/opencode', 'sai');
const UID = typeof process.getuid === 'function' ? process.getuid() : undefined;

function sandbox() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-temp-root-test-'));
  return { base, cleanup: () => fs.rmSync(base, { recursive: true, force: true }) };
}

test('Linux roots do not depend on the temp environment; other platforms use tmpdir plus the harness', () => {
  const tmpdir = () => path.join('somewhere', 'tmp');
  assert.equal(harnessRoot('opencode', { platform: 'linux', tmpdir, uid: 1000 }), '/tmp/opencode');
  assert.equal(harnessRoot('claude', { platform: 'linux', tmpdir, uid: 1000 }), '/tmp/claude-1000');
  assert.equal(harnessRoot('claude', { platform: 'darwin', tmpdir }), path.join('somewhere', 'tmp', 'claude'));
  assert.equal(harnessRoot('opencode', { platform: 'win32', tmpdir }), path.join('somewhere', 'tmp', 'opencode'));
});

test('an unknown harness is rejected', () => {
  assert.throws(() => harnessRoot('vscode', {}), /Expected harness: claude or opencode/);
});

test('on Linux a missing harness root is a blocker naming the path and nothing is created', () => {
  const calls = [];
  const io = {
    lstatSync(target) { calls.push(target); const error = new Error('missing'); error.code = 'ENOENT'; throw error; },
    mkdirSync() { throw new Error('must not create'); },
  };
  for (const [harness, expected] of [['opencode', '/tmp/opencode'], ['claude', '/tmp/claude-1000']]) {
    calls.length = 0;
    assert.throws(
      () => resolveTempRoot(harness, { platform: 'linux', uid: 1000, io }),
      error => error instanceof TempRootError && error.code === 'TEMP_ROOT_MISSING' && error.message.includes(expected),
    );
    assert.deepEqual(calls, [expected]);
  }
});

test('off Linux the harness folder and sai/ are created under the user temp base', () => {
  const box = sandbox();
  try {
    const root = resolveTempRoot('claude', { platform: 'darwin', tmpdir: () => box.base, uid: UID });
    assert.equal(root, path.join(box.base, 'claude', 'sai'));
    assert.ok(fs.statSync(root).isDirectory());
    if (POSIX) assert.equal(fs.statSync(root).mode & 0o777, 0o700);
    assert.equal(resolveTempRoot('claude', { platform: 'darwin', tmpdir: () => box.base, uid: UID }), root);
  } finally {
    box.cleanup();
  }
});

test('with an existing harness root, a missing sai/ is created with mode 0700', { skip: !POSIX }, () => {
  const box = sandbox();
  try {
    const harness = path.join(box.base, 'claude');
    fs.mkdirSync(harness, { mode: 0o700 });
    const root = resolveTempRoot('claude', { platform: 'darwin', tmpdir: () => box.base, uid: UID });
    assert.equal(root, path.join(harness, 'sai'));
    assert.equal(fs.statSync(root).mode & 0o777, 0o700);
  } finally {
    box.cleanup();
  }
});

test('a symbolic-link harness root or sai/ and a file in their place are blockers and nothing is repaired', { skip: !POSIX }, () => {
  const box = sandbox();
  try {
    const real = path.join(box.base, 'real');
    fs.mkdirSync(real);
    fs.symlinkSync(real, path.join(box.base, 'claude'));
    const options = { platform: 'darwin', tmpdir: () => box.base, uid: UID };
    assert.throws(() => resolveTempRoot('claude', options), /not a symbolic link/);
    assert.deepEqual(fs.readdirSync(real), []);

    const harness = path.join(box.base, 'opencode');
    fs.mkdirSync(harness, { mode: 0o700 });
    fs.symlinkSync(real, path.join(harness, 'sai'));
    assert.throws(() => resolveTempRoot('opencode', options), /not a symbolic link/);
    fs.unlinkSync(path.join(harness, 'sai'));
    fs.writeFileSync(path.join(harness, 'sai'), '');
    assert.throws(() => resolveTempRoot('opencode', options), /not a symbolic link/);
  } finally {
    box.cleanup();
  }
});

test('ownership and shared-write checks block without repairing', () => {
  const stat = (overrides) => ({ isDirectory: () => true, isSymbolicLink: () => false, uid: 1000, mode: 0o40700, ...overrides });
  const make = (harnessStat, saiStat) => ({
    lstatSync(target) { return target.endsWith('sai') ? saiStat : harnessStat; },
    mkdirSync() { throw new Error('must not create'); },
    chmodSync() { throw new Error('must not repair'); },
  });
  const options = { platform: 'linux', uid: 1000 };
  assert.equal(resolveTempRoot('opencode', { ...options, io: make(stat(), stat()) }), OPENCODE_SAI);
  assert.equal(resolveTempRoot('opencode', { ...options, io: make(stat({ uid: 0 }), stat()) }), OPENCODE_SAI);
  assert.throws(() => resolveTempRoot('opencode', { ...options, io: make(stat({ uid: 2000 }), stat()) }), /owned by another user/);
  assert.throws(() => resolveTempRoot('opencode', { ...options, io: make(stat({ mode: 0o40770 }), stat()) }), /without the sticky bit/);
  assert.equal(resolveTempRoot('opencode', { ...options, io: make(stat({ mode: 0o41777 }), stat()) }), OPENCODE_SAI);
  assert.throws(() => resolveTempRoot('opencode', { ...options, io: make(stat(), stat({ uid: 0 })) }), /owned by another user/);
  assert.throws(() => resolveTempRoot('opencode', { ...options, io: make(stat(), stat({ mode: 0o40702 })) }), /without the sticky bit/);
});

test('makeTempDir creates a private child of the SAI temp root', () => {
  const box = sandbox();
  try {
    const options = { platform: process.platform === 'linux' ? 'darwin' : process.platform, tmpdir: () => box.base, uid: UID };
    const first = makeTempDir('claude', 'implement-demo-', options);
    const second = makeTempDir('claude', 'implement-demo-', options);
    assert.notEqual(first, second);
    const root = fs.realpathSync(resolveTempRoot('claude', options));
    assert.equal(path.dirname(first), root);
    assert.match(path.basename(first), /^implement-demo-[A-Za-z0-9]{6}$/);
    if (POSIX) assert.equal(fs.statSync(first).mode & 0o777, 0o700);
    assert.throws(() => makeTempDir('claude', '../escape-', options), error => error.code === 'USAGE');
  } finally {
    box.cleanup();
  }
});

test('removeInside deletes only directories strictly inside the SAI temp root', () => {
  const box = sandbox();
  try {
    const options = { platform: process.platform === 'linux' ? 'darwin' : process.platform, tmpdir: () => box.base, uid: UID };
    const dir = makeTempDir('claude', 'run-', options);
    fs.mkdirSync(path.join(dir, 'reports'));
    fs.writeFileSync(path.join(dir, 'reports', 'a.yaml'), 'x');
    assert.equal(removeInside('claude', dir, options), true);
    assert.equal(fs.existsSync(dir), false);
    assert.equal(removeInside('claude', dir, options), false);

    const root = resolveTempRoot('claude', options);
    const outside = path.join(box.base, 'outside');
    fs.mkdirSync(outside);
    for (const rejected of [root, outside, box.base, path.join(root, '..', 'outside'), 'relative/path']) {
      assert.throws(() => removeInside('claude', rejected, options), error => error.code === 'REJECTED_PATH', rejected);
    }
    assert.ok(fs.existsSync(outside));
    assert.ok(fs.existsSync(root));
    if (POSIX) {
      fs.symlinkSync(outside, path.join(root, 'link'));
      assert.throws(() => removeInside('claude', path.join(root, 'link'), options), error => error.code === 'REJECTED_PATH');
      assert.ok(fs.existsSync(outside));
    }
  } finally {
    box.cleanup();
  }
});

function cli(args, env) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  return { status: result.status, json: JSON.parse(result.stdout) };
}

test('the CLI creates and removes a run directory and reports usage errors', { skip: process.platform === 'linux' }, () => {
  const box = sandbox();
  try {
    const env = { TMPDIR: box.base, TEMP: box.base, TMP: box.base };
    const created = cli(['mkdtemp', '--harness', 'claude', '--prefix', 'implement-demo-'], env);
    assert.equal(created.status, 0);
    assert.equal(created.json.ok, true);
    assert.ok(fs.statSync(created.json.dir).isDirectory());
    assert.equal(cli(['remove', '--harness', 'claude', '--dir', box.base], env).status, 1);
    assert.ok(fs.existsSync(box.base));
    const removed = cli(['remove', '--harness', 'claude', '--dir', created.json.dir], env);
    assert.deepEqual([removed.status, removed.json.removed], [0, true]);
    assert.equal(fs.existsSync(created.json.dir), false);
    assert.equal(cli(['mkdtemp', '--harness', 'vscode'], env).status, 2);
    assert.equal(cli(['bogus', '--harness', 'claude'], env).status, 2);
  } finally {
    box.cleanup();
  }
});
